-- Enhanced Public Search Protection
-- Phase 3.4: Prevent abuse of public org search/discovery
-- 
-- Changes:
-- 1. Update search_public_organizations with min query length, rate limit awareness
-- 2. Ensure BRN is NEVER exposed in public search results
-- 3. Add empty query protection
-- 4. Limit result count strictly
-- 5. Update get_public_organization_by_code to hide BRN

BEGIN;

-- ============================================================================
-- 1. Enhanced search_public_organizations with protections
-- ============================================================================

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
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
DECLARE
  v_clean_query TEXT;
BEGIN
  -- ============================================================================
  -- Validation and protection
  -- ============================================================================
  
  -- Trim query
  v_clean_query := trim(COALESCE(p_query, ''));
  
  -- Prevent empty query dump-all (require at least 2 characters)
  IF length(v_clean_query) < 2 THEN
    RAISE EXCEPTION '검색어는 최소 2자 이상이어야 합니다.';
  END IF;
  
  -- Cap limit strictly (max 50, default 20)
  p_limit := LEAST(COALESCE(p_limit, 20), 50);

  -- ============================================================================
  -- Return results (BRN is NEVER included in public search)
  -- ============================================================================
  
  RETURN QUERY
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
    AND o.lifecycle_status = 'active'  -- Only active orgs in public search
    AND o.public_code IS NOT NULL
    AND (
      o.name ILIKE '%' || v_clean_query || '%'
      OR o.public_code ILIKE v_clean_query || '%'
      OR (o.settings->>'address')::TEXT ILIKE '%' || v_clean_query || '%'
      OR (o.settings->>'representativeName')::TEXT ILIKE '%' || v_clean_query || '%'
    )
    AND (p_industry_type IS NULL OR o.industry_type = p_industry_type)
  ORDER BY
    CASE WHEN o.public_code ILIKE v_clean_query || '%' THEN 0 ELSE 1 END,
    o.name
  LIMIT p_limit;
END;
$$;

-- Grant remains same
GRANT EXECUTE ON FUNCTION core.search_public_organizations TO anon, authenticated;

COMMENT ON FUNCTION core.search_public_organizations IS 
  '공개 조직 검색 (Phase 3 enhanced): 최소 2자, 최대 50개, BRN 미포함, 빈 검색 금지';

-- ============================================================================
-- 2. Enhanced get_public_organization_by_code (hide BRN)
-- ============================================================================

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
  industry_category TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
BEGIN
  -- BRN is NEVER returned in public view
  -- Only return public-facing fields
  
  RETURN QUERY
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
    (o.settings->>'representativeName')::TEXT AS representative_name,
    (o.settings->>'industryCategory')::TEXT AS industry_category,
    o.is_active
  FROM core.organizations o
  WHERE o.public_code = upper(p_code)
    AND o.is_active = true
    AND o.lifecycle_status = 'active'
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION core.get_public_organization_by_code TO anon, authenticated;

COMMENT ON FUNCTION core.get_public_organization_by_code IS 
  '공개 코드로 조직 조회 (Phase 3 enhanced): BRN 미포함, 공개 필드만';

-- ============================================================================
-- 3. New RPC: Get org details with BRN (owner/admin only)
-- ============================================================================

CREATE OR REPLACE FUNCTION core.get_organization_details_with_brn(
  p_org_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
DECLARE
  v_org RECORD;
BEGIN
  -- Permission check: only owner/admin can view BRN
  IF NOT core.is_org_owner_or_admin(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied: owner/admin only';
  END IF;
  
  -- Return full org details including BRN
  SELECT
    o.id,
    o.name,
    o.business_registration_number,
    o.industry_type,
    o.slug,
    o.settings,
    o.lifecycle_status,
    o.is_active,
    o.public_code,
    o.public_qr_enabled,
    o.created_at,
    o.updated_at
  INTO v_org
  FROM core.organizations o
  WHERE o.id = p_org_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;
  
  RETURN row_to_json(v_org);
END;
$$;

GRANT EXECUTE ON FUNCTION core.get_organization_details_with_brn TO authenticated;
REVOKE EXECUTE ON FUNCTION core.get_organization_details_with_brn FROM anon;

COMMENT ON FUNCTION core.get_organization_details_with_brn IS 
  '조직 상세 정보 조회 (BRN 포함, owner/admin 전용)';

COMMIT;
