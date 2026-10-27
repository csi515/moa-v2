-- 사내 직원 공용자원 예약: customer_id nullable, member RPC, 본인/총무 취소, org member 조회

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. room_reservations.customer_id → nullable (학원 행은 유지, 사내 예약은 NULL)
-- ---------------------------------------------------------------------------
ALTER TABLE core.room_reservations
  ALTER COLUMN customer_id DROP NOT NULL;

COMMENT ON COLUMN core.room_reservations.customer_id IS
  '학원·고객 예약 시 customers.id. 사내 직원 예약(request_member_room_reservation)은 NULL.';

-- ---------------------------------------------------------------------------
-- 2. SELECT: 조직 멤버 전원 예약 현황 조회 (누가 예약했는지 공유)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS room_reservations_select ON core.room_reservations;
CREATE POLICY room_reservations_select ON core.room_reservations
  FOR SELECT TO authenticated
  USING (
    core.is_org_member(organization_id)
    OR core.is_org_owner_or_admin(organization_id)
  );

-- ---------------------------------------------------------------------------
-- 3. book_room_reservation_guarded: customer_id NULL 허용
-- ---------------------------------------------------------------------------
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
  v_resource core.bookable_resources%ROWTYPE;
BEGIN
  IF p_requested_by IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_resource
  FROM core.bookable_resources
  WHERE id = p_room_id
    AND organization_id = p_org_id
    AND is_active
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid practice room';
  END IF;

  IF p_customer_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM core.customers c
      WHERE c.id = p_customer_id
        AND c.organization_id = p_org_id
    ) THEN
      RAISE EXCEPTION 'Customer not found in organization';
    END IF;
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
  '공통 자원 예약 가드. p_customer_id NULL이면 사내 직원 예약(고객 검증 생략).';

-- ---------------------------------------------------------------------------
-- 4. request_member_room_reservation — 사내 즉시 확정(approved)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.request_member_room_reservation(
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT core.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  RETURN core.book_room_reservation_guarded(
    p_org_id,
    p_room_id,
    NULL,
    auth.uid(),
    p_starts_at,
    p_ends_at,
    'approved'::core.room_reservation_status,
    p_memo,
    auth.uid()
  );
END;
$$;

COMMENT ON FUNCTION core.request_member_room_reservation IS
  '사내 직원 공용자원 예약. customer_id NULL, status=approved(즉시 확정).';

GRANT EXECUTE ON FUNCTION core.request_member_room_reservation(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. cancel_my_room_reservation — 본인 또는 owner/admin/resources_manage
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.cancel_my_room_reservation(p_reservation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_row core.room_reservations%ROWTYPE;
  v_can_manage BOOLEAN;
BEGIN
  SELECT * INTO v_row FROM core.room_reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  v_can_manage :=
    core.is_org_owner_or_admin(v_row.organization_id)
    OR core.member_has_org_permission(v_row.organization_id, 'resources_manage')
    OR core.member_has_org_permission(v_row.organization_id, 'resources:manage');

  IF v_row.requested_by <> auth.uid() AND NOT v_can_manage THEN
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

COMMENT ON FUNCTION core.cancel_my_room_reservation IS
  '예약 취소: 본인(requested_by) 또는 사업주/관리자/resources_manage. 일반 staff 타인 취소 불가.';

-- ---------------------------------------------------------------------------
-- 6. list_org_room_reservations — 예약자 display name 포함
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.list_org_room_reservations(
  p_org_id UUID,
  p_room_id UUID DEFAULT NULL,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 200
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  room_id UUID,
  customer_id UUID,
  requested_by UUID,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  status core.room_reservation_status,
  memo TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  resource_name TEXT,
  resource_kind TEXT,
  customer_name TEXT,
  requester_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
STABLE
AS $$
BEGIN
  IF NOT (
    core.is_org_member(p_org_id)
    OR core.is_org_owner_or_admin(p_org_id)
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    rr.id,
    rr.organization_id,
    rr.room_id,
    rr.customer_id,
    rr.requested_by,
    rr.starts_at,
    rr.ends_at,
    rr.status,
    rr.memo,
    rr.reviewed_by,
    rr.reviewed_at,
    rr.created_at,
    br.name AS resource_name,
    br.kind AS resource_kind,
    c.name AS customer_name,
    NULLIF(btrim(COALESCE(p.full_name, p.email, '')), '') AS requester_name
  FROM core.room_reservations rr
  LEFT JOIN core.bookable_resources br ON br.id = rr.room_id
  LEFT JOIN core.customers c ON c.id = rr.customer_id
  LEFT JOIN core.profiles p ON p.id = rr.requested_by
  WHERE rr.organization_id = p_org_id
    AND (p_room_id IS NULL OR rr.room_id = p_room_id)
    AND (p_from IS NULL OR rr.starts_at >= p_from)
    AND (p_to IS NULL OR rr.starts_at <= p_to)
  ORDER BY rr.starts_at ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 200), 500));
END;
$$;

COMMENT ON FUNCTION core.list_org_room_reservations IS
  '조직 멤버용 자원 예약 목록. profiles.full_name을 requester_name으로 반환.';

GRANT EXECUTE ON FUNCTION core.list_org_room_reservations(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INT)
  TO authenticated;

COMMIT;
