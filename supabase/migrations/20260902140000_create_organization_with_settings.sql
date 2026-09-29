-- Organization 생성 시 초기 settings(학원 정보) 저장 지원

CREATE OR REPLACE FUNCTION core.create_organization(
  p_name TEXT,
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO core.organizations (name, industry_type, slug, settings)
  VALUES (p_name, p_industry_type, p_slug, COALESCE(p_settings, '{}'::jsonb))
  RETURNING id INTO v_org_id;

  INSERT INTO core.organization_members (organization_id, user_id, role)
  VALUES (v_org_id, auth.uid(), 'owner');

  RETURN v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION core.create_organization(TEXT, TEXT, TEXT, JSONB) TO authenticated;
