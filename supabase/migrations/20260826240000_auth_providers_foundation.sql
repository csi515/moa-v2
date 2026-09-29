-- Phase 5: Auth providers foundation (OAuth-ready, no OAuth integration yet)
-- Decouple parent matching from profile.email-only lookups

DO $$ BEGIN
  CREATE TYPE core.auth_provider_type AS ENUM (
    'email',
    'phone',
    'kakao',
    'naver',
    'google',
    'apple'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS core.auth_providers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES core.profiles(id) ON DELETE CASCADE,
  provider         core.auth_provider_type NOT NULL,
  provider_user_id TEXT NOT NULL,
  email            TEXT,
  phone            TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}',
  verified_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_auth_providers_user ON core.auth_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_providers_email ON core.auth_providers(lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auth_providers_phone ON core.auth_providers(phone) WHERE phone IS NOT NULL;

DROP TRIGGER IF EXISTS set_updated_at ON core.auth_providers;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON core.auth_providers
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE core.auth_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_providers_self_select ON core.auth_providers;
CREATE POLICY auth_providers_self_select ON core.auth_providers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS auth_providers_self_insert ON core.auth_providers;
CREATE POLICY auth_providers_self_insert ON core.auth_providers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS auth_providers_self_update ON core.auth_providers;
CREATE POLICY auth_providers_self_update ON core.auth_providers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON core.auth_providers TO authenticated;

-- =============================================
-- Identity helpers
-- =============================================
CREATE OR REPLACE FUNCTION core.normalize_identity_email(p_email TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(lower(trim(p_email)), '');
$$;

CREATE OR REPLACE FUNCTION core.user_identity_matches_email(p_user_id UUID, p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT
    core.normalize_identity_email(p_email) IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM core.auth_providers ap
        WHERE ap.user_id = p_user_id
          AND core.normalize_identity_email(ap.email) = core.normalize_identity_email(p_email)
      )
      OR EXISTS (
        SELECT 1 FROM core.profiles p
        WHERE p.id = p_user_id
          AND core.normalize_identity_email(p.email) = core.normalize_identity_email(p_email)
      )
    );
$$;

CREATE OR REPLACE FUNCTION core.find_user_id_by_identity_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT candidate.user_id
  FROM (
    SELECT ap.user_id, 1 AS priority
    FROM core.auth_providers ap
    WHERE core.normalize_identity_email(ap.email) = core.normalize_identity_email(p_email)
    UNION ALL
    SELECT p.id, 2 AS priority
    FROM core.profiles p
    WHERE core.normalize_identity_email(p.email) = core.normalize_identity_email(p_email)
  ) candidate
  ORDER BY candidate.priority
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION core.sync_auth_providers_for_user(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_profile RECORD;
  v_auth_email TEXT;
  v_count INT := 0;
BEGIN
  IF p_user_id IS NULL THEN RETURN 0; END IF;

  SELECT * INTO v_profile FROM core.profiles WHERE id = p_user_id;
  SELECT email INTO v_auth_email FROM auth.users WHERE id = p_user_id;

  IF core.normalize_identity_email(v_profile.email) IS NOT NULL THEN
    INSERT INTO core.auth_providers (user_id, provider, provider_user_id, email, verified_at)
    VALUES (
      p_user_id,
      'email',
      core.normalize_identity_email(v_profile.email),
      core.normalize_identity_email(v_profile.email),
      now()
    )
    ON CONFLICT (provider, provider_user_id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      email = EXCLUDED.email,
      verified_at = COALESCE(core.auth_providers.verified_at, EXCLUDED.verified_at),
      updated_at = now();
    v_count := v_count + 1;
  ELSIF core.normalize_identity_email(v_auth_email) IS NOT NULL THEN
    INSERT INTO core.auth_providers (user_id, provider, provider_user_id, email, verified_at)
    VALUES (
      p_user_id,
      'email',
      core.normalize_identity_email(v_auth_email),
      core.normalize_identity_email(v_auth_email),
      now()
    )
    ON CONFLICT (provider, provider_user_id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      email = EXCLUDED.email,
      verified_at = COALESCE(core.auth_providers.verified_at, EXCLUDED.verified_at),
      updated_at = now();
    v_count := v_count + 1;
  END IF;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION core.sync_auth_providers_on_login()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_user_id UUID;
  v_synced INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('synced', 0);
  END IF;

  v_synced := core.sync_auth_providers_for_user(v_user_id);

  RETURN jsonb_build_object('synced', v_synced);
END;
$$;

GRANT EXECUTE ON FUNCTION core.sync_auth_providers_on_login() TO authenticated;
GRANT EXECUTE ON FUNCTION core.sync_auth_providers_for_user(UUID) TO authenticated;

-- Future OAuth linking (not used by client yet)
CREATE OR REPLACE FUNCTION core.register_auth_provider(
  p_provider core.auth_provider_type,
  p_provider_user_id TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_user_id UUID;
  v_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_provider_user_id IS NULL OR trim(p_provider_user_id) = '' THEN
    RAISE EXCEPTION 'provider_user_id is required';
  END IF;

  INSERT INTO core.auth_providers (
    user_id, provider, provider_user_id, email, phone, metadata, verified_at
  )
  VALUES (
    v_user_id,
    p_provider,
    trim(p_provider_user_id),
    core.normalize_identity_email(p_email),
    NULLIF(trim(p_phone), ''),
    COALESCE(p_metadata, '{}'::JSONB),
    now()
  )
  ON CONFLICT (provider, provider_user_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    email = COALESCE(EXCLUDED.email, core.auth_providers.email),
    phone = COALESCE(EXCLUDED.phone, core.auth_providers.phone),
    metadata = core.auth_providers.metadata || EXCLUDED.metadata,
    verified_at = COALESCE(core.auth_providers.verified_at, EXCLUDED.verified_at),
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'id', v_id,
    'provider', p_provider,
    'provider_user_id', trim(p_provider_user_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.register_auth_provider(
  core.auth_provider_type, TEXT, TEXT, TEXT, JSONB
) TO authenticated;

-- =============================================
-- Signup trigger: seed email auth_provider
-- =============================================
CREATE OR REPLACE FUNCTION core.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  INSERT INTO core.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = now();

  PERFORM core.sync_auth_providers_for_user(NEW.id);

  RETURN NEW;
END;
$$;

-- =============================================
-- connect_parent_on_login: identity-based matching
-- =============================================
CREATE OR REPLACE FUNCTION core.connect_parent_on_login()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_user_id UUID;
  v_inv RECORD;
  v_parent RECORD;
  v_connected INT := 0;
  v_results JSONB := '[]'::JSONB;
  v_global_parent_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('connected', 0, 'memberships', v_results); END IF;

  PERFORM core.sync_auth_providers_for_user(v_user_id);

  FOR v_inv IN
    SELECT pi.*, c.name, c.phone
    FROM core.parent_invitations pi
    JOIN core.customers c ON c.id = pi.parent_customer_id
    WHERE pi.status = 'pending'
      AND core.user_identity_matches_email(v_user_id, pi.email)
  LOOP
    UPDATE core.customers SET user_id = v_user_id, updated_at = now()
    WHERE id = v_inv.parent_customer_id AND organization_id = v_inv.organization_id;

    INSERT INTO core.parents (id, user_id, name, phone, email)
    VALUES (v_inv.parent_customer_id, v_user_id, v_inv.name, v_inv.phone, v_inv.email)
    ON CONFLICT (id) DO UPDATE SET user_id = v_user_id, updated_at = now()
    RETURNING id INTO v_global_parent_id;

    INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id)
    VALUES (v_global_parent_id, v_inv.organization_id, v_inv.parent_customer_id)
    ON CONFLICT (customer_id) DO UPDATE SET parent_id = EXCLUDED.parent_id, updated_at = now();

    PERFORM core.sync_guardians_for_parent_org(v_global_parent_id, v_inv.organization_id);

    UPDATE core.parent_invitations SET status = 'accepted', accepted_at = now() WHERE id = v_inv.id;

    v_connected := v_connected + 1;
    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'organization_id', v_inv.organization_id,
      'parent_customer_id', v_inv.parent_customer_id
    ));
  END LOOP;

  FOR v_parent IN
    SELECT c.*
    FROM core.customers c
    WHERE c.metadata->>'entityType' = 'parent'
      AND c.user_id IS NULL
      AND core.user_identity_matches_email(v_user_id, c.email)
  LOOP
    UPDATE core.customers SET user_id = v_user_id, updated_at = now()
    WHERE id = v_parent.id;

    INSERT INTO core.parents (id, user_id, name, phone, email)
    VALUES (v_parent.id, v_user_id, v_parent.name, v_parent.phone, v_parent.email)
    ON CONFLICT (id) DO UPDATE SET user_id = v_user_id, updated_at = now()
    RETURNING id INTO v_global_parent_id;

    INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id)
    VALUES (v_global_parent_id, v_parent.organization_id, v_parent.id)
    ON CONFLICT (customer_id) DO UPDATE SET parent_id = EXCLUDED.parent_id, updated_at = now();

    PERFORM core.sync_guardians_for_parent_org(v_global_parent_id, v_parent.organization_id);
  END LOOP;

  PERFORM core.ensure_global_parent_profile();

  RETURN jsonb_build_object('connected', v_connected, 'memberships', v_results);
END;
$$;

-- =============================================
-- invite_parent_member: identity lookup for auto-connect
-- =============================================
CREATE OR REPLACE FUNCTION core.invite_parent_member(
  p_org_id UUID,
  p_parent_customer_id UUID,
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_email TEXT;
  v_parent RECORD;
  v_org_name TEXT;
  v_profile_id UUID;
  v_invitation_id UUID;
  v_global_parent_id UUID;
  v_link_codes JSONB := '[]'::JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_email := core.normalize_identity_email(p_email);
  IF v_email IS NULL OR v_email NOT LIKE '%@%' THEN
    RAISE EXCEPTION 'Valid email is required';
  END IF;

  SELECT * INTO v_parent
  FROM core.customers
  WHERE id = p_parent_customer_id AND organization_id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent not found';
  END IF;

  SELECT name INTO v_org_name FROM core.organizations WHERE id = p_org_id;

  UPDATE core.customers SET email = v_email, updated_at = now()
  WHERE id = p_parent_customer_id;

  INSERT INTO core.parents (id, user_id, name, phone, email)
  VALUES (p_parent_customer_id, v_parent.user_id, v_parent.name, v_parent.phone, v_email)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    updated_at = now()
  RETURNING id INTO v_global_parent_id;

  INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id)
  VALUES (v_global_parent_id, p_org_id, p_parent_customer_id)
  ON CONFLICT (customer_id) DO UPDATE SET parent_id = EXCLUDED.parent_id, updated_at = now();

  IF v_parent.user_id IS NOT NULL THEN
    UPDATE core.parents SET user_id = v_parent.user_id, updated_at = now()
    WHERE id = v_global_parent_id;

    PERFORM core.sync_guardians_for_parent_org(v_global_parent_id, p_org_id);

    RETURN jsonb_build_object(
      'status', 'connected',
      'parent_customer_id', p_parent_customer_id,
      'user_id', v_parent.user_id,
      'organization_name', v_org_name,
      'link_codes', '[]'::JSONB
    );
  END IF;

  v_profile_id := core.find_user_id_by_identity_email(v_email);

  IF v_profile_id IS NOT NULL THEN
    UPDATE core.customers SET user_id = v_profile_id, updated_at = now()
    WHERE id = p_parent_customer_id;

    UPDATE core.parents SET user_id = v_profile_id, updated_at = now()
    WHERE id = v_global_parent_id;

    UPDATE core.parent_invitations SET status = 'accepted', accepted_at = now()
    WHERE organization_id = p_org_id AND parent_customer_id = p_parent_customer_id;

    PERFORM core.sync_guardians_for_parent_org(v_global_parent_id, p_org_id);

    RETURN jsonb_build_object(
      'status', 'connected',
      'parent_customer_id', p_parent_customer_id,
      'user_id', v_profile_id,
      'organization_name', v_org_name,
      'link_codes', '[]'::JSONB
    );
  END IF;

  INSERT INTO core.parent_invitations (organization_id, parent_customer_id, email, role, invited_by, status)
  VALUES (p_org_id, p_parent_customer_id, v_email, 'parent', auth.uid(), 'pending')
  ON CONFLICT (organization_id, parent_customer_id)
  DO UPDATE SET email = EXCLUDED.email, status = 'pending', invited_by = EXCLUDED.invited_by, accepted_at = NULL
  RETURNING id INTO v_invitation_id;

  v_link_codes := core.create_parent_invite_link_tokens(p_org_id, p_parent_customer_id, 14);

  RETURN jsonb_build_object(
    'status', 'invited',
    'parent_customer_id', p_parent_customer_id,
    'invitation_id', v_invitation_id,
    'email', v_email,
    'organization_name', v_org_name,
    'link_codes', v_link_codes
  );
END;
$$;

-- Backfill email providers from existing profiles
INSERT INTO core.auth_providers (user_id, provider, provider_user_id, email, verified_at)
SELECT p.id, 'email', core.normalize_identity_email(p.email), core.normalize_identity_email(p.email), now()
FROM core.profiles p
WHERE core.normalize_identity_email(p.email) IS NOT NULL
ON CONFLICT (provider, provider_user_id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  email = EXCLUDED.email,
  updated_at = now();
