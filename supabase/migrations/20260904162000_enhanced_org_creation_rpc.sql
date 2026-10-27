-- Enhanced Organization Creation RPC
-- Phase 3.3: Enforce BRN, required fields, rate limits
-- 
-- Changes:
-- 1. Update create_organization RPC to require BRN and all fields
-- 2. Enforce rate limits on org creation
-- 3. Set lifecycle_status (default: active for dev/test)
-- 4. Update profile tracking fields
-- 5. Generate public_code automatically

BEGIN;

-- ============================================================================
-- 1. Enhanced create_organization RPC with all validations
-- ============================================================================

CREATE OR REPLACE FUNCTION core.create_organization(
  p_name TEXT,
  p_business_registration_number TEXT,
  p_representative_name TEXT,
  p_business_phone TEXT,
  p_business_address TEXT,
  p_industry_category TEXT,
  p_industry_type TEXT DEFAULT 'piano',
  p_slug TEXT DEFAULT NULL,
  p_settings JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_org_id UUID;
  v_normalized_brn VARCHAR(12);
  v_rate_limit_check JSON;
  v_public_code VARCHAR(8);
BEGIN
  -- Authentication check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- ============================================================================
  -- Rate limit checks
  -- ============================================================================
  
  -- Check hourly rate limit
  v_rate_limit_check := core.check_rate_limit(auth.uid(), 'org_creation_per_hour');
  IF NOT (v_rate_limit_check->>'allowed')::boolean THEN
    RAISE EXCEPTION 'Rate limit exceeded: 시간당 조직 생성 제한 초과. % 후 다시 시도해 주세요.',
      (v_rate_limit_check->>'retry_after')::integer || '초';
  END IF;
  
  -- Check daily rate limit
  v_rate_limit_check := core.check_rate_limit(auth.uid(), 'org_creation_per_day');
  IF NOT (v_rate_limit_check->>'allowed')::boolean THEN
    RAISE EXCEPTION 'Rate limit exceeded: 일일 조직 생성 제한 초과. 내일 다시 시도해 주세요.';
  END IF;

  -- ============================================================================
  -- Required fields validation
  -- ============================================================================
  
  IF trim(p_name) = '' THEN
    RAISE EXCEPTION '사업장명을 입력해 주세요.';
  END IF;
  
  IF trim(p_representative_name) = '' THEN
    RAISE EXCEPTION '대표자명을 입력해 주세요.';
  END IF;
  
  IF trim(p_business_phone) = '' THEN
    RAISE EXCEPTION '사업장 전화번호를 입력해 주세요.';
  END IF;
  
  IF trim(p_business_address) = '' THEN
    RAISE EXCEPTION '사업장 주소를 입력해 주세요.';
  END IF;
  
  IF trim(p_industry_category) = '' THEN
    RAISE EXCEPTION '업종을 입력해 주세요.';
  END IF;

  -- ============================================================================
  -- BRN validation
  -- ============================================================================
  
  IF p_business_registration_number IS NULL OR trim(p_business_registration_number) = '' THEN
    RAISE EXCEPTION '사업자등록번호를 입력해 주세요.';
  END IF;
  
  -- Validate BRN format
  IF NOT core.validate_brn_format(p_business_registration_number) THEN
    RAISE EXCEPTION '사업자등록번호 형식이 올바르지 않습니다. (10자리 숫자)';
  END IF;
  
  -- Normalize BRN to standard format
  v_normalized_brn := core.normalize_brn(p_business_registration_number);
  
  -- Check for duplicate BRN
  IF EXISTS (
    SELECT 1 FROM core.organizations 
    WHERE business_registration_number = v_normalized_brn
  ) THEN
    RAISE EXCEPTION '이미 등록된 사업자등록번호입니다.';
  END IF;

  -- ============================================================================
  -- Generate public_code
  -- ============================================================================
  
  v_public_code := core.generate_public_code();

  -- ============================================================================
  -- Merge settings with required fields
  -- ============================================================================
  
  -- Merge user-provided settings with required metadata
  p_settings := p_settings || jsonb_build_object(
    'representativeName', trim(p_representative_name),
    'businessPhone', trim(p_business_phone),
    'businessAddress', trim(p_business_address),
    'industryCategory', trim(p_industry_category),
    -- Keep backward-compatible fields
    'directorName', trim(p_representative_name),
    'phone', trim(p_business_phone),
    'address', trim(p_business_address)
  );

  -- ============================================================================
  -- Create organization
  -- ============================================================================
  
  INSERT INTO core.organizations (
    name,
    business_registration_number,
    industry_type,
    slug,
    settings,
    lifecycle_status,
    is_active,
    public_code,
    public_qr_enabled
  ) VALUES (
    trim(p_name),
    v_normalized_brn,
    p_industry_type,
    p_slug,
    p_settings,
    'active',  -- Default to active for dev/test; change to 'pending' for production approval flow
    true,
    v_public_code,
    true  -- Enable QR by default
  )
  RETURNING id INTO v_org_id;

  -- ============================================================================
  -- Create owner membership
  -- ============================================================================
  
  INSERT INTO core.organization_members (organization_id, user_id, role)
  VALUES (v_org_id, auth.uid(), 'owner');

  -- ============================================================================
  -- Update profile rate limit tracking
  -- ============================================================================
  
  UPDATE core.profiles
  SET 
    last_org_created_at = now(),
    org_creation_count = org_creation_count + 1,
    updated_at = now()
  WHERE id = auth.uid();

  RETURN v_org_id;
END;
$$;

-- Revoke old signature, grant new one
REVOKE EXECUTE ON FUNCTION core.create_organization(TEXT, TEXT, TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION core.create_organization(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
) TO authenticated;

COMMENT ON FUNCTION core.create_organization IS 
  '조직 생성 (Phase 3 enhanced): BRN 필수, 레이트 리미트, 필수 필드 검증';

COMMIT;
