-- 연습실 타임슬롯 예약: 트랜잭션 가드 (room FOR UPDATE + 명시적 overlap 검사)
-- EXCLUDE 제약과 이중으로 동일 시간대 중복을 막는다.

CREATE OR REPLACE FUNCTION core.book_room_reservation_guarded(
  p_org_id UUID,
  p_room_id UUID,
  p_customer_id UUID,
  p_requested_by UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_status core.room_reservation_status,
  p_memo TEXT DEFAULT NULL,
  p_reviewed_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_id UUID;
  v_room core.practice_rooms%ROWTYPE;
BEGIN
  IF p_requested_by IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- 동일 room 직렬화: 동시 INSERT 레이스 축소
  SELECT * INTO v_room
  FROM core.practice_rooms
  WHERE id = p_room_id
    AND organization_id = p_org_id
    AND is_active
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid practice room';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM core.customers c
    WHERE c.id = p_customer_id
      AND c.organization_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'Customer not found in organization';
  END IF;

  PERFORM core.assert_room_slot_allowed(p_room_id, p_starts_at, p_ends_at);

  IF EXISTS (
    SELECT 1
    FROM core.room_reservations rr
    WHERE rr.room_id = p_room_id
      AND rr.status IN ('pending', 'approved')
      AND tstzrange(rr.starts_at, rr.ends_at, '[)')
          && tstzrange(p_starts_at, p_ends_at, '[)')
  ) THEN
    RAISE EXCEPTION 'Time slot already reserved';
  END IF;

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
    p_requested_by,
    p_starts_at,
    p_ends_at,
    p_status,
    NULLIF(trim(COALESCE(p_memo, '')), ''),
    CASE WHEN p_status = 'approved' THEN COALESCE(p_reviewed_by, p_requested_by) ELSE NULL END,
    CASE WHEN p_status = 'approved' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Time slot already reserved';
END;
$$;

COMMENT ON FUNCTION core.book_room_reservation_guarded IS
  '연습실 예약 트랜잭션 코어: room FOR UPDATE + overlap 검사 + EXCLUDE 폴백';

-- 고객 신청 → guarded
CREATE OR REPLACE FUNCTION core.request_room_reservation(
  p_org_id UUID,
  p_room_id UUID,
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
  v_customer_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT core.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  v_customer_id := core.get_my_student_customer_id(p_org_id);
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'No linked student customer for this organization';
  END IF;

  RETURN core.book_room_reservation_guarded(
    p_org_id,
    p_room_id,
    v_customer_id,
    auth.uid(),
    p_starts_at,
    p_ends_at,
    'pending'::core.room_reservation_status,
    p_memo,
    NULL
  );
END;
$$;

-- 스태프 즉시 예약 → guarded
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT core.is_org_staff_actor(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN core.book_room_reservation_guarded(
    p_org_id,
    p_room_id,
    p_customer_id,
    auth.uid(),
    p_starts_at,
    p_ends_at,
    'approved'::core.room_reservation_status,
    p_memo,
    auth.uid()
  );
END;
$$;

-- 승인 시에도 동일 room 잠금 + overlap 재검사
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
    PERFORM 1 FROM core.practice_rooms
    WHERE id = v_row.room_id
    FOR UPDATE;

    PERFORM core.assert_room_slot_allowed(v_row.room_id, v_row.starts_at, v_row.ends_at);

    IF EXISTS (
      SELECT 1
      FROM core.room_reservations rr
      WHERE rr.room_id = v_row.room_id
        AND rr.id <> v_row.id
        AND rr.status IN ('pending', 'approved')
        AND tstzrange(rr.starts_at, rr.ends_at, '[)')
            && tstzrange(v_row.starts_at, v_row.ends_at, '[)')
    ) THEN
      RAISE EXCEPTION 'Time slot conflicts with another reservation';
    END IF;
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

-- book_room_reservation_guarded 는 request/create_staff 내부 전용 (직접 GRANT 없음)
