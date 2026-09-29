-- Customer Creation Prevention & Deduplication
-- Phase 3.5: Prevent indiscriminate Customer creation
-- 
-- Changes:
-- 1. Ensure submit_public_consultation does NOT auto-create Customer
-- 2. Update submit_customer_join_request to prevent duplicate pending requests
-- 3. Update approve_customer_join_request to reuse existing Customer if exists
-- 4. Add rate limit to join requests
-- 5. Document Customer creation policy in comments

BEGIN;

-- ============================================================================
-- Customer Creation Policy (Documentation)
-- ============================================================================

COMMENT ON TABLE core.customers IS 
  '고객 테이블 - 생성 정책 (Phase 3):
   - 공개 검색/QR 스캔/공개 페이지 뷰는 Customer 생성 안 함
   - Customer 생성은 실제 connect/booking/join-request 승인 시에만
   - 동일 User+Org는 기존 Customer 재사용 (중복 방지)
   - User ≠ Customer: 1명의 User가 여러 Org에서 다른 Customer 레코드 가질 수 있음
   - Customer는 타인의 Customer PII 수정 불가, owner/admin만 관리';

-- ============================================================================
-- 1. Update submit_public_consultation to NOT auto-create Customer
-- ============================================================================

-- Remove the old version that auto-creates customer
-- New version: only stores consultation request, Customer created on approval

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
  v_consultation_request_id UUID;
BEGIN
  -- Check if organization exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM core.organizations 
    WHERE id = p_org_id 
      AND is_active = true 
      AND lifecycle_status = 'active'
  ) THEN
    RAISE EXCEPTION 'Organization not found or inactive';
  END IF;

  -- Validate required fields
  IF trim(p_contact_name) = '' OR trim(p_contact_phone) = '' THEN
    RAISE EXCEPTION 'Contact name and phone are required';
  END IF;

  -- ============================================================================
  -- DO NOT auto-create Customer here
  -- Store consultation request in customer_join_requests instead
  -- ============================================================================
  
  -- Create a consultation-type join request (NO customer created yet)
  INSERT INTO core.customer_join_requests (
    organization_id,
    applicant_user_id,  -- NULL for anonymous consultation
    applicant_name,
    applicant_phone,
    applicant_email,
    request_type,
    message,
    customer_metadata,
    status
  ) VALUES (
    p_org_id,
    auth.uid(),  -- NULL if anon, set if authenticated
    trim(p_contact_name),
    trim(p_contact_phone),
    '',
    'consultation',
    p_message,
    jsonb_build_object('source', 'public_qr', 'preferred_time', p_preferred_time),
    'pending'
  )
  RETURNING id INTO v_consultation_request_id;

  RETURN v_consultation_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION core.submit_public_consultation TO anon, authenticated;

COMMENT ON FUNCTION core.submit_public_consultation IS 
  '공개 상담 신청 제출 (Phase 3): Customer 자동 생성 안 함, join_request로 저장, 승인 시 생성';

-- ============================================================================
-- 2. Enhanced submit_customer_join_request with rate limit
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
  v_rate_limit_check JSON;
BEGIN
  -- Authentication check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- ============================================================================
  -- Rate limit checks
  -- ============================================================================
  
  -- Check hourly rate limit
  v_rate_limit_check := core.check_rate_limit(auth.uid(), 'join_request_per_hour');
  IF NOT (v_rate_limit_check->>'allowed')::boolean THEN
    RAISE EXCEPTION 'Rate limit exceeded: 시간당 가입 신청 제한 초과. % 후 다시 시도해 주세요.',
      (v_rate_limit_check->>'retry_after')::integer || '초';
  END IF;

  -- Check if organization exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM core.organizations 
    WHERE id = p_org_id 
      AND is_active = true
      AND lifecycle_status = 'active'
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

  -- Check for existing pending request (prevent duplicates)
  IF EXISTS (
    SELECT 1 FROM core.customer_join_requests
    WHERE organization_id = p_org_id
      AND applicant_user_id = auth.uid()
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'You already have a pending request for this organization';
  END IF;

  -- ============================================================================
  -- Create join request (NO Customer created here)
  -- ============================================================================
  
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
  '고객 가입 신청 제출 (Phase 3 enhanced): 레이트 리미트, Customer 미생성';

-- ============================================================================
-- 3. Enhanced approve_customer_join_request to reuse existing Customer
-- ============================================================================

CREATE OR REPLACE FUNCTION core.approve_customer_join_request(
  p_request_id UUID,
  p_role TEXT DEFAULT 'customer'
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
  v_existing_customer_id UUID;
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

  -- ============================================================================
  -- Reuse existing Customer if found (same User + Org)
  -- ============================================================================
  
  -- Check if a Customer already exists for this User+Org
  -- (e.g., if they had a previous membership or consultation)
  IF v_req.applicant_user_id IS NOT NULL THEN
    SELECT c.id INTO v_existing_customer_id
    FROM core.customers c
    INNER JOIN core.organization_members om 
      ON om.organization_id = c.organization_id 
      AND om.user_id = v_req.applicant_user_id
    WHERE c.organization_id = v_req.organization_id
      AND c.name = v_req.applicant_name
    LIMIT 1;
  END IF;

  -- If existing Customer found, reuse it
  IF v_existing_customer_id IS NOT NULL THEN
    v_customer_id := v_existing_customer_id;
    
    -- Update Customer info if needed (phone/email might have changed)
    UPDATE core.customers
    SET 
      phone = COALESCE(NULLIF(v_req.applicant_phone, ''), phone),
      email = COALESCE(NULLIF(v_req.applicant_email, ''), email),
      status = 'active',
      updated_at = now()
    WHERE id = v_customer_id;
  ELSE
    -- Create new Customer record
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
  END IF;

  -- ============================================================================
  -- Create organization membership (or update if exists)
  -- ============================================================================
  
  -- Check if membership already exists (shouldn't happen, but handle gracefully)
  SELECT id INTO v_membership_id
  FROM core.organization_members
  WHERE organization_id = v_req.organization_id
    AND user_id = v_req.applicant_user_id
    AND role = p_role::core.member_role
  LIMIT 1;

  IF v_membership_id IS NULL THEN
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
  END IF;

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
    'was_existing_customer', (v_existing_customer_id IS NOT NULL),
    'success', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.approve_customer_join_request TO authenticated;
REVOKE EXECUTE ON FUNCTION core.approve_customer_join_request FROM anon;

COMMENT ON FUNCTION core.approve_customer_join_request IS 
  '고객 가입 신청 승인 (Phase 3 enhanced): 기존 Customer 재사용, 중복 방지';

COMMIT;
