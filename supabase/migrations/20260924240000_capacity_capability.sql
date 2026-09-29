-- 공통 Capacity Capability.
-- 기존 max_capacity / reservation count / FOR UPDATE 계약을 유지한다.
-- 업종 전용 테이블을 만들지 않는다. EXCLUDE를 느슨하게 만들지 않는다.

CREATE OR REPLACE FUNCTION core.normalize_capacity(p_capacity INT)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(1, COALESCE(p_capacity, 1));
$$;

CREATE OR REPLACE FUNCTION core.capacity_available(p_capacity INT, p_booked INT)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(0, core.normalize_capacity(p_capacity) - GREATEST(0, COALESCE(p_booked, 0)));
$$;

CREATE OR REPLACE FUNCTION core.capacity_snapshot(p_capacity INT, p_booked INT)
RETURNS TABLE (
  capacity INT,
  booked INT,
  available INT,
  is_full BOOLEAN
)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    core.normalize_capacity(p_capacity),
    GREATEST(0, COALESCE(p_booked, 0)),
    core.capacity_available(p_capacity, p_booked),
    core.capacity_available(p_capacity, p_booked) <= 0;
$$;

CREATE OR REPLACE FUNCTION core.assert_not_overbooked(
  p_capacity INT,
  p_booked INT,
  p_message TEXT DEFAULT 'Schedule is fully booked'
)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF core.capacity_available(p_capacity, p_booked) <= 0 THEN
    RAISE EXCEPTION '%', p_message;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION core.count_schedule_holding(
  p_schedule_id UUID,
  p_include_requested BOOLEAN DEFAULT true
)
RETURNS INT
LANGUAGE sql
STABLE
SET search_path = core, public
AS $$
  SELECT COUNT(*)::INT
  FROM core.reservations
  WHERE schedule_id = p_schedule_id
    AND (
      status = 'confirmed'
      OR (p_include_requested AND status = 'requested')
    );
$$;

CREATE OR REPLACE FUNCTION core.count_resource_occupancy(
  p_resource_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ
)
RETURNS INT
LANGUAGE sql
STABLE
SET search_path = core, public
AS $$
  SELECT COUNT(*)::INT
  FROM core.room_reservations rr
  WHERE rr.room_id = p_resource_id
    AND rr.status IN ('pending', 'approved')
    AND tstzrange(rr.starts_at, rr.ends_at, '[)')
        && tstzrange(p_starts_at, p_ends_at, '[)');
$$;

COMMENT ON FUNCTION core.normalize_capacity(INT) IS
  'max_capacity 호환. 1 미만은 1.';
COMMENT ON FUNCTION core.capacity_available(INT, INT) IS
  'available = max(0, capacity - booked).';
COMMENT ON FUNCTION core.capacity_snapshot(INT, INT) IS
  'capacity / booked / available / is_full.';
COMMENT ON FUNCTION core.assert_not_overbooked(INT, INT, TEXT) IS
  '동시 예약 초과 수용 방지. 호출측에서 FOR UPDATE 후 사용.';
COMMENT ON FUNCTION core.count_schedule_holding(UUID, BOOLEAN) IS
  'requested+confirmed 또는 confirmed만. 취소는 복구.';
COMMENT ON FUNCTION core.count_resource_occupancy(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS
  '자원 구간 점유. EXCLUDE와 같은 [) 차단 상태만 센다.';

REVOKE ALL ON FUNCTION core.normalize_capacity(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.capacity_available(INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.capacity_snapshot(INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.assert_not_overbooked(INT, INT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.count_schedule_holding(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.count_resource_occupancy(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION core.normalize_capacity(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.capacity_available(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.capacity_snapshot(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.assert_not_overbooked(INT, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.count_schedule_holding(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION core.count_resource_occupancy(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ---------------------------------------------------------------------------
-- request_reservation: 기존 계약 유지, 정원 판정만 공통 함수로
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.request_reservation(
  p_schedule_id UUID,
  p_applicant_name TEXT,
  p_applicant_phone TEXT DEFAULT NULL,
  p_applicant_email TEXT DEFAULT NULL,
  p_request_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_org_id UUID;
  v_schedule RECORD;
  v_confirmed_count INT;
  v_customer_id UUID;
  v_reservation_id UUID;
  v_user_id UUID;
  v_phone TEXT := NULLIF(regexp_replace(COALESCE(p_applicant_phone, ''), '[^0-9]', '', 'g'), '');
  v_name TEXT := trim(COALESCE(p_applicant_name, ''));
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_name = '' THEN
    RAISE EXCEPTION 'Applicant name is required';
  END IF;

  SELECT
    s.organization_id,
    s.is_bookable,
    s.max_capacity,
    s.starts_at,
    o.is_active
  INTO v_schedule
  FROM core.schedules s
  INNER JOIN core.organizations o ON o.id = s.organization_id
  WHERE s.id = p_schedule_id
  FOR UPDATE OF s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule not found';
  END IF;

  IF NOT v_schedule.is_active THEN
    RAISE EXCEPTION 'Organization is not active';
  END IF;

  IF NOT v_schedule.is_bookable THEN
    RAISE EXCEPTION 'This schedule is not bookable';
  END IF;

  IF v_schedule.starts_at < now() THEN
    RAISE EXCEPTION 'Cannot book past schedules';
  END IF;

  v_org_id := v_schedule.organization_id;

  v_confirmed_count := core.count_schedule_holding(p_schedule_id, true);
  PERFORM core.assert_not_overbooked(v_schedule.max_capacity, v_confirmed_count);

  IF EXISTS (
    SELECT 1 FROM core.reservations
    WHERE schedule_id = p_schedule_id
      AND user_id = v_user_id
      AND status IN ('requested', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'You already have a reservation for this schedule';
  END IF;

  SELECT id INTO v_customer_id
  FROM core.customers
  WHERE organization_id = v_org_id
    AND user_id = v_user_id
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_customer_id IS NULL AND v_phone IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM core.customers
    WHERE organization_id = v_org_id
      AND user_id IS NULL
      AND regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = v_phone
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;

    IF v_customer_id IS NOT NULL THEN
      PERFORM core.link_customer_to_current_user(v_customer_id, v_phone);
    END IF;
  END IF;

  IF v_customer_id IS NULL THEN
    INSERT INTO core.customers (
      organization_id,
      name,
      phone,
      email,
      status,
      user_id,
      metadata
    ) VALUES (
      v_org_id,
      v_name,
      v_phone,
      COALESCE(NULLIF(lower(trim(COALESCE(p_applicant_email, ''))), ''), ''),
      'active',
      v_user_id,
      jsonb_build_object('source', 'reservation', 'guest', false)
    )
    RETURNING id INTO v_customer_id;
  END IF;

  INSERT INTO core.reservations (
    organization_id,
    schedule_id,
    customer_id,
    user_id,
    applicant_name,
    applicant_phone,
    applicant_email,
    request_message,
    status
  ) VALUES (
    v_org_id,
    p_schedule_id,
    v_customer_id,
    v_user_id,
    v_name,
    p_applicant_phone,
    p_applicant_email,
    p_request_message,
    'requested'
  )
  RETURNING id INTO v_reservation_id;

  RETURN v_reservation_id;
END;
$$;

COMMENT ON FUNCTION core.request_reservation IS
  '예약 신청. FOR UPDATE 후 공통 Capacity로 초과 수용을 막는다.';

-- ---------------------------------------------------------------------------
-- confirm_reservation: schedule 행 잠금 + 공통 Capacity
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.confirm_reservation(
  p_reservation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_reservation RECORD;
  v_schedule RECORD;
  v_confirmed_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_reservation
  FROM core.reservations
  WHERE id = p_reservation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  IF NOT core.is_org_owner_or_admin(v_reservation.organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF v_reservation.status != 'requested' THEN
    RAISE EXCEPTION 'Reservation is not in requested status';
  END IF;

  SELECT s.max_capacity
  INTO v_schedule
  FROM core.schedules s
  WHERE s.id = v_reservation.schedule_id
  FOR UPDATE OF s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule not found';
  END IF;

  v_confirmed_count := core.count_schedule_holding(v_reservation.schedule_id, false);
  PERFORM core.assert_not_overbooked(v_schedule.max_capacity, v_confirmed_count);

  UPDATE core.reservations
  SET status = 'confirmed',
      confirmed_by = auth.uid(),
      confirmed_at = now(),
      updated_at = now()
  WHERE id = p_reservation_id;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION core.confirm_reservation IS
  '예약 확정. schedule FOR UPDATE 후 confirmed만 세어 초과 수용을 막는다.';

-- ---------------------------------------------------------------------------
-- list_bookable_schedules: 표시용 available은 confirmed 기준 유지
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.list_bookable_schedules(
  p_org_id UUID,
  p_from_date TIMESTAMPTZ DEFAULT now(),
  p_to_date TIMESTAMPTZ DEFAULT now() + interval '30 days',
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  max_capacity INT,
  confirmed_count BIGINT,
  available_slots INT,
  service_id UUID,
  service_name TEXT,
  staff_id UUID,
  staff_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT
    s.id,
    s.title,
    s.description,
    s.starts_at,
    s.ends_at,
    s.max_capacity,
    COALESCE(COUNT(r.id) FILTER (WHERE r.status = 'confirmed'), 0) AS confirmed_count,
    core.capacity_available(
      s.max_capacity,
      COALESCE(COUNT(r.id) FILTER (WHERE r.status = 'confirmed'), 0)::INT
    ) AS available_slots,
    s.service_id,
    srv.name AS service_name,
    s.staff_id,
    st.name AS staff_name
  FROM core.schedules s
  LEFT JOIN core.reservations r ON r.schedule_id = s.id AND r.status = 'confirmed'
  LEFT JOIN core.services srv ON srv.id = s.service_id
  LEFT JOIN core.staff st ON st.id = s.staff_id
  WHERE s.organization_id = p_org_id
    AND s.is_bookable = true
    AND s.starts_at >= p_from_date
    AND s.starts_at <= p_to_date
    AND EXISTS (SELECT 1 FROM core.organizations o WHERE o.id = s.organization_id AND o.is_active = true)
  GROUP BY s.id, srv.name, st.name
  HAVING core.capacity_available(
    s.max_capacity,
    COALESCE(COUNT(r.id) FILTER (WHERE r.status = 'confirmed'), 0)::INT
  ) > 0
  ORDER BY s.starts_at
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION core.list_bookable_schedules IS
  '예약 가능한 일정 목록. available_slots는 max_capacity - confirmed.';
