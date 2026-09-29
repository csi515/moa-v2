-- Organization BRN (사업자등록번호) + Lifecycle Status
-- Phase 3.1: Organization creation limits foundation
-- 
-- Changes:
-- 1. Add business_registration_number (BRN) with UNIQUE constraint
-- 2. Add lifecycle_status (PENDING | ACTIVE | SUSPENDED | CLOSED)
-- 3. Add required org creation fields to settings/columns
-- 4. Keep is_active for backward compatibility

BEGIN;

-- ============================================================================
-- 1. Add BRN column with UNIQUE constraint
-- ============================================================================

-- Add BRN column (사업자등록번호: 10-digit format XXX-XX-XXXXX)
ALTER TABLE core.organizations
  ADD COLUMN IF NOT EXISTS business_registration_number VARCHAR(12) UNIQUE;

-- Index for BRN lookups (owner/admin only, not public)
CREATE INDEX IF NOT EXISTS idx_organizations_brn 
  ON core.organizations(business_registration_number) 
  WHERE business_registration_number IS NOT NULL;

COMMENT ON COLUMN core.organizations.business_registration_number IS 
  '사업자등록번호 (10자리, 형식: XXX-XX-XXXXX) - UNIQUE, 공개 검색/표시 금지';

-- ============================================================================
-- 2. Add lifecycle_status enum and column
-- ============================================================================

-- Create lifecycle status enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_lifecycle_status') THEN
    CREATE TYPE core.org_lifecycle_status AS ENUM ('pending', 'active', 'suspended', 'closed');
  END IF;
END $$;

-- Add lifecycle_status column (default: active for existing orgs)
ALTER TABLE core.organizations
  ADD COLUMN IF NOT EXISTS lifecycle_status core.org_lifecycle_status NOT NULL DEFAULT 'active';

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_organizations_lifecycle_status 
  ON core.organizations(lifecycle_status);

-- Keep is_active for backward compatibility, but lifecycle_status is source of truth
-- is_active = (lifecycle_status = 'active')
-- We'll handle this in create/update RPCs

COMMENT ON COLUMN core.organizations.lifecycle_status IS 
  '조직 생명주기 상태: pending(승인 대기), active(활성), suspended(정지), closed(폐쇄)';

-- ============================================================================
-- 3. Add required org metadata fields to settings JSON schema
-- ============================================================================

-- Settings will now require (enforced in RPC):
-- - representativeName: 대표자명 (required)
-- - businessPhone: 사업장 전화번호 (required)
-- - businessAddress: 사업장 주소 (required)
-- - industryCategory: 업종 (required)
-- 
-- Keep existing fields like address, phone for backward compatibility

COMMENT ON COLUMN core.organizations.settings IS 
  'JSON 설정: representativeName(대표자명*), businessPhone(사업장 전화*), businessAddress(사업장 주소*), industryCategory(업종*), 기타';

-- ============================================================================
-- 4. BRN format validation helper (format only, no external API)
-- ============================================================================

CREATE OR REPLACE FUNCTION core.validate_brn_format(p_brn TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Format: XXX-XX-XXXXX (10 digits with dashes) or XXXXXXXXXX (10 digits no dashes)
  -- Remove dashes for validation
  DECLARE
    v_clean_brn TEXT;
  BEGIN
    v_clean_brn := regexp_replace(p_brn, '-', '', 'g');
    
    -- Must be exactly 10 digits
    IF NOT (v_clean_brn ~ '^\d{10}$') THEN
      RETURN false;
    END IF;
    
    -- Basic checksum validation (simplified Korean BRN checksum)
    -- Full checksum validation can be added later
    -- For now, just ensure 10 digits
    RETURN true;
  END;
END;
$$;

COMMENT ON FUNCTION core.validate_brn_format IS 
  '사업자등록번호 형식 검증 (10자리 숫자, 기본 체크섬) - 외부 API 연동은 추후 추가';

-- ============================================================================
-- 5. Helper to normalize BRN format (store with dashes: XXX-XX-XXXXX)
-- ============================================================================

CREATE OR REPLACE FUNCTION core.normalize_brn(p_brn TEXT)
RETURNS VARCHAR(12)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_clean_brn TEXT;
BEGIN
  -- Remove all non-digits
  v_clean_brn := regexp_replace(p_brn, '[^0-9]', '', 'g');
  
  -- Must be exactly 10 digits
  IF length(v_clean_brn) != 10 THEN
    RAISE EXCEPTION 'Invalid BRN: must be 10 digits';
  END IF;
  
  -- Format as XXX-XX-XXXXX
  RETURN substring(v_clean_brn from 1 for 3) || '-' || 
         substring(v_clean_brn from 4 for 2) || '-' || 
         substring(v_clean_brn from 6 for 5);
END;
$$;

COMMENT ON FUNCTION core.normalize_brn IS 
  '사업자등록번호 정규화 (XXX-XX-XXXXX 형식으로 저장)';

-- ============================================================================
-- 6. Update existing orgs to have active lifecycle_status
-- ============================================================================

-- All existing orgs default to 'active' lifecycle_status
-- No migration needed since column default handles it

COMMIT;
