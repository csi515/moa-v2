-- Public org landing: stop exposing email / representative name to anon scrapers.
-- Keep column shape for API compatibility; return NULL for PII fields.

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
    NULL::TEXT AS email,
    (o.settings->>'description')::TEXT AS description,
    (o.settings->>'business_hours')::TEXT AS business_hours,
    NULL::TEXT AS representative_name,
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
