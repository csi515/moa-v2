-- Phase 2: Customer Join & Organization Discovery
-- 고객 자가 회원가입 플로우 + 조직 공개 코드/검색
-- 
-- Changes:
-- 1. Add public_code to organizations (human-readable code for QR/deep-link)
-- 2. Create public organization search RPCs (no auth required)
-- 3. Create customer_join_requests table for customer sign-up workflow
-- 4. Create approval/rejection RPCs for organization owners
-- 5. Add public consult submission RPC (lightweight)

BEGIN;

-- ============================================================================
-- 1. Add public code to organizations
-- ============================================================================

ALTER TABLE core.organizations
  ADD COLUMN IF NOT EXISTS public_code VARCHAR(8) UNIQUE,
  ADD COLUMN IF NOT EXISTS public_qr_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_organizations_public_code 
  ON core.organizations(public_code) 
  WHERE public_code IS NOT NULL;

COMMENT ON COLUMN core.organizations.public_code IS 
  '조직 공개 코드 (6-8자리, QR/deep-link용, 예: MOA12AB3)';
COMMENT ON COLUMN core.organizations.public_qr_enabled IS 
  '공개 QR 코드 활성화 여부';

-- Function to generate unique public code
CREATE OR REPLACE FUNCTION core.generate_public_code()
RETURNS VARCHAR(8)
LANGUAGE plpgsql
AS $$
DECLARE
  v_code VARCHAR(8);
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-character code: 2 letters + 4 digits
    v_code := upper(
      chr(65 + floor(random() * 26)::int) ||
      chr(65 + floor(random() * 26)::int) ||
      lpad(floor(random() * 10000)::text, 4, '0')
    );
    
    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM core.organizations WHERE public_code = v_code
    ) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  RETURN v_code;
END;
$$;

-- Auto-generate public codes for existing organizations (optional, can run separately)
-- UPDATE core.organizations 
-- SET public_code = core.generate_public_code() 
-- WHERE public_code IS NULL AND is_active = true;

-- ============================================================================
-- 2. Public organization search RPCs (accessible without auth)
-- ============================================================================

-- Search organizations by name or code
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
    o.is_active
  FROM core.organizations o
  WHERE o.is_active = true
    AND o.public_code IS NOT NULL
    AND (
      o.name ILIKE '%' || p_query || '%'
      OR o.public_code ILIKE p_query || '%'
      OR (o.settings->>'address')::TEXT ILIKE '%' || p_query || '%'
    )
    AND (p_industry_type IS NULL OR o.industry_type = p_industry_type)
  ORDER BY
    CASE WHEN o.public_code ILIKE p_query || '%' THEN 0 ELSE 1 END,
    o.name
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION core.search_public_organizations TO anon, authenticated;

COMMENT ON FUNCTION core.search_public_organizations IS
  '공개 조직 검색 (이름, 코드, 주소) - 로그인 불필요';

-- Get organization by public code
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
    o.is_active
  FROM core.organizations o
  WHERE o.public_code = upper(p_code)
    AND o.is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION core.get_public_organization_by_code TO anon, authenticated;

COMMENT ON FUNCTION core.get_public_organization_by_code IS
  '공개 코드로 조직 정보 조회 - 로그인 불필요';

-- ============================================================================
-- 3. Customer join requests table
-- ============================================================================

-- Create enum for join request status
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'join_request_status') THEN
    CREATE TYPE core.join_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
  END IF;
END $$;

-- Create customer join requests table
CREATE TABLE IF NOT EXISTS core.customer_join_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  applicant_user_id UUID NOT NULL REFERENCES core.profiles(id) ON DELETE CASCADE,
  applicant_name    TEXT NOT NULL,
  applicant_phone   TEXT,
  applicant_email   TEXT,
  request_type      TEXT NOT NULL DEFAULT 'membership',  -- 'membership' | 'trial' | 'consultation'
  message           TEXT,
  customer_metadata JSONB DEFAULT '{}'::JSONB,
  status            core.join_request_status NOT NULL DEFAULT 'pending',
  reviewed_by       UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  reject_reason     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_join_requests_org_status 
  ON core.customer_join_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_join_requests_user 
  ON core.customer_join_requests(applicant_user_id);
CREATE INDEX IF NOT EXISTS idx_customer_join_requests_created 
  ON core.customer_join_requests(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_customer_join_requests_updated_at
  BEFORE UPDATE ON core.customer_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION core.update_updated_at_column();

-- RLS: Applicant can see their own requests
CREATE POLICY customer_join_requests_select_own 
  ON core.customer_join_requests
  FOR SELECT 
  TO authenticated
  USING (applicant_user_id = auth.uid());

-- RLS: Organization owner/admin can see requests for their org
CREATE POLICY customer_join_requests_select_org 
  ON core.customer_join_requests
  FOR SELECT 
  TO authenticated
  USING (core.is_org_owner_or_admin(organization_id));

-- RLS: Authenticated users can insert their own requests
CREATE POLICY customer_join_requests_insert_own 
  ON core.customer_join_requests
  FOR INSERT 
  TO authenticated
  WITH CHECK (applicant_user_id = auth.uid());

-- RLS: Organization owner/admin can update status
CREATE POLICY customer_join_requests_update_org 
  ON core.customer_join_requests
  FOR UPDATE 
  TO authenticated
  USING (core.is_org_owner_or_admin(organization_id))
  WITH CHECK (core.is_org_owner_or_admin(organization_id));

ALTER TABLE core.customer_join_requests ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE core.customer_join_requests IS
  '고객 가입 신청 테이블 (검색 → 신청 → 승인 플로우)';

-- ============================================================================
-- 4. Submit customer join request RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION core.submit_customer_join_request(
  p_org_id UUID,
  p_applicant_name TEXT,
  p_applicant_phone TEXT DEFAULT NULL,
  p_applicant_email TEXT DEFAULT NULL,
  p_request_type TEXT DEFAULT 'membership',
  p_message TEXT DEFAULT NULL,
  p_customer_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_request_id UUID;
  v_existing_membership_id UUID;
BEGIN
  -- Authentication check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if organization exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM core.organizations 
    WHERE id = p_org_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Organization not found or inactive';
  END IF;

  -- Check if user already has a membership in this org
  SELECT id INTO v_existing_membership_id
  FROM core.organization_members
  WHERE organization_id = p_org_id 
    AND user_id = auth.uid()
    AND is_active = true
  LIMIT 1;

  IF v_existing_membership_id IS NOT NULL THEN
    RAISE EXCEPTION 'You are already a member of this organization';
  END IF;

  -- Check for existing pending request
  IF EXISTS (
    SELECT 1 FROM core.customer_join_requests
    WHERE organization_id = p_org_id
      AND applicant_user_id = auth.uid()
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'You already have a pending request for this organization';
  END IF;

  -- Create join request
  INSERT INTO core.customer_join_requests (
    organization_id,
    applicant_user_id,
    applicant_name,
    applicant_phone,
    applicant_email,
    request_type,
    message,
    customer_metadata
  ) VALUES (
    p_org_id,
    auth.uid(),
    p_applicant_name,
    COALESCE(p_applicant_phone, ''),
    COALESCE(p_applicant_email, ''),
    p_request_type,
    p_message,
    COALESCE(p_customer_metadata, '{}'::JSONB)
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION core.submit_customer_join_request TO authenticated;
REVOKE EXECUTE ON FUNCTION core.submit_customer_join_request FROM anon;

COMMENT ON FUNCTION core.submit_customer_join_request IS
  '고객 가입 신청 제출 (authenticated users only)';

-- ============================================================================
-- 5. Approve customer join request RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION core.approve_customer_join_request(
  p_request_id UUID,
  p_role TEXT DEFAULT 'customer'  -- 'customer' or 'member'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_req RECORD;
  v_customer_id UUID;
  v_membership_id UUID;
BEGIN
  -- Fetch request
  SELECT * INTO v_req
  FROM core.customer_join_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_req.status != 'pending' THEN
    RAISE EXCEPTION 'Request already processed';
  END IF;

  -- Permission check
  IF NOT core.is_org_owner_or_admin(v_req.organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Validate role
  IF p_role NOT IN ('customer', 'member') THEN
    RAISE EXCEPTION 'Invalid role. Must be customer or member';
  END IF;

  -- Create customer record
  INSERT INTO core.customers (
    organization_id,
    name,
    phone,
    email,
    status,
    metadata
  ) VALUES (
    v_req.organization_id,
    v_req.applicant_name,
    COALESCE(v_req.applicant_phone, ''),
    COALESCE(v_req.applicant_email, ''),
    'active',
    COALESCE(v_req.customer_metadata, '{}'::JSONB)
  )
  RETURNING id INTO v_customer_id;

  -- Create organization membership
  INSERT INTO core.organization_members (
    organization_id,
    user_id,
    role
  ) VALUES (
    v_req.organization_id,
    v_req.applicant_user_id,
    p_role::core.member_role
  )
  RETURNING id INTO v_membership_id;

  -- Update request status
  UPDATE core.customer_join_requests
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_request_id;

  RETURN json_build_object(
    'customer_id', v_customer_id,
    'membership_id', v_membership_id,
    'success', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.approve_customer_join_request TO authenticated;
REVOKE EXECUTE ON FUNCTION core.approve_customer_join_request FROM anon;

COMMENT ON FUNCTION core.approve_customer_join_request IS
  '고객 가입 신청 승인 (owner/admin only)';

-- ============================================================================
-- 6. Reject customer join request RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION core.reject_customer_join_request(
  p_request_id UUID,
  p_reject_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM core.customer_join_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF NOT core.is_org_owner_or_admin(v_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE core.customer_join_requests
  SET status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      reject_reason = p_reject_reason,
      updated_at = now()
  WHERE id = p_request_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION core.reject_customer_join_request TO authenticated;
REVOKE EXECUTE ON FUNCTION core.reject_customer_join_request FROM anon;

COMMENT ON FUNCTION core.reject_customer_join_request IS
  '고객 가입 신청 반려 (owner/admin only)';

-- ============================================================================
-- 7. Public consultation submission (lightweight)
-- ============================================================================

-- Allow public consultation submissions (reuse existing consultations table)
CREATE OR REPLACE FUNCTION core.submit_public_consultation(
  p_org_id UUID,
  p_contact_name TEXT,
  p_contact_phone TEXT,
  p_message TEXT,
  p_preferred_time TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_customer_id UUID;
  v_consultation_id UUID;
BEGIN
  -- Check if organization exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM core.organizations 
    WHERE id = p_org_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Organization not found or inactive';
  END IF;

  -- Create a temporary customer record for consultation
  -- (or reuse if phone matches existing customer)
  SELECT id INTO v_customer_id
  FROM core.customers
  WHERE organization_id = p_org_id
    AND phone = p_contact_phone
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO core.customers (
      organization_id,
      name,
      phone,
      email,
      status,
      metadata
    ) VALUES (
      p_org_id,
      p_contact_name,
      p_contact_phone,
      '',
      'lead',  -- Status for consultation leads
      jsonb_build_object('source', 'public_qr', 'preferred_time', p_preferred_time)
    )
    RETURNING id INTO v_customer_id;
  END IF;

  -- Create consultation record
  INSERT INTO core.consultations (
    organization_id,
    customer_id,
    consultation_date,
    type,
    content,
    follow_up
  ) VALUES (
    p_org_id,
    v_customer_id,
    CURRENT_DATE,
    'initial_inquiry',
    p_message,
    COALESCE('선호 시간: ' || p_preferred_time, NULL)
  )
  RETURNING id INTO v_consultation_id;

  RETURN v_consultation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION core.submit_public_consultation TO anon, authenticated;

COMMENT ON FUNCTION core.submit_public_consultation IS
  '공개 상담 신청 제출 (로그인 불필요, QR/deep-link용)';

COMMIT;
