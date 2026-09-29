-- 부모 전용 예약 취소. staff RPC(update_booking_status_with_pass)는 그대로 staff-only.
-- 자기 자녀(customer)의 신청 예약만, 취소 가능 시간 안에서, 이용권 복구는 같은 TX.

BEGIN;

CREATE OR REPLACE FUNCTION core.cancel_booking_as_parent(
  p_organization_id UUID,
  p_booking_id UUID
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
  v_was_deducting BOOLEAN;
  v_action TEXT := 'none';
  v_requested_by TEXT;
  v_customer_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_organization_id IS NULL OR p_booking_id IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
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
  v_requested_by := NULLIF(btrim(COALESCE(v_meta->>'requestedBy', '')), '');

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

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM core.customers c
    WHERE c.id = v_customer_id
      AND c.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Customer not found in organization';
  END IF;

  -- guardian+enrollment 또는 parent_student_links. staff 권한으로 우회하지 않음.
  IF NOT core.parent_owns_customer(p_organization_id, v_customer_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- 이미 취소됨: 이용권 재복구 없이 멱등
  IF v_old_status = 'cancelled' THEN
    RETURN jsonb_build_object(
      'action', 'idempotent',
      'booking_id', v_booking.id,
      'status', v_booking.status,
      'session_pass_id', to_jsonb(v_pass_id),
      'metadata', v_meta
    );
  END IF;

  IF v_old_status IS DISTINCT FROM 'scheduled' THEN
    RAISE EXCEPTION 'Booking not cancellable';
  END IF;

  IF v_requested_by IS DISTINCT FROM 'customer' THEN
    RAISE EXCEPTION 'Not a customer-requested booking';
  END IF;

  IF v_booking.starts_at < now() THEN
    RAISE EXCEPTION 'Cancellation window expired';
  END IF;

  v_was_deducting :=
    (v_old_status = 'completed')
    OR (v_old_status = 'no_show' AND v_pass_id IS NOT NULL);

  -- scheduled 취소는 보통 차감 전. 차감 구간이면 같은 TX에서 1회 복구.
  IF v_was_deducting AND v_pass_id IS NOT NULL THEN
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
  END IF;

  UPDATE core.schedules
  SET
    status = 'cancelled',
    metadata = v_meta,
    updated_at = now()
  WHERE id = v_booking.id
    AND organization_id = p_organization_id
    AND status = v_old_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not cancellable';
  END IF;

  RETURN jsonb_build_object(
    'action', v_action,
    'booking_id', p_booking_id,
    'status', 'cancelled',
    'session_pass_id', to_jsonb(v_pass_id),
    'metadata', v_meta
  );
END;
$$;

COMMENT ON FUNCTION core.cancel_booking_as_parent(UUID, UUID) IS
  '부모 전용 예약 취소. parent_owns_customer + 신청 예약 + 시작 전. staff RPC와 분리. 멱등·FOR UPDATE.';

REVOKE ALL ON FUNCTION core.cancel_booking_as_parent(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.cancel_booking_as_parent(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION core.cancel_booking_as_parent(UUID, UUID) TO authenticated;

COMMIT;
