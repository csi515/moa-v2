-- Enable RLS on core.parent_invitations (was created without RLS on remote)

ALTER TABLE core.parent_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parent_invitations_select ON core.parent_invitations;
DROP POLICY IF EXISTS parent_invitations_insert ON core.parent_invitations;
DROP POLICY IF EXISTS parent_invitations_update ON core.parent_invitations;
DROP POLICY IF EXISTS parent_invitations_delete ON core.parent_invitations;

-- Admin: full org scope; invited parent: read own invitation by email
CREATE POLICY parent_invitations_select ON core.parent_invitations
  FOR SELECT TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR lower(email) = lower((SELECT email FROM core.profiles WHERE id = auth.uid()))
  );

CREATE POLICY parent_invitations_insert ON core.parent_invitations
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY parent_invitations_update ON core.parent_invitations
  FOR UPDATE TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY parent_invitations_delete ON core.parent_invitations
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON core.parent_invitations TO authenticated;
