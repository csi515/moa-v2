-- Multi-tenant 보안 하드닝:
-- is_org_member(고객/학부모/멤버 포함)로 조직 전체 행을 읽거나 쓰던 정책을
-- is_org_staff_actor + 본인/자녀 스코프(is_my_customer / parent_owns_student)로 축소.
-- 데이터 삭제·테이블 재작성 없음. 기존 admin FOR ALL / staff INSERT 정책은 유지.

BEGIN;

-- ─────────────────────────────────────────────
-- 1. session_passes: 스태프 전체 + 본인/자녀 SELECT만
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS session_passes_select_member ON core.session_passes;
CREATE POLICY session_passes_select_scoped
  ON core.session_passes
  FOR SELECT TO authenticated
  USING (
    core.is_org_staff_actor(organization_id)
    OR core.is_my_customer(organization_id, customer_id)
    OR core.parent_owns_student(organization_id, customer_id)
  );

DROP POLICY IF EXISTS session_passes_insert_member ON core.session_passes;
CREATE POLICY session_passes_insert_staff
  ON core.session_passes
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_staff_actor(organization_id));

DROP POLICY IF EXISTS session_passes_update_member ON core.session_passes;
CREATE POLICY session_passes_update_staff
  ON core.session_passes
  FOR UPDATE TO authenticated
  USING (core.is_org_staff_actor(organization_id))
  WITH CHECK (core.is_org_staff_actor(organization_id));

-- DELETE 정책(session_passes_delete_admin)은 is_org_admin 유지

COMMENT ON POLICY session_passes_select_scoped ON core.session_passes IS
  '스태프(actor) 전체 조회, 고객 본인·학부모 연계 자녀만 SELECT. is_org_member 전면 조회 제거.';
COMMENT ON POLICY session_passes_insert_staff ON core.session_passes IS
  '이용권 INSERT는 is_org_staff_actor만.';
COMMENT ON POLICY session_passes_update_staff ON core.session_passes IS
  '이용권 UPDATE는 is_org_staff_actor만 (고객 직접 차감 금지).';

-- ─────────────────────────────────────────────
-- 2. update_booking_status_with_pass: staff_actor 게이트
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION core.update_booking_status_with_pass(
  p_organization_id UUID,
  p_booking_id UUID,
  p_new_status core.schedule_status,
  p_consume_on_no_show BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_booking core.schedules%ROWTYPE;
  v_pass core.session_passes%ROWTYPE;
  v_meta JSONB;
  v_pass_id UUID;
  v_pass_id_text TEXT;
  v_old_status core.schedule_status;
  v_deducting BOOLEAN;
  v_was_deducting BOOLEAN;
  v_action TEXT := 'none';
  v_has_entitlement BOOLEAN;
  v_customer_id UUID;
  v_pick_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_organization_id IS NULL OR p_booking_id IS NULL OR p_new_status IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;

  -- 고객/학부모 멤버십만으로는 호출 불가 (create_sale과 동일 계약)
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT *
    INTO v_booking
  FROM core.schedules s
  WHERE s.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;

  v_old_status := v_booking.status;
  v_meta := COALESCE(v_booking.metadata, '{}'::jsonb);
  v_customer_id := v_booking.customer_id;

  v_pass_id_text := NULLIF(btrim(COALESCE(v_meta->>'sessionPassId', '')), '');
  IF v_pass_id_text IS NOT NULL THEN
    BEGIN
      v_pass_id := v_pass_id_text::UUID;
    EXCEPTION
      WHEN invalid_text_representation THEN
        v_pass_id := NULL;
    END;
  ELSE
    v_pass_id := NULL;
  END IF;

  IF v_old_status = p_new_status THEN
    RETURN jsonb_build_object(
      'action', 'idempotent',
      'booking_id', v_booking.id,
      'status', v_booking.status,
      'session_pass_id', to_jsonb(v_pass_id),
      'metadata', v_meta
    );
  END IF;

  IF v_customer_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM core.customers c
      WHERE c.id = v_customer_id
        AND c.organization_id = p_organization_id
    ) THEN
      RAISE EXCEPTION 'Customer not found in organization';
    END IF;
  END IF;

  v_deducting :=
    (p_new_status = 'completed')
    OR (p_consume_on_no_show IS TRUE AND p_new_status = 'no_show');

  v_was_deducting :=
    (v_old_status = 'completed')
    OR (v_old_status = 'no_show' AND v_pass_id IS NOT NULL);

  IF v_deducting AND NOT v_was_deducting AND v_pass_id IS NULL THEN
    IF v_customer_id IS NULL THEN
      v_action := 'none';
    ELSE
      SELECT EXISTS (
        SELECT 1
        FROM core.session_passes sp
        WHERE sp.organization_id = p_organization_id
          AND sp.customer_id = v_customer_id
          AND sp.status <> 'cancelled'
      ) INTO v_has_entitlement;

      SELECT sp.id INTO v_pick_id
      FROM core.session_passes sp
      WHERE sp.organization_id = p_organization_id
        AND sp.customer_id = v_customer_id
        AND sp.status = 'active'
        AND sp.used_sessions < sp.total_sessions
        AND (sp.expires_at IS NULL OR sp.expires_at >= now())
      ORDER BY sp.expires_at ASC NULLS LAST,
               (sp.total_sessions - sp.used_sessions) ASC,
               sp.purchased_at ASC
      LIMIT 1;

      IF v_pick_id IS NULL THEN
        IF v_has_entitlement THEN
          RAISE EXCEPTION 'Insufficient session pass';
        END IF;
        v_action := 'none';
      ELSE
        SELECT *
          INTO v_pass
        FROM core.session_passes sp
        WHERE sp.id = v_pick_id
        FOR UPDATE;

        UPDATE core.session_passes
        SET
          used_sessions = v_pass.used_sessions + 1,
          status = CASE
            WHEN v_pass.used_sessions + 1 >= v_pass.total_sessions THEN 'exhausted'
            ELSE 'active'
          END,
          updated_at = now()
        WHERE id = v_pass.id;

        v_pass_id := v_pass.id;
        v_meta := jsonb_set(v_meta, '{sessionPassId}', to_jsonb(v_pass_id::text), true);
        v_action := 'consume';
      END IF;
    END IF;

  ELSIF v_was_deducting AND NOT v_deducting AND v_pass_id IS NOT NULL THEN
    SELECT *
      INTO v_pass
    FROM core.session_passes sp
    WHERE sp.id = v_pass_id
      AND sp.organization_id = p_organization_id
    FOR UPDATE;

    IF FOUND AND v_pass.status <> 'cancelled' THEN
      UPDATE core.session_passes
      SET
        used_sessions = GREATEST(0, v_pass.used_sessions - 1),
        status = CASE
          WHEN GREATEST(0, v_pass.used_sessions - 1) >= v_pass.total_sessions THEN 'exhausted'
          ELSE 'active'
        END,
        updated_at = now()
      WHERE id = v_pass.id;
    END IF;

    v_meta := v_meta - 'sessionPassId';
    v_pass_id := NULL;
    v_action := 'refund';

  ELSE
    v_action := 'keep';
  END IF;

  UPDATE core.schedules
  SET
    status = p_new_status,
    metadata = v_meta,
    updated_at = now()
  WHERE id = v_booking.id
    AND organization_id = p_organization_id;

  RETURN jsonb_build_object(
    'action', v_action,
    'booking_id', p_booking_id,
    'status', p_new_status,
    'session_pass_id', to_jsonb(v_pass_id),
    'metadata', v_meta
  );
END;
$$;

COMMENT ON FUNCTION core.update_booking_status_with_pass(UUID, UUID, core.schedule_status, BOOLEAN) IS
  '예약 상태 변경 + 이용권 차감/복구. is_org_staff_actor만 호출 가능. org 격리·FOR UPDATE.';

-- ─────────────────────────────────────────────
-- 3. Retail SELECT: inventory/stock staff_actor
--    sales/returns: staff_actor OR 본인 고객
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS core_inventory_select ON core.inventory;
CREATE POLICY core_inventory_select
  ON core.inventory
  FOR SELECT TO authenticated
  USING (core.is_org_staff_actor(organization_id));

DROP POLICY IF EXISTS core_stock_movements_select ON core.stock_movements;
CREATE POLICY core_stock_movements_select
  ON core.stock_movements
  FOR SELECT TO authenticated
  USING (core.is_org_staff_actor(organization_id));

DROP POLICY IF EXISTS core_sales_select ON core.sales;
CREATE POLICY core_sales_select
  ON core.sales
  FOR SELECT TO authenticated
  USING (
    core.is_org_staff_actor(organization_id)
    OR (
      customer_id IS NOT NULL
      AND (
        core.is_my_customer(organization_id, customer_id)
        OR core.parent_owns_student(organization_id, customer_id)
      )
    )
  );

DROP POLICY IF EXISTS core_sale_items_select ON core.sale_items;
CREATE POLICY core_sale_items_select
  ON core.sale_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM core.sales s
      WHERE s.id = sale_id
        AND (
          core.is_org_staff_actor(s.organization_id)
          OR (
            s.customer_id IS NOT NULL
            AND (
              core.is_my_customer(s.organization_id, s.customer_id)
              OR core.parent_owns_student(s.organization_id, s.customer_id)
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS core_sale_returns_select ON core.sale_returns;
CREATE POLICY core_sale_returns_select
  ON core.sale_returns
  FOR SELECT TO authenticated
  USING (
    core.is_org_staff_actor(organization_id)
    OR EXISTS (
      SELECT 1
      FROM core.sales s
      WHERE s.id = sale_id
        AND s.organization_id = organization_id
        AND s.customer_id IS NOT NULL
        AND (
          core.is_my_customer(s.organization_id, s.customer_id)
          OR core.parent_owns_student(s.organization_id, s.customer_id)
        )
    )
  );

DROP POLICY IF EXISTS core_sale_return_items_select ON core.sale_return_items;
CREATE POLICY core_sale_return_items_select
  ON core.sale_return_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM core.sale_returns r
      JOIN core.sales s ON s.id = r.sale_id
      WHERE r.id = sale_return_id
        AND (
          core.is_org_staff_actor(r.organization_id)
          OR (
            s.customer_id IS NOT NULL
            AND (
              core.is_my_customer(s.organization_id, s.customer_id)
              OR core.parent_owns_student(s.organization_id, s.customer_id)
            )
          )
        )
    )
  );

-- products/product_variants SELECT는 카탈로그 조회용 is_org_member 유지 (PII/재무 없음)

COMMENT ON POLICY core_inventory_select ON core.inventory IS
  '재고 SELECT는 is_org_staff_actor만. 고객 멤버십 전체 조회 제거.';
COMMENT ON POLICY core_sales_select ON core.sales IS
  '판매 SELECT: 스태프 전체 또는 본인/자녀 고객 행만.';

-- ─────────────────────────────────────────────
-- 4. Enrollment / parent-link SELECT: 교차 가정 누출 차단
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS student_enrollments_parent_select ON core.student_enrollments;
CREATE POLICY student_enrollments_select_scoped
  ON core.student_enrollments
  FOR SELECT TO authenticated
  USING (
    core.is_org_staff_actor(organization_id)
    OR EXISTS (
      SELECT 1
      FROM core.parent_student_guardians psg
      WHERE psg.student_id = student_enrollments.student_id
        AND psg.parent_id = core.get_my_parent_id()
    )
  );
-- student_enrollments_select_self (is_student_owner) 병존 유지

DROP POLICY IF EXISTS parent_student_links_select ON core.parent_student_links;
CREATE POLICY parent_student_links_select
  ON core.parent_student_links
  FOR SELECT TO authenticated
  USING (core.is_org_staff_actor(organization_id));

DROP POLICY IF EXISTS parent_student_links_parent_select ON core.parent_student_links;
CREATE POLICY parent_student_links_parent_select
  ON core.parent_student_links
  FOR SELECT TO authenticated
  USING (
    parent_customer_id = core.get_my_parent_customer_id(organization_id)
    OR core.is_org_admin(organization_id)
  );

DROP POLICY IF EXISTS org_parent_profiles_select ON core.org_parent_profiles;
CREATE POLICY org_parent_profiles_select
  ON core.org_parent_profiles
  FOR SELECT TO authenticated
  USING (
    parent_id = core.get_my_parent_id()
    OR core.is_org_staff_actor(organization_id)
  );

DROP POLICY IF EXISTS parent_student_guardians_select ON core.parent_student_guardians;
CREATE POLICY parent_student_guardians_select
  ON core.parent_student_guardians
  FOR SELECT TO authenticated
  USING (
    parent_id = core.get_my_parent_id()
    OR core.is_org_staff_actor(
      (SELECT organization_id FROM core.org_parent_profiles opp
       WHERE opp.parent_id = parent_student_guardians.parent_id
       LIMIT 1)
    )
  );

COMMENT ON POLICY student_enrollments_select_scoped ON core.student_enrollments IS
  '등록 SELECT: 스태프 또는 본인 가디언. is_org_member 전면 조회 제거.';
COMMENT ON POLICY parent_student_links_select ON core.parent_student_links IS
  '레거시 링크 SELECT: 스태프만. 학부모는 parent_select로 본인 링크만.';

COMMIT;
