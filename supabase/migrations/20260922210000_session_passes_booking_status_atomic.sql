-- 이용권(session_passes) + 예약 상태 변경 원자 RPC
-- 예약 완료/no_show ↔ 이용권 차감/복구를 단일 트랜잭션으로 처리.
-- SECURITY DEFINER + is_org_member 게이트 (RLS 우회 금지 패턴은 create_sale과 동일).

BEGIN;

-- ─────────────────────────────────────────────
-- 1. core.session_passes
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS core.session_passes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  customer_name   TEXT NOT NULL DEFAULT '',
  label           TEXT NOT NULL DEFAULT '',
  total_sessions  INTEGER NOT NULL CHECK (total_sessions >= 0),
  used_sessions   INTEGER NOT NULL DEFAULT 0 CHECK (used_sessions >= 0),
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'exhausted', 'cancelled')),
  purchased_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ,
  memo            TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT session_passes_used_lte_total CHECK (used_sessions <= total_sessions)
);

CREATE INDEX IF NOT EXISTS idx_session_passes_org_customer
  ON core.session_passes (organization_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_session_passes_org_status
  ON core.session_passes (organization_id, status);

ALTER TABLE core.session_passes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS session_passes_select_member ON core.session_passes;
CREATE POLICY session_passes_select_member
  ON core.session_passes FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_admin(organization_id));

DROP POLICY IF EXISTS session_passes_insert_member ON core.session_passes;
CREATE POLICY session_passes_insert_member
  ON core.session_passes FOR INSERT TO authenticated
  WITH CHECK (core.is_org_member(organization_id) OR core.is_org_admin(organization_id));

DROP POLICY IF EXISTS session_passes_update_member ON core.session_passes;
CREATE POLICY session_passes_update_member
  ON core.session_passes FOR UPDATE TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_member(organization_id) OR core.is_org_admin(organization_id));

DROP POLICY IF EXISTS session_passes_delete_admin ON core.session_passes;
CREATE POLICY session_passes_delete_admin
  ON core.session_passes FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON core.session_passes TO authenticated;

COMMENT ON TABLE core.session_passes IS
  '횟수제 이용권. 예약 상태 전이(RPC)와 동일 트랜잭션으로 차감/복구.';

-- ─────────────────────────────────────────────
-- 2. RPC: update_booking_status_with_pass
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

  IF NOT core.is_org_member(p_organization_id) AND NOT core.is_org_admin(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- 예약 행 잠금 (동시 요청 직렬화)
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

  -- 멱등: 이미 동일 상태면 추가 차감/복구 없이 현재 스냅샷 반환
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

  -- ── 차감 ───────────────────────────────────
  IF v_deducting AND NOT v_was_deducting AND v_pass_id IS NULL THEN
    IF v_customer_id IS NULL THEN
      -- 고객 없는 예약: 상태만 변경 (이용권 없음)
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
        -- 이용권 없음: 상태만 변경 (프론트와 동일)
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

  -- ── 복구 ───────────────────────────────────
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
    -- pass 행이 없어도 예약 측 sessionPassId는 제거 (멱등 복구)

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
  '예약 상태 변경 + 이용권 차감/복구 원자 처리. 멱등·org 격리·FOR UPDATE.';

REVOKE ALL ON FUNCTION core.update_booking_status_with_pass(UUID, UUID, core.schedule_status, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.update_booking_status_with_pass(UUID, UUID, core.schedule_status, BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION core.update_booking_status_with_pass(UUID, UUID, core.schedule_status, BOOLEAN) TO authenticated;

COMMIT;
