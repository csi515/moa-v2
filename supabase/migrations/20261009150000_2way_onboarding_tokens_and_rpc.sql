-- =============================================================================
-- Moa v2: 2-Way Onboarding Tokens, Tenant Operating Hours & Atomic RPC
-- =============================================================================

BEGIN;

-- 1. Ensure core.customers has auth_user_id
ALTER TABLE core.customers
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_core_customers_auth_user_id
  ON core.customers(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- 2. onboarding_tokens table
CREATE TABLE IF NOT EXISTS core.onboarding_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  issuer_type TEXT NOT NULL CHECK (issuer_type IN ('STORE', 'CUSTOMER', 'STORE_STAFF_INVITE')),
  claim_token TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES core.customers(id) ON DELETE CASCADE,
  payload JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_tokens_claim_token
  ON core.onboarding_tokens(claim_token);
CREATE INDEX IF NOT EXISTS idx_onboarding_tokens_tenant
  ON core.onboarding_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tokens_customer
  ON core.onboarding_tokens(customer_id);

-- 3. tenant_operating_hours table
CREATE TABLE IF NOT EXISTS core.tenant_operating_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  day_type TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_minutes INT DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_operating_hours_tenant
  ON core.tenant_operating_hours(tenant_id);

-- 4. Enable RLS
ALTER TABLE core.onboarding_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.tenant_operating_hours ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for onboarding_tokens
DROP POLICY IF EXISTS onboarding_tokens_staff_all ON core.onboarding_tokens;
CREATE POLICY onboarding_tokens_staff_all ON core.onboarding_tokens
  FOR ALL TO authenticated
  USING (core.is_org_member(tenant_id))
  WITH CHECK (core.is_org_member(tenant_id));

DROP POLICY IF EXISTS onboarding_tokens_customer_select ON core.onboarding_tokens;
CREATE POLICY onboarding_tokens_customer_select ON core.onboarding_tokens
  FOR SELECT TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM core.customers
      WHERE auth_user_id = auth.uid() OR user_id = auth.uid()
    )
  );

-- 6. RLS Policies for tenant_operating_hours
DROP POLICY IF EXISTS tenant_operating_hours_staff_all ON core.tenant_operating_hours;
CREATE POLICY tenant_operating_hours_staff_all ON core.tenant_operating_hours
  FOR ALL TO authenticated
  USING (core.is_org_member(tenant_id))
  WITH CHECK (core.is_org_member(tenant_id));

DROP POLICY IF EXISTS tenant_operating_hours_public_select ON core.tenant_operating_hours;
CREATE POLICY tenant_operating_hours_public_select ON core.tenant_operating_hours
  FOR SELECT TO authenticated, anon
  USING (is_active = true);

-- 7. Atomic RPC: claim_store_token
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
    AND is_used = false
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;

  IF v_token_rec.customer_id IS NULL THEN
    RAISE EXCEPTION 'Token is not bound to a customer';
  END IF;

  SELECT auth_user_id INTO v_cust_auth
  FROM core.customers
  WHERE id = v_token_rec.customer_id
  FOR UPDATE;

  IF v_cust_auth IS NOT NULL THEN
    RAISE EXCEPTION 'Account already claimed (hijack defense)';
  END IF;

  UPDATE core.customers
  SET auth_user_id = v_uid,
      user_id = COALESCE(user_id, v_uid),
      updated_at = now()
  WHERE id = v_token_rec.customer_id;

  UPDATE core.onboarding_tokens
  SET is_used = true
  WHERE id = v_token_rec.id;

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_token_rec.tenant_id,
    'customer_id', v_token_rec.customer_id
  );
END;
$$;

-- 8. Atomic RPC: consume_customer_qr
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

-- 9. Expose functions to public schema
CREATE OR REPLACE FUNCTION public.claim_store_token(p_token TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT core.claim_store_token(p_token);
$$;

CREATE OR REPLACE FUNCTION public.consume_customer_qr(p_token TEXT, p_tenant_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT core.consume_customer_qr(p_token, p_tenant_id);
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION core.claim_store_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.consume_customer_qr(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_store_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_customer_qr(TEXT, UUID) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON core.onboarding_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.tenant_operating_hours TO authenticated;
GRANT SELECT ON core.tenant_operating_hours TO anon;

COMMIT;
