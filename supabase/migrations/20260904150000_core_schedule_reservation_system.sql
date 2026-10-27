-- Core Schedule + Reservation System
-- Schedule = core.schedules (슬롯). Reservation = core.reservations (고객 신청).
-- bookable 슬롯 점유는 reservations.status. schedules.status 와 미러하지 않는다.
-- 조직의 시간 기반 활동 기반 + 예약 시스템
-- 
-- Changes:
-- 1. Extend core.schedules to support bookable slots
-- 2. Create core.reservations table for customer booking requests
-- 3. Add reservation_status enum
-- 4. Create RPCs for booking flow (list, request, confirm, cancel)
-- 5. Add RLS policies for multi-tenant isolation
-- 6. Add double-booking prevention constraints
-- 7. Extend organization search to include owner/representative name

BEGIN;

-- ============================================================================
-- 1. Create reservation_status enum
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_status') THEN
    CREATE TYPE core.reservation_status AS ENUM ('requested', 'confirmed', 'cancelled');
  END IF;
END $$;

COMMENT ON TYPE core.reservation_status IS '예약 상태: requested=신청됨, confirmed=확정됨, cancelled=취소됨';

-- ============================================================================
-- 2. Extend core.schedules table for bookable slots
-- ============================================================================

-- Add columns to support bookable schedule slots
ALTER TABLE core.schedules
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS is_bookable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_capacity INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Index for bookable schedule queries
CREATE INDEX IF NOT EXISTS idx_schedules_bookable 
  ON core.schedules(organization_id, is_bookable, starts_at) 
  WHERE is_bookable = true;

CREATE INDEX IF NOT EXISTS idx_schedules_org_time 
  ON core.schedules(organization_id, starts_at, ends_at);

COMMENT ON COLUMN core.schedules.title IS '일정 제목 (예약 가능 슬롯인 경우 필수)';
COMMENT ON COLUMN core.schedules.is_bookable IS '고객 예약 가능 여부 (true=예약 가능한 슬롯, false=일반 일정)';
COMMENT ON COLUMN core.schedules.max_capacity IS '최대 수용 인원 (개인: 1, 그룹: N)';
COMMENT ON COLUMN core.schedules.description IS '일정 설명';

-- ============================================================================
-- 3. Create core.reservations table
-- ============================================================================

CREATE TABLE core.reservations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  schedule_id       UUID NOT NULL REFERENCES core.schedules(id) ON DELETE CASCADE,
  customer_id       UUID REFERENCES core.customers(id) ON DELETE SET NULL,
  user_id           UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
  
  -- Reservation details
  applicant_name    TEXT NOT NULL,
  applicant_phone   TEXT,
  applicant_email   TEXT,
  request_message   TEXT,
  
  -- Status tracking
  status            core.reservation_status NOT NULL DEFAULT 'requested',
  confirmed_by      UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
  confirmed_at      TIMESTAMPTZ,
  cancelled_by      UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT,
  
  -- Metadata
  metadata          JSONB DEFAULT '{}'::JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT reservations_has_customer_or_user CHECK (customer_id IS NOT NULL OR user_id IS NOT NULL)
);

-- Indexes for reservation queries
CREATE INDEX idx_reservations_org_status 
  ON core.reservations(organization_id, status, created_at DESC);
CREATE INDEX idx_reservations_schedule 
  ON core.reservations(schedule_id, status);
CREATE INDEX idx_reservations_customer 
  ON core.reservations(customer_id, status) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_reservations_user 
  ON core.reservations(user_id, status) WHERE user_id IS NOT NULL;

-- Prevent double-booking: one user can only have one active reservation per schedule
-- Active = requested OR confirmed
CREATE UNIQUE INDEX idx_reservations_schedule_user_active
  ON core.reservations(schedule_id, user_id)
  WHERE status IN ('requested', 'confirmed') AND user_id IS NOT NULL;

CREATE UNIQUE INDEX idx_reservations_schedule_customer_active
  ON core.reservations(schedule_id, customer_id)
  WHERE status IN ('requested', 'confirmed') AND customer_id IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON core.reservations
  FOR EACH ROW
  EXECUTE FUNCTION core.set_updated_at();

COMMENT ON TABLE core.reservations IS '예약 신청 및 확정 테이블 (고객 → 일정 예약)';

-- ============================================================================
-- 4. RLS Policies for core.reservations
-- ============================================================================

ALTER TABLE core.reservations ENABLE ROW LEVEL SECURITY;

-- Users can see their own reservations (by user_id)
CREATE POLICY reservations_select_own 
  ON core.reservations
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- Customers can see their own reservations (by customer_id linked through customers table)
CREATE POLICY reservations_select_own_customer 
  ON core.reservations
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM core.customers c
      INNER JOIN core.organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = reservations.customer_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

-- Organization owners/admins can see all reservations for their org
CREATE POLICY reservations_select_org 
  ON core.reservations
  FOR SELECT 
  TO authenticated
  USING (core.is_org_owner_or_admin(organization_id));

-- Authenticated users can create reservations (insert checks in RPC)
CREATE POLICY reservations_insert_authenticated 
  ON core.reservations
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Organization owners/admins can update reservations (confirm/cancel)
CREATE POLICY reservations_update_org 
  ON core.reservations
  FOR UPDATE 
  TO authenticated
  USING (core.is_org_owner_or_admin(organization_id))
  WITH CHECK (core.is_org_owner_or_admin(organization_id));

-- Users can cancel their own requested reservations
CREATE POLICY reservations_update_own_cancel 
  ON core.reservations
  FOR UPDATE 
  TO authenticated
  USING (
    user_id = auth.uid() 
    AND status = 'requested'
  )
  WITH CHECK (
    user_id = auth.uid() 
    AND status = 'cancelled'
  );

-- ============================================================================
-- 5. Update core.schedules RLS to allow public read of bookable schedules
-- ============================================================================

-- Public (anon) can view bookable schedules for active orgs
CREATE POLICY schedules_select_bookable_public 
  ON core.schedules
  FOR SELECT 
  TO anon, authenticated
  USING (
    is_bookable = true 
    AND EXISTS (
      SELECT 1 FROM core.organizations o 
      WHERE o.id = schedules.organization_id 
        AND o.is_active = true
    )
  );

-- ============================================================================
-- 6. RPC: List bookable schedules for an organization
-- ============================================================================

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
    GREATEST(s.max_capacity - COALESCE(COUNT(r.id) FILTER (WHERE r.status = 'confirmed'), 0), 0) AS available_slots,
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
  HAVING GREATEST(s.max_capacity - COALESCE(COUNT(r.id) FILTER (WHERE r.status = 'confirmed'), 0), 0) > 0
  ORDER BY s.starts_at
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION core.list_bookable_schedules TO anon, authenticated;

COMMENT ON FUNCTION core.list_bookable_schedules IS
  '예약 가능한 일정 목록 조회 (공개, 로그인 불필요)';

-- ============================================================================
-- 7. RPC: Request a reservation
-- ============================================================================

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
BEGIN
  v_user_id := auth.uid();
  
  -- Authentication check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get schedule details with row lock to prevent race conditions
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
  FOR UPDATE OF s;  -- Lock the schedule row to prevent concurrent bookings

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

  -- Check capacity: count both requested AND confirmed reservations
  -- This prevents oversubscription even with pending requests
  SELECT COUNT(*)
  INTO v_confirmed_count
  FROM core.reservations
  WHERE schedule_id = p_schedule_id
    AND status IN ('requested', 'confirmed');

  IF v_confirmed_count >= v_schedule.max_capacity THEN
    RAISE EXCEPTION 'Schedule is fully booked';
  END IF;

  -- Check for existing active reservation by this user
  -- Note: unique index also enforces this, but explicit check provides better error message
  IF EXISTS (
    SELECT 1 FROM core.reservations
    WHERE schedule_id = p_schedule_id
      AND user_id = v_user_id
      AND status IN ('requested', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'You already have a reservation for this schedule';
  END IF;

  -- Try to find/create customer record for this user in this org
  SELECT id INTO v_customer_id
  FROM core.customers
  WHERE organization_id = v_org_id
    AND phone = p_applicant_phone
  LIMIT 1;

  IF v_customer_id IS NULL AND p_applicant_phone IS NOT NULL THEN
    INSERT INTO core.customers (
      organization_id,
      name,
      phone,
      email,
      status,
      metadata
    ) VALUES (
      v_org_id,
      p_applicant_name,
      p_applicant_phone,
      COALESCE(p_applicant_email, ''),
      'active',
      jsonb_build_object('source', 'reservation')
    )
    RETURNING id INTO v_customer_id;
  END IF;

  -- Create reservation
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
    p_applicant_name,
    p_applicant_phone,
    p_applicant_email,
    p_request_message,
    'requested'
  )
  RETURNING id INTO v_reservation_id;

  RETURN v_reservation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION core.request_reservation TO authenticated;
REVOKE EXECUTE ON FUNCTION core.request_reservation FROM anon;

COMMENT ON FUNCTION core.request_reservation IS
  '예약 신청 (로그인 필요, 신청 상태로 생성)';

-- ============================================================================
-- 8. RPC: Confirm a reservation (owner/admin only)
-- ============================================================================

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

  -- Get reservation details
  SELECT * INTO v_reservation
  FROM core.reservations
  WHERE id = p_reservation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  -- Check permissions
  IF NOT core.is_org_owner_or_admin(v_reservation.organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF v_reservation.status != 'requested' THEN
    RAISE EXCEPTION 'Reservation is not in requested status';
  END IF;

  -- Check schedule capacity
  SELECT max_capacity INTO v_schedule
  FROM core.schedules
  WHERE id = v_reservation.schedule_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule not found';
  END IF;

  SELECT COUNT(*)
  INTO v_confirmed_count
  FROM core.reservations
  WHERE schedule_id = v_reservation.schedule_id
    AND status = 'confirmed';

  IF v_confirmed_count >= v_schedule.max_capacity THEN
    RAISE EXCEPTION 'Schedule is fully booked';
  END IF;

  -- Confirm reservation
  UPDATE core.reservations
  SET status = 'confirmed',
      confirmed_by = auth.uid(),
      confirmed_at = now(),
      updated_at = now()
  WHERE id = p_reservation_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION core.confirm_reservation TO authenticated;
REVOKE EXECUTE ON FUNCTION core.confirm_reservation FROM anon;

COMMENT ON FUNCTION core.confirm_reservation IS
  '예약 확정 (owner/admin 전용)';

-- ============================================================================
-- 9. RPC: Cancel a reservation
-- ============================================================================

CREATE OR REPLACE FUNCTION core.cancel_reservation(
  p_reservation_id UUID,
  p_cancel_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_reservation RECORD;
  v_is_owner BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get reservation details
  SELECT * INTO v_reservation
  FROM core.reservations
  WHERE id = p_reservation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  IF v_reservation.status = 'cancelled' THEN
    RAISE EXCEPTION 'Reservation is already cancelled';
  END IF;

  -- Check permissions (owner/admin OR own user)
  v_is_owner := core.is_org_owner_or_admin(v_reservation.organization_id);
  
  IF NOT v_is_owner AND v_reservation.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Cancel reservation
  UPDATE core.reservations
  SET status = 'cancelled',
      cancelled_by = auth.uid(),
      cancelled_at = now(),
      cancel_reason = p_cancel_reason,
      updated_at = now()
  WHERE id = p_reservation_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION core.cancel_reservation TO authenticated;
REVOKE EXECUTE ON FUNCTION core.cancel_reservation FROM anon;

COMMENT ON FUNCTION core.cancel_reservation IS
  '예약 취소 (owner/admin 또는 본인만 가능)';

-- ============================================================================
-- 10. RPC: Get organization reservations (owner/admin only)
-- ============================================================================

CREATE OR REPLACE FUNCTION core.get_organization_reservations(
  p_org_id UUID,
  p_status core.reservation_status DEFAULT NULL,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  schedule_id UUID,
  schedule_title TEXT,
  schedule_starts_at TIMESTAMPTZ,
  schedule_ends_at TIMESTAMPTZ,
  customer_id UUID,
  applicant_name TEXT,
  applicant_phone TEXT,
  applicant_email TEXT,
  request_message TEXT,
  status core.reservation_status,
  confirmed_by_name TEXT,
  confirmed_at TIMESTAMPTZ,
  cancelled_by_name TEXT,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT
    r.id,
    r.schedule_id,
    s.title AS schedule_title,
    s.starts_at AS schedule_starts_at,
    s.ends_at AS schedule_ends_at,
    r.customer_id,
    r.applicant_name,
    r.applicant_phone,
    r.applicant_email,
    r.request_message,
    r.status,
    p_confirmed.full_name AS confirmed_by_name,
    r.confirmed_at,
    p_cancelled.full_name AS cancelled_by_name,
    r.cancelled_at,
    r.cancel_reason,
    r.created_at
  FROM core.reservations r
  INNER JOIN core.schedules s ON s.id = r.schedule_id
  LEFT JOIN core.profiles p_confirmed ON p_confirmed.id = r.confirmed_by
  LEFT JOIN core.profiles p_cancelled ON p_cancelled.id = r.cancelled_by
  WHERE r.organization_id = p_org_id
    AND (p_status IS NULL OR r.status = p_status)
    AND (p_from_date IS NULL OR s.starts_at >= p_from_date)
    AND core.is_org_owner_or_admin(p_org_id)
  ORDER BY
    CASE r.status
      WHEN 'requested' THEN 1
      WHEN 'confirmed' THEN 2
      WHEN 'cancelled' THEN 3
    END,
    s.starts_at DESC,
    r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION core.get_organization_reservations TO authenticated;
REVOKE EXECUTE ON FUNCTION core.get_organization_reservations FROM anon;

COMMENT ON FUNCTION core.get_organization_reservations IS
  '조직의 예약 목록 조회 (owner/admin 전용)';

-- ============================================================================
-- 11. RPC: Get user's own reservations
-- ============================================================================

CREATE OR REPLACE FUNCTION core.get_my_reservations(
  p_status core.reservation_status DEFAULT NULL,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  organization_name TEXT,
  schedule_id UUID,
  schedule_title TEXT,
  schedule_starts_at TIMESTAMPTZ,
  schedule_ends_at TIMESTAMPTZ,
  status core.reservation_status,
  request_message TEXT,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT
    r.id,
    r.organization_id,
    o.name AS organization_name,
    r.schedule_id,
    s.title AS schedule_title,
    s.starts_at AS schedule_starts_at,
    s.ends_at AS schedule_ends_at,
    r.status,
    r.request_message,
    r.confirmed_at,
    r.cancelled_at,
    r.cancel_reason,
    r.created_at
  FROM core.reservations r
  INNER JOIN core.schedules s ON s.id = r.schedule_id
  INNER JOIN core.organizations o ON o.id = r.organization_id
  WHERE r.user_id = auth.uid()
    AND (p_status IS NULL OR r.status = p_status)
  ORDER BY s.starts_at DESC, r.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION core.get_my_reservations TO authenticated;
REVOKE EXECUTE ON FUNCTION core.get_my_reservations FROM anon;

COMMENT ON FUNCTION core.get_my_reservations IS
  '내 예약 목록 조회 (로그인 사용자)';

-- ============================================================================
-- 12. Extend organization search to include owner/representative name
-- ============================================================================

-- Update existing search function to include more fields
CREATE OR REPLACE FUNCTION core.search_public_organizations(
  p_query TEXT,
  p_industry_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  industry_type TEXT,
  public_code VARCHAR(8),
  slug TEXT,
  address TEXT,
  phone TEXT,
  representative_name TEXT,
  is_active BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT
    o.id,
    o.name,
    o.industry_type,
    o.public_code,
    o.slug,
    (o.settings->>'address')::TEXT AS address,
    (o.settings->>'phone')::TEXT AS phone,
    (o.settings->>'representative_name')::TEXT AS representative_name,
    o.is_active
  FROM core.organizations o
  WHERE o.is_active = true
    AND o.public_code IS NOT NULL
    AND (
      o.name ILIKE '%' || p_query || '%'
      OR o.public_code ILIKE p_query || '%'
      OR (o.settings->>'address')::TEXT ILIKE '%' || p_query || '%'
      OR (o.settings->>'phone')::TEXT ILIKE '%' || p_query || '%'
      OR (o.settings->>'representative_name')::TEXT ILIKE '%' || p_query || '%'
    )
    AND (p_industry_type IS NULL OR o.industry_type = p_industry_type)
  ORDER BY
    CASE WHEN o.public_code ILIKE p_query || '%' THEN 0 ELSE 1 END,
    o.name
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION core.search_public_organizations IS
  '공개 조직 검색 (이름, 코드, 주소, 전화번호, 대표자명) - 로그인 불필요';

-- Update get_public_organization_by_code to include representative_name
CREATE OR REPLACE FUNCTION core.get_public_organization_by_code(p_code VARCHAR(8))
RETURNS TABLE (
  id UUID,
  name TEXT,
  industry_type TEXT,
  public_code VARCHAR(8),
  slug TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  description TEXT,
  business_hours TEXT,
  representative_name TEXT,
  is_active BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT
    o.id,
    o.name,
    o.industry_type,
    o.public_code,
    o.slug,
    (o.settings->>'address')::TEXT AS address,
    (o.settings->>'phone')::TEXT AS phone,
    (o.settings->>'email')::TEXT AS email,
    (o.settings->>'description')::TEXT AS description,
    (o.settings->>'business_hours')::TEXT AS business_hours,
    (o.settings->>'representative_name')::TEXT AS representative_name,
    o.is_active
  FROM core.organizations o
  WHERE o.public_code = upper(p_code)
    AND o.is_active = true
  LIMIT 1;
$$;

COMMENT ON FUNCTION core.get_public_organization_by_code IS
  '공개 코드로 조직 정보 조회 (대표자명 포함) - 로그인 불필요';

COMMIT;
