-- =============================================================================
-- Moa v2: Account Linking & Token RPC Security Hardening
--
-- 1. core.link_toss_customer_by_phone:
--    - Revoke execute from authenticated & anon (service_role only).
--    - Defense-in-depth: enforce auth.role() = 'service_role' (or superuser/internal).
--    - Guard against account hijacking (preserve existing claimed customers).
--    - Scope staff role check to customer's tenant and verify is_active = true.
--    - Add optional p_org_id tenant scope filter.
-- 2. core.claim_store_token_v2:
--    - Enforce issuer_type = 'STORE' (disallow staff invite / customer QR tokens).
--    - Scope customer lookup to token tenant (organization_id = v_token_rec.tenant_id).
--    - Atomic hijack defense: atomically persist failed attempts to enforce max_attempts rate limiting.
-- 3. core.claim_store_token (v1):
--    - Enforce issuer_type = 'STORE'.
--    - Scope customer lookup to token tenant (organization_id = v_token_rec.tenant_id).
--    - Ensure public wrapper has search_path set.
-- 4. core.consume_customer_qr:
--    - Enforce issuer_type = 'CUSTOMER' (prevent cross-purpose token consumption).
-- 5. core.claim_staff_invite:
--    - Enforce issuer_type = 'STORE_STAFF_INVITE'.
--    - Preserve existing 'owner' role if claimed by store owner (prevent privilege demotion).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Harden core.link_toss_customer_by_phone
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS core.link_toss_customer_by_phone(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION core.link_toss_customer_by_phone(
  p_user_id UUID,
  p_toss_user_key TEXT,
  p_phone TEXT,
  p_org_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_role TEXT;
  v_norm_phone TEXT;
  v_cust_rec RECORD;
  v_is_staff BOOLEAN := false;
BEGIN
  -- Defense-in-depth: direct calls from authenticated/anon clients are strictly blocked.
  -- Only service_role (invoked via Edge Function) or superuser/maintenance can execute.
  v_role := auth.role();
  IF v_role IS NOT NULL AND v_role <> 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: service_role required';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  v_norm_phone := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');

  IF v_norm_phone <> '' THEN
    SELECT * INTO v_cust_rec
    FROM core.customers
    WHERE (p_org_id IS NULL OR organization_id = p_org_id)
      AND regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = v_norm_phone
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      -- Account hijacking defense: do not overwrite if already claimed by another user
      IF v_cust_rec.auth_user_id IS NOT NULL AND v_cust_rec.auth_user_id <> p_user_id THEN
        RAISE EXCEPTION 'Account already claimed by another user (hijack defense)';
      END IF;

      UPDATE core.customers
      SET auth_user_id = p_user_id,
          user_id = COALESCE(user_id, p_user_id),
          metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{toss_user_key}',
            to_jsonb(p_toss_user_key)
          ),
          identity_verified_at = COALESCE(identity_verified_at, now()),
          verification_method = COALESCE(verification_method, 'OAUTH_VERIFIED'),
          updated_at = now()
      WHERE id = v_cust_rec.id;
    END IF;
  END IF;

  -- Verify active staff status scoped strictly to the linked customer's organization
  IF v_cust_rec.organization_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM core.organization_members
      WHERE user_id = p_user_id
        AND organization_id = v_cust_rec.organization_id
        AND is_active = true
    ) INTO v_is_staff;
  ELSE
    v_is_staff := false;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'linked_customer_id', v_cust_rec.id,
    'organization_id', v_cust_rec.organization_id,
    'is_staff', v_is_staff
  );
END;
$$;

-- Revoke execution from regular clients; grant strictly to service_role and postgres
REVOKE ALL ON FUNCTION core.link_toss_customer_by_phone(UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION core.link_toss_customer_by_phone(UUID, TEXT, TEXT, UUID) TO postgres, service_role;


-- -----------------------------------------------------------------------------
-- 2. Harden core.claim_store_token_v2
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.claim_store_token_v2(p_raw_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_token_trimmed TEXT := btrim(COALESCE(p_raw_token, ''));
  v_hash TEXT;
  v_token_rec RECORD;
  v_cust_auth UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_token_trimmed = '' THEN
    RAISE EXCEPTION 'Token is required';
  END IF;

  v_hash := encode(sha256(convert_to(v_token_trimmed, 'UTF8')), 'hex');

  -- Must be issuer_type = 'STORE', unused, unexpired
  SELECT * INTO v_token_rec
  FROM core.onboarding_tokens
  WHERE (token_hash = v_hash OR claim_token = v_token_trimmed)
    AND issuer_type = 'STORE'
    AND is_used = false
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;

  -- Rate limit: attempt count check
  IF v_token_rec.attempt_count >= v_token_rec.max_attempts THEN
    UPDATE core.onboarding_tokens
    SET is_used = true
    WHERE id = v_token_rec.id;
    RETURN jsonb_build_object(
      'success', false,
      'status', 'MAX_ATTEMPTS_EXCEEDED',
      'error', 'Token maximum attempts exceeded'
    );
  END IF;

  IF v_token_rec.customer_id IS NULL THEN
    RAISE EXCEPTION 'Token is not bound to a customer';
  END IF;

  -- Strict tenant scoping: customer must belong to token tenant_id
  SELECT auth_user_id INTO v_cust_auth
  FROM core.customers
  WHERE id = v_token_rec.customer_id
    AND organization_id = v_token_rec.tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target customer not found in tenant';
  END IF;

  -- Hijack defense: Customer already claimed by another user.
  -- Persist attempt_count increment so repeated unauthorized attempts are bounded!
  IF v_cust_auth IS NOT NULL AND v_cust_auth <> v_uid THEN
    UPDATE core.onboarding_tokens
    SET attempt_count = attempt_count + 1,
        is_used = CASE WHEN attempt_count + 1 >= max_attempts THEN true ELSE is_used END
    WHERE id = v_token_rec.id;

    RETURN jsonb_build_object(
      'success', false,
      'status', 'BLOCKED_ALREADY_CLAIMED',
      'error', 'Account already claimed (hijack defense)'
    );
  END IF;

  -- Atomic claim
  UPDATE core.customers
  SET auth_user_id = v_uid,
      user_id = COALESCE(user_id, v_uid),
      identity_verified_at = now(),
      verification_method = 'ONSITE_QR',
      updated_at = now()
  WHERE id = v_token_rec.customer_id
    AND organization_id = v_token_rec.tenant_id;

  UPDATE core.onboarding_tokens
  SET is_used = true,
      attempt_count = attempt_count + 1
  WHERE id = v_token_rec.id;

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_token_rec.tenant_id,
    'customer_id', v_token_rec.customer_id,
    'verification_method', 'ONSITE_QR'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_store_token_v2(p_raw_token TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT core.claim_store_token_v2(p_raw_token);
$$;

GRANT EXECUTE ON FUNCTION core.claim_store_token_v2(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_store_token_v2(TEXT) TO authenticated;


-- -----------------------------------------------------------------------------
-- 3. Harden core.claim_store_token (v1)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.claim_store_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_token_rec RECORD;
  v_cust_auth UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_token_rec
  FROM core.onboarding_tokens
  WHERE claim_token = p_token
    AND issuer_type = 'STORE'
    AND is_used = false
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;

  IF v_token_rec.customer_id IS NULL THEN
    RAISE EXCEPTION 'Token is not bound to a customer';
  END IF;

  -- Scope customer lookup to token tenant_id
  SELECT auth_user_id INTO v_cust_auth
  FROM core.customers
  WHERE id = v_token_rec.customer_id
    AND organization_id = v_token_rec.tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target customer not found in tenant';
  END IF;

  IF v_cust_auth IS NOT NULL AND v_cust_auth <> v_uid THEN
    RAISE EXCEPTION 'Account already claimed (hijack defense)';
  END IF;

  UPDATE core.customers
  SET auth_user_id = v_uid,
      user_id = COALESCE(user_id, v_uid),
      updated_at = now()
  WHERE id = v_token_rec.customer_id
    AND organization_id = v_token_rec.tenant_id;

  UPDATE core.onboarding_tokens
  SET is_used = true,
      attempt_count = attempt_count + 1
  WHERE id = v_token_rec.id;

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_token_rec.tenant_id,
    'customer_id', v_token_rec.customer_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_store_token(p_token TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT core.claim_store_token(p_token);
$$;

GRANT EXECUTE ON FUNCTION core.claim_store_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_store_token(TEXT) TO authenticated;


-- -----------------------------------------------------------------------------
-- 4. Harden core.consume_customer_qr
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.consume_customer_qr(p_token TEXT, p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_token_rec RECORD;
  v_is_self BOOLEAN;
  v_name TEXT;
  v_phone TEXT;
  v_email TEXT;
  v_token_user_id UUID;
  v_customer_id UUID;
  v_parent_customer_id UUID;
  v_child_customer_id UUID;
  v_child_elem JSONB;
  v_child_name TEXT;
  v_child_phone TEXT;
  v_child_ids JSONB := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL OR NOT (core.is_org_admin(p_tenant_id) OR core.is_org_member(p_tenant_id)) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_token_rec
  FROM core.onboarding_tokens
  WHERE claim_token = p_token
    AND tenant_id = p_tenant_id
    AND issuer_type = 'CUSTOMER'
    AND is_used = false
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;

  v_is_self := COALESCE((v_token_rec.payload->>'is_self')::boolean, true);
  v_name := COALESCE(NULLIF(trim(v_token_rec.payload->>'name'), ''), '고객');
  v_phone := NULLIF(trim(v_token_rec.payload->>'phone'), '');
  v_email := NULLIF(trim(v_token_rec.payload->>'email'), '');
  v_token_user_id := NULLIF(v_token_rec.payload->>'auth_user_id', '')::UUID;

  IF v_is_self THEN
    INSERT INTO core.customers (
      organization_id, name, phone, email, auth_user_id, user_id, status
    ) VALUES (
      p_tenant_id, v_name, v_phone, v_email, v_token_user_id, v_token_user_id, 'active'
    ) RETURNING id INTO v_customer_id;
  ELSE
    -- Guardian / Parent customer
    INSERT INTO core.customers (
      organization_id, name, phone, email, auth_user_id, user_id, status
    ) VALUES (
      p_tenant_id, v_name, v_phone, v_email, v_token_user_id, v_token_user_id, 'active'
    ) RETURNING id INTO v_parent_customer_id;

    v_customer_id := v_parent_customer_id;

    -- Children enrollment
    FOR v_child_elem IN SELECT * FROM jsonb_array_elements(COALESCE(v_token_rec.payload->'children', '[]'::jsonb)) LOOP
      v_child_name := COALESCE(NULLIF(trim(v_child_elem->>'name'), ''), '자녀');
      v_child_phone := NULLIF(trim(v_child_elem->>'phone'), '');

      INSERT INTO core.customers (
        organization_id, name, phone, status
      ) VALUES (
        p_tenant_id, v_child_name, v_child_phone, 'active'
      ) RETURNING id INTO v_child_customer_id;

      INSERT INTO core.parent_student_links (
        organization_id, parent_customer_id, student_customer_id, relationship
      ) VALUES (
        p_tenant_id, v_parent_customer_id, v_child_customer_id, 'other'
      ) ON CONFLICT DO NOTHING;

      v_child_ids := v_child_ids || jsonb_build_array(v_child_customer_id);
    END LOOP;
  END IF;

  UPDATE core.onboarding_tokens
  SET is_used = true,
      customer_id = v_customer_id
  WHERE id = v_token_rec.id;

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'customer_id', v_customer_id,
    'child_customer_ids', v_child_ids
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_customer_qr(p_token TEXT, p_tenant_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT core.consume_customer_qr(p_token, p_tenant_id);
$$;

GRANT EXECUTE ON FUNCTION core.consume_customer_qr(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_customer_qr(TEXT, UUID) TO authenticated;


-- -----------------------------------------------------------------------------
-- 5. Harden core.claim_staff_invite (Preserve owner role on conflict)
-- -----------------------------------------------------------------------------
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
  -- Prevent privilege demotion: if the user is already an 'owner', DO NOT overwrite with 'staff'
  INSERT INTO core.organization_members (
    organization_id, user_id, role, custom_role_id, token_version, is_active
  ) VALUES (
    v_token_rec.tenant_id, v_uid, 'staff', v_role_id, 1, true
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role = CASE WHEN core.organization_members.role = 'owner' THEN 'owner' ELSE 'staff' END,
    custom_role_id = CASE WHEN core.organization_members.role = 'owner' THEN core.organization_members.custom_role_id ELSE EXCLUDED.custom_role_id END,
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

CREATE OR REPLACE FUNCTION public.claim_staff_invite(p_token TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT core.claim_staff_invite(p_token);
$$;

GRANT EXECUTE ON FUNCTION core.claim_staff_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_staff_invite(TEXT) TO authenticated;

COMMIT;
