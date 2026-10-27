-- =============================================================================
-- Moa v2: Integrated Operations & Hybrid RBAC Migration
-- File: 20261009190000_integrated_operations_and_rbac.sql
-- =============================================================================

BEGIN;

-- 1. Ensure core.tenant_roles exists
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

-- 2. Expand organization_members with custom_role_id, token_version, is_active
ALTER TABLE core.organization_members
  ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES core.tenant_roles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 3. Create core.web_push_subscriptions for 0-cost Web Push (VAPID)
CREATE TABLE IF NOT EXISTS core.web_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES core.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_user
  ON core.web_push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_tenant
  ON core.web_push_subscriptions(tenant_id);

-- 4. Create core.passes for member passes & passes capability
CREATE TABLE IF NOT EXISTS core.passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES core.customers(id) ON DELETE CASCADE,
  pass_name TEXT NOT NULL,
  pass_type TEXT NOT NULL DEFAULT 'COUNT_BASED',
  total_count INT NOT NULL DEFAULT 10,
  remaining_count INT NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '90 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_passes_tenant
  ON core.passes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_passes_customer
  ON core.passes(customer_id);

-- 5. Expand core.lockers with start_date & expires_at for status badges
ALTER TABLE core.lockers
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS expires_at DATE;

-- 6. Enable RLS on newly defined or expanded tables
ALTER TABLE core.tenant_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.web_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.lockers ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies
DROP POLICY IF EXISTS tenant_roles_member_select ON core.tenant_roles;
CREATE POLICY tenant_roles_member_select ON core.tenant_roles
  FOR SELECT TO authenticated
  USING (core.is_org_member(tenant_id));

DROP POLICY IF EXISTS tenant_roles_admin_all ON core.tenant_roles;
CREATE POLICY tenant_roles_admin_all ON core.tenant_roles
  FOR ALL TO authenticated
  USING (core.is_org_admin(tenant_id))
  WITH CHECK (core.is_org_admin(tenant_id));

DROP POLICY IF EXISTS web_push_subscriptions_user_all ON core.web_push_subscriptions;
CREATE POLICY web_push_subscriptions_user_all ON core.web_push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS passes_member_all ON core.passes;
CREATE POLICY passes_member_all ON core.passes
  FOR ALL TO authenticated
  USING (core.is_org_member(tenant_id))
  WITH CHECK (core.is_org_member(tenant_id));

DROP POLICY IF EXISTS lockers_member_all ON core.lockers;
CREATE POLICY lockers_member_all ON core.lockers
  FOR ALL TO authenticated
  USING (core.is_org_member(tenant_id))
  WITH CHECK (core.is_org_member(tenant_id));

-- Public store landing page (/p/:slug) anonymous access
DROP POLICY IF EXISTS organizations_public_slug_select ON core.organizations;
CREATE POLICY organizations_public_slug_select ON core.organizations
  FOR SELECT TO anon, authenticated
  USING (slug IS NOT NULL AND is_active = true);

DROP POLICY IF EXISTS tenant_operating_hours_public_select ON core.tenant_operating_hours;
CREATE POLICY tenant_operating_hours_public_select ON core.tenant_operating_hours
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM core.organizations o
    WHERE o.id = tenant_operating_hours.tenant_id
      AND o.slug IS NOT NULL
      AND o.is_active = true
  ));

-- 8. Atomic RPC: claim_staff_invite
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
    RAISE EXCEPTION 'Token not found, already used, or expired';
  END IF;

  -- Ensure caller profile exists
  INSERT INTO core.profiles (id, email)
  VALUES (v_uid, auth.jwt()->>'email')
  ON CONFLICT (id) DO NOTHING;

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

-- 9. Atomic RPC: deduct_pass_atomic
CREATE OR REPLACE FUNCTION core.deduct_pass_atomic(p_pass_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_pass RECORD;
  v_new_count INT;
  v_new_status TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_pass
  FROM core.passes
  WHERE id = p_pass_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pass not found';
  END IF;

  -- Verify membership in tenant
  IF NOT core.is_org_member(v_pass.tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Verify active status
  IF v_pass.is_active IS NOT TRUE OR v_pass.status = 'PAUSED' THEN
    RAISE EXCEPTION 'Pass is not active or is paused';
  END IF;

  -- Verify expiration date
  IF v_pass.expires_at < CURRENT_DATE THEN
    UPDATE core.passes
    SET status = 'EXPIRED', updated_at = now()
    WHERE id = p_pass_id;
    RAISE EXCEPTION 'Pass has expired';
  END IF;

  -- Verify remaining count
  IF v_pass.pass_type != 'PERIOD_BASED' AND v_pass.remaining_count <= 0 THEN
    UPDATE core.passes
    SET status = 'EXHAUSTED', updated_at = now()
    WHERE id = p_pass_id;
    RAISE EXCEPTION 'No remaining pass count';
  END IF;

  -- Deduct usage
  IF v_pass.pass_type = 'PERIOD_BASED' THEN
    v_new_count := v_pass.remaining_count;
    v_new_status := 'ACTIVE';
  ELSE
    v_new_count := GREATEST(0, v_pass.remaining_count - 1);
    v_new_status := CASE WHEN v_new_count = 0 THEN 'EXHAUSTED' ELSE 'ACTIVE' END;
  END IF;

  UPDATE core.passes
  SET remaining_count = v_new_count,
      status = v_new_status,
      updated_at = now()
  WHERE id = p_pass_id;

  RETURN jsonb_build_object(
    'success', true,
    'remaining_count', v_new_count,
    'status', v_new_status
  );
END;
$$;

-- 10. Expose wrappers in public schema
CREATE OR REPLACE FUNCTION public.claim_staff_invite(p_token TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT core.claim_staff_invite(p_token);
$$;

CREATE OR REPLACE FUNCTION public.deduct_pass_atomic(p_pass_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT core.deduct_pass_atomic(p_pass_id);
$$;

-- 11. Permissions grant
GRANT EXECUTE ON FUNCTION core.claim_staff_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.deduct_pass_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_staff_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_pass_atomic(UUID) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON core.tenant_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.web_push_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.passes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.lockers TO authenticated;

COMMIT;
