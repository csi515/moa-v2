-- Organization structured address columns for regional search readiness
-- Keeps settings.businessAddress / settings.address for legacy compatibility

BEGIN;

ALTER TABLE core.organizations
  ADD COLUMN IF NOT EXISTS postal TEXT,
  ADD COLUMN IF NOT EXISTS sido TEXT,
  ADD COLUMN IF NOT EXISTS sigungu TEXT,
  ADD COLUMN IF NOT EXISTS dong TEXT,
  ADD COLUMN IF NOT EXISTS jibun TEXT,
  ADD COLUMN IF NOT EXISTS road_address TEXT,
  ADD COLUMN IF NOT EXISTS address_detail TEXT;

COMMENT ON COLUMN core.organizations.postal IS '우편번호 (Juso zipNo)';
COMMENT ON COLUMN core.organizations.sido IS '시도 (Juso siNm)';
COMMENT ON COLUMN core.organizations.sigungu IS '시군구 (Juso sggNm)';
COMMENT ON COLUMN core.organizations.dong IS '읍면동 (Juso emdNm)';
COMMENT ON COLUMN core.organizations.jibun IS '지번주소 (Juso jibunAddr)';
COMMENT ON COLUMN core.organizations.road_address IS '도로명주소 (Juso roadAddrPart1/roadAddr)';
COMMENT ON COLUMN core.organizations.address_detail IS '상세주소 (사용자 입력, 선택)';

CREATE INDEX IF NOT EXISTS idx_organizations_region_search
  ON core.organizations (industry_type, sido, sigungu, dong);

-- Drop all known create_organization overloads for a clean replace
DROP FUNCTION IF EXISTS core.create_organization(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS core.create_organization(TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS core.create_organization(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
);
DROP FUNCTION IF EXISTS core.create_organization(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
);

CREATE FUNCTION core.create_organization(
  p_name TEXT,
  p_business_registration_number TEXT,
  p_representative_name TEXT,
  p_business_phone TEXT,
  p_business_address TEXT,
  p_industry_category TEXT,
  p_industry_type TEXT DEFAULT 'piano',
  p_slug TEXT DEFAULT NULL,
  p_settings JSONB DEFAULT '{}'::jsonb,
  p_postal TEXT DEFAULT NULL,
  p_sido TEXT DEFAULT NULL,
  p_sigungu TEXT DEFAULT NULL,
  p_dong TEXT DEFAULT NULL,
  p_jibun TEXT DEFAULT NULL,
  p_road_address TEXT DEFAULT NULL,
  p_address_detail TEXT DEFAULT NULL
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
  v_display_address TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_rate_limit_check := core.check_rate_limit(auth.uid(), 'org_creation_per_hour');
  IF NOT (v_rate_limit_check->>'allowed')::boolean THEN
    RAISE EXCEPTION 'Rate limit exceeded: 시간당 조직 생성 제한 초과. % 후 다시 시도해 주세요.',
      (v_rate_limit_check->>'retry_after')::integer || '초';
  END IF;

  v_rate_limit_check := core.check_rate_limit(auth.uid(), 'org_creation_per_day');
  IF NOT (v_rate_limit_check->>'allowed')::boolean THEN
    RAISE EXCEPTION 'Rate limit exceeded: 일일 조직 생성 제한 초과. 내일 다시 시도해 주세요.';
  END IF;

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

  IF p_business_registration_number IS NULL OR trim(p_business_registration_number) = '' THEN
    RAISE EXCEPTION '사업자등록번호를 입력해 주세요.';
  END IF;

  IF NOT core.validate_brn_format(p_business_registration_number) THEN
    RAISE EXCEPTION '사업자등록번호 형식이 올바르지 않습니다. (10자리 숫자)';
  END IF;

  v_normalized_brn := core.normalize_brn(p_business_registration_number);

  IF EXISTS (
    SELECT 1 FROM core.organizations
    WHERE business_registration_number = v_normalized_brn
  ) THEN
    RAISE EXCEPTION '이미 등록된 사업자등록번호입니다.';
  END IF;

  v_public_code := core.generate_public_code();

  v_display_address := trim(p_business_address);
  IF coalesce(trim(p_road_address), '') <> '' THEN
    v_display_address := trim(p_road_address);
    IF coalesce(trim(p_address_detail), '') <> '' THEN
      v_display_address := v_display_address || ' ' || trim(p_address_detail);
    END IF;
  END IF;

  p_settings := p_settings || jsonb_build_object(
    'representativeName', trim(p_representative_name),
    'businessPhone', trim(p_business_phone),
    'businessAddress', v_display_address,
    'industryCategory', trim(p_industry_category),
    'directorName', trim(p_representative_name),
    'phone', trim(p_business_phone),
    'address', v_display_address
  );

  INSERT INTO core.organizations (
    name,
    business_registration_number,
    industry_type,
    slug,
    settings,
    lifecycle_status,
    is_active,
    public_code,
    public_qr_enabled,
    postal,
    sido,
    sigungu,
    dong,
    jibun,
    road_address,
    address_detail
  ) VALUES (
    trim(p_name),
    v_normalized_brn,
    p_industry_type,
    p_slug,
    p_settings,
    'active',
    true,
    v_public_code,
    true,
    NULLIF(trim(COALESCE(p_postal, '')), ''),
    NULLIF(trim(COALESCE(p_sido, '')), ''),
    NULLIF(trim(COALESCE(p_sigungu, '')), ''),
    NULLIF(trim(COALESCE(p_dong, '')), ''),
    NULLIF(trim(COALESCE(p_jibun, '')), ''),
    NULLIF(trim(COALESCE(p_road_address, '')), ''),
    NULLIF(trim(COALESCE(p_address_detail, '')), '')
  )
  RETURNING id INTO v_org_id;

  INSERT INTO core.organization_members (organization_id, user_id, role)
  VALUES (v_org_id, auth.uid(), 'owner');

  UPDATE core.profiles
  SET
    last_org_created_at = now(),
    org_creation_count = org_creation_count + 1,
    updated_at = now()
  WHERE id = auth.uid();

  RETURN v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION core.create_organization(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;

COMMENT ON FUNCTION core.create_organization(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) IS
  '조직 생성: BRN 필수 + 선택적 구조화 주소(postal/sido/sigungu/dong/jibun/road/detail). settings.businessAddress 유지.';

DROP FUNCTION IF EXISTS core.search_public_organizations(TEXT, TEXT, INT);
DROP FUNCTION IF EXISTS core.search_public_organizations(TEXT, TEXT, INTEGER);

CREATE FUNCTION core.search_public_organizations(
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
  v_clean_query := trim(COALESCE(p_query, ''));

  IF length(v_clean_query) < 2 THEN
    RAISE EXCEPTION '검색어는 최소 2자 이상이어야 합니다.';
  END IF;

  p_limit := LEAST(COALESCE(p_limit, 20), 50);

  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.industry_type,
    o.public_code,
    o.slug,
    COALESCE(
      NULLIF(trim(concat_ws(' ', o.road_address, o.address_detail)), ''),
      (o.settings->>'address')::TEXT,
      (o.settings->>'businessAddress')::TEXT
    ) AS address,
    COALESCE(
      (o.settings->>'phone')::TEXT,
      (o.settings->>'businessPhone')::TEXT
    ) AS phone,
    o.is_active
  FROM core.organizations o
  WHERE o.is_active = true
    AND o.lifecycle_status = 'active'
    AND o.public_code IS NOT NULL
    AND (
      o.name ILIKE '%' || v_clean_query || '%'
      OR o.public_code ILIKE v_clean_query || '%'
      OR (o.settings->>'address')::TEXT ILIKE '%' || v_clean_query || '%'
      OR (o.settings->>'businessAddress')::TEXT ILIKE '%' || v_clean_query || '%'
      OR (o.settings->>'representativeName')::TEXT ILIKE '%' || v_clean_query || '%'
      OR o.road_address ILIKE '%' || v_clean_query || '%'
      OR o.sido ILIKE '%' || v_clean_query || '%'
      OR o.sigungu ILIKE '%' || v_clean_query || '%'
      OR o.dong ILIKE '%' || v_clean_query || '%'
    )
    AND (p_industry_type IS NULL OR o.industry_type = p_industry_type)
  ORDER BY
    CASE WHEN o.public_code ILIKE v_clean_query || '%' THEN 0 ELSE 1 END,
    o.name
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION core.search_public_organizations TO anon, authenticated;

DROP FUNCTION IF EXISTS core.get_public_organization_by_code(VARCHAR);
DROP FUNCTION IF EXISTS core.get_public_organization_by_code(VARCHAR(8));

CREATE FUNCTION core.get_public_organization_by_code(p_code VARCHAR(8))
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
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.industry_type,
    o.public_code,
    o.slug,
    COALESCE(
      NULLIF(trim(concat_ws(' ', o.road_address, o.address_detail)), ''),
      (o.settings->>'address')::TEXT,
      (o.settings->>'businessAddress')::TEXT
    ) AS address,
    COALESCE(
      (o.settings->>'phone')::TEXT,
      (o.settings->>'businessPhone')::TEXT
    ) AS phone,
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

COMMIT;
