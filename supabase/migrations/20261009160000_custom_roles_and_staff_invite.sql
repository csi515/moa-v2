-- =============================================================================
-- Moa v2: Custom Tenant Roles (RBAC), 1-Time QR Staff Invite & Token Version Revocation
-- =============================================================================

BEGIN;

-- 1. tenant_roles table
CREATE TABLE IF NOT EXISTS core.tenant_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rank_order INT NOT NULL DEFAULT 1,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tenant_roles_tenant
  ON core.tenant_roles(tenant_id);

-- 2. Expand organization_members with custom_role_id and token_version
ALTER TABLE core.organization_members
  ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES core.tenant_roles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1;

-- 3. Enable RLS on tenant_roles
ALTER TABLE core.tenant_roles ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for tenant_roles
DROP POLICY IF EXISTS tenant_roles_member_select ON core.tenant_roles;
CREATE POLICY tenant_roles_member_select ON core.tenant_roles
  FOR SELECT TO authenticated
  USING (core.is_org_member(tenant_id));

DROP POLICY IF EXISTS tenant_roles_admin_all ON core.tenant_roles;
CREATE POLICY tenant_roles_admin_all ON core.tenant_roles
  FOR ALL TO authenticated
  USING (core.is_org_admin(tenant_id))
  WITH CHECK (core.is_org_admin(tenant_id));

-- 5. Atomic RPC: claim_staff_invite
CREATE OR REPLACE FUNCTION core.claim_staff_invite(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_token_rec RECORD;
  v_role_id UUID;
  v_role_name TEXT := '직원';
  v_custom_role RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_token_rec
  FROM core.onboarding_tokens
  WHERE claim_token = p_token
    AND issuer_type = 'STORE_STAFF_INVITE'
    AND is_used = false
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired staff invite token';
  END IF;

  -- Parse custom role from payload if present
  v_role_id := NULLIF(v_token_rec.payload->>'role_id', '')::UUID;
  IF v_role_id IS NOT NULL THEN
    SELECT * INTO v_custom_role
    FROM core.tenant_roles
    WHERE id = v_role_id AND tenant_id = v_token_rec.tenant_id;

    IF FOUND THEN
      v_role_name := v_custom_role.name;
    ELSE
      v_role_id := NULL;
    END IF;
  END IF;

  -- Atomic UPSERT into organization_members
  INSERT INTO core.organization_members (
    organization_id, user_id, role, custom_role_id, token_version, is_active
  ) VALUES (
    v_token_rec.tenant_id, v_uid, 'staff', v_role_id, 1, true
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role = 'staff',
    custom_role_id = EXCLUDED.custom_role_id,
    token_version = core.organization_members.token_version + 1,
    is_active = true,
    updated_at = now();

  -- Invalidate token
  UPDATE core.onboarding_tokens
  SET is_used = true
  WHERE id = v_token_rec.id;

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_token_rec.tenant_id,
    'role_name', v_role_name
  );
END;
$$;

-- 6. Atomic RPC: revoke_member_access (token_version increment for immediate session invalidation)
CREATE OR REPLACE FUNCTION core.revoke_member_access(p_member_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_member RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_member
  FROM core.organization_members
  WHERE id = p_member_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  -- Verify caller is admin/owner of the organization
  IF NOT core.is_org_admin(v_member.organization_id) THEN
    RAISE EXCEPTION 'Permission denied: owner or admin required';
  END IF;

  -- Owner access cannot be revoked via this endpoint
  IF v_member.role = 'owner' THEN
    RAISE EXCEPTION 'Cannot revoke owner access';
  END IF;

  UPDATE core.organization_members
  SET is_active = false,
      token_version = token_version + 1,
      updated_at = now()
  WHERE id = p_member_id;

  RETURN jsonb_build_object(
    'success', true,
    'member_id', p_member_id
  );
END;
$$;

-- 7. Expose functions to public schema
CREATE OR REPLACE FUNCTION public.claim_staff_invite(p_token TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT core.claim_staff_invite(p_token);
$$;

CREATE OR REPLACE FUNCTION public.revoke_member_access(p_member_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT core.revoke_member_access(p_member_id);
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION core.claim_staff_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.revoke_member_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_staff_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_member_access(UUID) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON core.tenant_roles TO authenticated;

COMMIT;
