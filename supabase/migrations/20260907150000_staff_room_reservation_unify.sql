-- Staff create + cancel room reservations on canonical room_reservations
-- Unifies staff UI with customer request flow (no schedules metadata dual-write)

CREATE OR REPLACE FUNCTION core.is_org_staff_actor(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.organization_members m
    WHERE m.organization_id = p_org_id
      AND m.user_id = auth.uid()
      AND m.is_active = true
      AND m.role::text IN (
        'owner', 'admin', 'manager', 'staff', 'instructor'
      )
  );
$$;

COMMENT ON FUNCTION core.is_org_staff_actor(UUID) IS
  '사업주·관리자·강사 등 스태프 역할 여부 (학부모/고객 제외)';

-- 스태프가 원생 대신 즉시 승인(approved) 예약 생성
CREATE OR REPLACE FUNCTION core.create_staff_room_reservation(
  p_org_id UUID,
  p_room_id UUID,
  p_customer_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_memo TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT core.is_org_staff_actor(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM core.customers c
    WHERE c.id = p_customer_id
      AND c.organization_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'Customer not found in organization';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM core.practice_rooms r
    WHERE r.id = p_room_id
      AND r.organization_id = p_org_id
      AND r.is_active
  ) THEN
    RAISE EXCEPTION 'Invalid practice room';
  END IF;

  PERFORM core.assert_room_slot_allowed(p_room_id, p_starts_at, p_ends_at);

  INSERT INTO core.room_reservations (
    organization_id,
    room_id,
    customer_id,
    requested_by,
    starts_at,
    ends_at,
    status,
    memo,
    reviewed_by,
    reviewed_at
  ) VALUES (
    p_org_id,
    p_room_id,
    p_customer_id,
    auth.uid(),
    p_starts_at,
    p_ends_at,
    'approved',
    NULLIF(trim(COALESCE(p_memo, '')), ''),
    auth.uid(),
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Time slot already reserved';
END;
$$;

COMMENT ON FUNCTION core.create_staff_room_reservation IS
  '스태프 즉시 연습실 예약(approved). EXCLUDE로 고객 pending/approved와 충돌 차단.';

-- 스태프 취소 권한을 강사까지 확대 (기존 admin만 → staff actor)
CREATE OR REPLACE FUNCTION core.cancel_my_room_reservation(p_reservation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_row core.room_reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM core.room_reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  IF v_row.requested_by <> auth.uid()
     AND NOT core.is_org_staff_actor(v_row.organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF v_row.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Reservation cannot be cancelled';
  END IF;

  UPDATE core.room_reservations
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_reservation_id;

  RETURN true;
END;
$$;

-- 승인/거절도 스태프 액터 허용
CREATE OR REPLACE FUNCTION core.review_room_reservation(
  p_reservation_id UUID,
  p_approve BOOLEAN,
  p_memo TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_row core.room_reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM core.room_reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  IF NOT core.is_org_staff_actor(v_row.organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending reservations can be reviewed';
  END IF;

  IF p_approve THEN
    PERFORM core.assert_room_slot_allowed(v_row.room_id, v_row.starts_at, v_row.ends_at);
  END IF;

  UPDATE core.room_reservations
  SET
    status = CASE WHEN p_approve THEN 'approved'::core.room_reservation_status
                  ELSE 'rejected'::core.room_reservation_status END,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    memo = COALESCE(NULLIF(trim(COALESCE(p_memo, '')), ''), memo),
    updated_at = now()
  WHERE id = p_reservation_id;

  RETURN true;
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Time slot conflicts with another reservation';
END;
$$;

GRANT EXECUTE ON FUNCTION core.is_org_staff_actor(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.create_staff_room_reservation(UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;

-- 학부모: 연동 자녀 예약 조회
DROP POLICY IF EXISTS room_reservations_select ON core.room_reservations;
CREATE POLICY room_reservations_select ON core.room_reservations
  FOR SELECT TO authenticated
  USING (
    core.is_org_owner_or_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, true)
    OR requested_by = auth.uid()
    OR core.is_my_customer(organization_id, customer_id)
    OR core.parent_owns_student(organization_id, customer_id)
  );
