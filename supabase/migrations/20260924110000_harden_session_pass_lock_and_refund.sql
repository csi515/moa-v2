-- 이용권 차감: 후보 SELECT + lock을 한 쿼리로 합치고 lock 후 재검증.
-- 복구: cancelled/미존재 시 예약 상태를 바꾸지 않는다.
-- 기존 전이 의미(completed/no_show consumeOnNoShow, 멱등) 유지.

BEGIN;

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
  v_pass_consumable BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_organization_id IS NULL OR p_booking_id IS NULL OR p_new_status IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;

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

      -- 후보 선택과 lock을 동일 쿼리에서 수행 (READ COMMITTED 재평가)
      SELECT *
        INTO v_pass
      FROM core.session_passes sp
      WHERE sp.organization_id = p_organization_id
        AND sp.customer_id = v_customer_id
        AND sp.status = 'active'
        AND sp.used_sessions < sp.total_sessions
        AND (sp.expires_at IS NULL OR sp.expires_at >= now())
      ORDER BY sp.expires_at ASC NULLS LAST,
               (sp.total_sessions - sp.used_sessions) ASC,
               sp.purchased_at ASC
      LIMIT 1
      FOR UPDATE;

      v_pass_consumable :=
        FOUND
        AND v_pass.status = 'active'
        AND v_pass.used_sessions < v_pass.total_sessions
        AND (v_pass.expires_at IS NULL OR v_pass.expires_at >= now());

      IF NOT v_pass_consumable THEN
        IF v_has_entitlement THEN
          RAISE EXCEPTION 'Insufficient session pass';
        END IF;
        v_action := 'none';
      ELSE
        UPDATE core.session_passes
        SET
          used_sessions = v_pass.used_sessions + 1,
          status = CASE
            WHEN v_pass.used_sessions + 1 >= v_pass.total_sessions THEN 'exhausted'
            ELSE 'active'
          END,
          updated_at = now()
        WHERE id = v_pass.id
          AND status = 'active'
          AND used_sessions < total_sessions
          AND (expires_at IS NULL OR expires_at >= now());

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Insufficient session pass';
        END IF;

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

    IF NOT FOUND OR v_pass.status = 'cancelled' THEN
      RAISE EXCEPTION 'Session pass refund failed';
    END IF;

    UPDATE core.session_passes
    SET
      used_sessions = GREATEST(0, v_pass.used_sessions - 1),
      status = CASE
        WHEN GREATEST(0, v_pass.used_sessions - 1) >= v_pass.total_sessions THEN 'exhausted'
        ELSE 'active'
      END,
      updated_at = now()
    WHERE id = v_pass.id
      AND status <> 'cancelled';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Session pass refund failed';
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
  '예약 상태 변경 + 이용권 차감/복구. lock 후 사용가능 재검증. cancelled refund는 예약 미변경.';

REVOKE ALL ON FUNCTION core.update_booking_status_with_pass(UUID, UUID, core.schedule_status, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.update_booking_status_with_pass(UUID, UUID, core.schedule_status, BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION core.update_booking_status_with_pass(UUID, UUID, core.schedule_status, BOOLEAN) TO authenticated;

COMMIT;
