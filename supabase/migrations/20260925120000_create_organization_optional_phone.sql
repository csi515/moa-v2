-- 신규 조직 생성 시 사업장 전화번호는 선택값.
-- 마법사는 전화번호를 받지 않는다. 빈 값·NULL은 저장하지 않는다.
-- 스키마/기존 행은 변경하지 않는다.

CREATE OR REPLACE FUNCTION core.create_organization(
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
  v_brn_digits TEXT;
  v_phone TEXT;
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

  IF trim(p_business_address) = '' THEN
    RAISE EXCEPTION '사업장 주소를 입력해 주세요.';
  END IF;

  IF trim(p_industry_category) = '' THEN
    RAISE EXCEPTION '업종을 입력해 주세요.';
  END IF;

  v_phone := NULLIF(btrim(COALESCE(p_business_phone, '')), '');

  v_normalized_brn := NULL;
  IF p_business_registration_number IS NOT NULL AND trim(p_business_registration_number) <> '' THEN
    v_brn_digits := regexp_replace(p_business_registration_number, '[^0-9]', '', 'g');
    IF v_brn_digits = '' OR v_brn_digits ~ '^0+$' THEN
      RAISE EXCEPTION '사업자등록번호가 올바르지 않습니다.';
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
    'businessAddress', v_display_address,
    'industryCategory', trim(p_industry_category),
    'directorName', trim(p_representative_name),
    'address', v_display_address
  );
  IF v_phone IS NOT NULL THEN
    p_settings := p_settings || jsonb_build_object(
      'businessPhone', v_phone,
      'phone', v_phone
    );
  END IF;

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
  '조직 생성: 사업자등록번호·사업장 전화번호는 선택. 주소는 필수.';
