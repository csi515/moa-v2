-- Fix: organizations.public_code is varchar(8); RETURNS TABLE text requires cast
CREATE OR REPLACE FUNCTION core.get_user_memberships()
RETURNS TABLE (
  membership_id UUID,
  organization_id UUID,
  organization_name TEXT,
  organization_industry_type TEXT,
  organization_slug TEXT,
  organization_settings JSONB,
  organization_is_active BOOLEAN,
  organization_public_code TEXT,
  role core.member_role,
  staff_id UUID,
  parent_customer_id UUID,
  is_active BOOLEAN,
  joined_at TIMESTAMPTZ,
  is_current_context BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
DECLARE
  v_active_membership_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.active_membership_id
  INTO v_active_membership_id
  FROM core.profiles p
  WHERE p.id = auth.uid();

  RETURN QUERY
  SELECT
    om.id AS membership_id,
    om.organization_id,
    o.name AS organization_name,
    o.industry_type AS organization_industry_type,
    o.slug AS organization_slug,
    o.settings AS organization_settings,
    o.is_active AS organization_is_active,
    o.public_code::text AS organization_public_code,
    om.role,
    om.staff_id,
    om.parent_customer_id,
    om.is_active,
    om.joined_at,
    (om.id = v_active_membership_id) AS is_current_context
  FROM core.organization_members om
  INNER JOIN core.organizations o ON o.id = om.organization_id
  WHERE om.user_id = auth.uid()
    AND om.is_active = true
    AND o.is_active = true
  ORDER BY
    (om.id = v_active_membership_id) DESC,
    om.joined_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION core.get_user_memberships() TO authenticated;
REVOKE EXECUTE ON FUNCTION core.get_user_memberships() FROM anon;
