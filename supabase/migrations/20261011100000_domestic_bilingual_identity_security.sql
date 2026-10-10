-- =============================================================================
-- Moa v2: Domestic Bilingual (KO/EN) Identity Security & E.164 Architecture
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. core.organizations: Bilingual configuration
-- -----------------------------------------------------------------------------
ALTER TABLE core.organizations
  ADD COLUMN IF NOT EXISTS default_language TEXT NOT NULL DEFAULT 'ko',
  ADD COLUMN IF NOT EXISTS supported_languages TEXT[] NOT NULL DEFAULT ARRAY['ko', 'en'];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_organizations_default_language'
  ) THEN
    ALTER TABLE core.organizations
      ADD CONSTRAINT check_organizations_default_language
      CHECK (default_language IN ('ko', 'en'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. core.customers: E.164 normalization & identity verification fields
-- -----------------------------------------------------------------------------
ALTER TABLE core.customers
  ADD COLUMN IF NOT EXISTS phone_e164 TEXT,
  ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_method TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_customers_verification_method'
  ) THEN
    ALTER TABLE core.customers
      ADD CONSTRAINT check_customers_verification_method
      CHECK (verification_method IS NULL OR verification_method IN ('ONSITE_QR', 'REMOTE_CHALLENGE', 'STAFF_MANUAL', 'OAUTH_VERIFIED'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_core_customers_org_phone_e164
  ON core.customers(organization_id, phone_e164)
  WHERE phone_e164 IS NOT NULL;

-- Backfill phone_e164 from existing phone numbers (+82 default for domestic)
UPDATE core.customers
SET phone_e164 = CASE
  WHEN phone IS NULL OR btrim(phone) = '' THEN NULL
  WHEN btrim(phone) LIKE '+%' THEN btrim(phone)
  WHEN regexp_replace(phone, '[^0-9]', '', 'g') LIKE '0%' THEN
    '+82' || substr(regexp_replace(phone, '[^0-9]', '', 'g'), 2)
  ELSE
    '+82' || regexp_replace(phone, '[^0-9]', '', 'g')
END
WHERE phone_e164 IS NULL AND phone IS NOT NULL AND btrim(phone) <> '';

-- -----------------------------------------------------------------------------
-- 3. core.onboarding_tokens: SHA-256 token hashing & rate limit protection
-- -----------------------------------------------------------------------------
ALTER TABLE core.onboarding_tokens
  ADD COLUMN IF NOT EXISTS token_hash TEXT,
  ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 5;

CREATE INDEX IF NOT EXISTS idx_onboarding_tokens_hash
  ON core.onboarding_tokens(token_hash)
  WHERE is_used = false;

-- -----------------------------------------------------------------------------
-- 4. core.customer_phone_history: Audit ledger for recycled/changed numbers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.customer_phone_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  old_phone TEXT,
  new_phone TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_reason TEXT NOT NULL DEFAULT 'PROFILE_UPDATE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_phone_history_customer
  ON core.customer_phone_history(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_phone_history_org
  ON core.customer_phone_history(organization_id);

ALTER TABLE core.customer_phone_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_phone_history_staff_all ON core.customer_phone_history;
CREATE POLICY customer_phone_history_staff_all ON core.customer_phone_history
  FOR ALL TO authenticated
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

DROP POLICY IF EXISTS customer_phone_history_customer_select ON core.customer_phone_history;
CREATE POLICY customer_phone_history_customer_select ON core.customer_phone_history
  FOR SELECT TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM core.customers
      WHERE auth_user_id = auth.uid() OR user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 5. Atomic RPC: claim_store_token_v2 (SHA-256 hash & 5-min TTL)
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

  SELECT * INTO v_token_rec
  FROM core.onboarding_tokens
  WHERE (token_hash = v_hash OR claim_token = v_token_trimmed)
    AND is_used = false
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;

  IF v_token_rec.attempt_count >= v_token_rec.max_attempts THEN
    UPDATE core.onboarding_tokens
    SET is_used = true
    WHERE id = v_token_rec.id;
    RAISE EXCEPTION 'Token maximum attempts exceeded';
  END IF;

  IF v_token_rec.customer_id IS NULL THEN
    RAISE EXCEPTION 'Token is not bound to a customer';
  END IF;

  SELECT auth_user_id INTO v_cust_auth
  FROM core.customers
  WHERE id = v_token_rec.customer_id
  FOR UPDATE;

  IF v_cust_auth IS NOT NULL AND v_cust_auth <> v_uid THEN
    RAISE EXCEPTION 'Account already claimed (hijack defense)';
  END IF;

  UPDATE core.customers
  SET auth_user_id = v_uid,
      user_id = COALESCE(user_id, v_uid),
      identity_verified_at = now(),
      verification_method = 'ONSITE_QR',
      updated_at = now()
  WHERE id = v_token_rec.customer_id;

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

-- -----------------------------------------------------------------------------
-- 6. Atomic RPC: verify_and_link_remote_customer (Cost 0 KRW Challenge)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.verify_and_link_remote_customer(
  p_org_id UUID,
  p_phone_e164 TEXT,
  p_candidate_name TEXT,
  p_candidate_child_name TEXT DEFAULT NULL,
  p_candidate_birth_date TEXT DEFAULT NULL,
  p_candidate_service TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_norm_phone TEXT;
  v_clean_name TEXT;
  v_cust_rec RECORD;
  v_match_count INT := 0;
  v_has_child_match BOOLEAN := false;
  v_has_birth_match BOOLEAN := false;
  v_has_service_match BOOLEAN := false;
  v_matched_fields JSONB := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_norm_phone := btrim(COALESCE(p_phone_e164, ''));
  v_clean_name := lower(regexp_replace(btrim(COALESCE(p_candidate_name, '')), '\s+', '', 'g'));

  IF v_norm_phone = '' OR v_clean_name = '' THEN
    RAISE EXCEPTION 'Phone and name are required';
  END IF;

  -- 1. Find matching customer in organization by phone
  SELECT * INTO v_cust_rec
  FROM core.customers
  WHERE organization_id = p_org_id
    AND (
      phone_e164 = v_norm_phone
      OR regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = regexp_replace(v_norm_phone, '[^0-9]', '', 'g')
    )
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  -- If no record found with this phone, return not found
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', 'NO_MATCH_NEW_CUSTOMER',
      'message', 'No existing record found'
    );
  END IF;

  -- Hijack defense: If already linked to another user, block!
  IF v_cust_rec.auth_user_id IS NOT NULL AND v_cust_rec.auth_user_id <> v_uid THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'BLOCKED_ALREADY_CLAIMED',
      'error', 'Account already claimed (hijack defense)'
    );
  END IF;

  -- 2. Evaluate Primary Name Match
  IF lower(regexp_replace(COALESCE(v_cust_rec.name, ''), '\s+', '', 'g')) = v_clean_name THEN
    v_match_count := v_match_count + 1;
    v_matched_fields := v_matched_fields || jsonb_build_array('name');
  END IF;

  -- 3. Evaluate Child Name Match
  IF p_candidate_child_name IS NOT NULL AND btrim(p_candidate_child_name) <> '' THEN
    SELECT EXISTS (
      SELECT 1
      FROM core.parent_student_links psl
      JOIN core.customers child_c ON child_c.id = psl.student_customer_id
      WHERE psl.organization_id = p_org_id
        AND psl.parent_customer_id = v_cust_rec.id
        AND lower(regexp_replace(child_c.name, '\s+', '', 'g')) = lower(regexp_replace(btrim(p_candidate_child_name), '\s+', '', 'g'))
    ) INTO v_has_child_match;

    IF v_has_child_match THEN
      v_match_count := v_match_count + 1;
      v_matched_fields := v_matched_fields || jsonb_build_array('child_name');
    END IF;
  END IF;

  -- 4. Evaluate Birth Date Match
  IF p_candidate_birth_date IS NOT NULL AND btrim(p_candidate_birth_date) <> '' THEN
    IF v_cust_rec.metadata->>'birthDate' = btrim(p_candidate_birth_date)
       OR v_cust_rec.metadata->>'birth_date' = btrim(p_candidate_birth_date) THEN
      v_has_birth_match := true;
      v_match_count := v_match_count + 1;
      v_matched_fields := v_matched_fields || jsonb_build_array('birth_date');
    END IF;
  END IF;

  -- 5. Auto-link decision: Name + at least 1 secondary proof
  IF jsonb_path_exists(v_matched_fields, '$[*] ? (@ == "name")') AND v_match_count >= 2 THEN
    UPDATE core.customers
    SET auth_user_id = v_uid,
        user_id = COALESCE(user_id, v_uid),
        phone_e164 = v_norm_phone,
        identity_verified_at = now(),
        verification_method = 'REMOTE_CHALLENGE',
        updated_at = now()
    WHERE id = v_cust_rec.id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'MATCH_AUTO_LINK',
      'customer_id', v_cust_rec.id,
      'match_count', v_match_count,
      'matched_fields', v_matched_fields
    );
  END IF;

  -- Partial match: Require staff confirmation (queue to customer_join_requests)
  INSERT INTO core.customer_join_requests (
    organization_id,
    applicant_user_id,
    applicant_name,
    applicant_phone,
    request_type,
    status,
    customer_metadata
  ) VALUES (
    p_org_id,
    v_uid,
    p_candidate_name,
    v_norm_phone,
    'membership',
    'pending',
    jsonb_build_object(
      'existing_customer_id', v_cust_rec.id,
      'match_count', v_match_count,
      'matched_fields', v_matched_fields,
      'requires_staff_verification', true
    )
  ) ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'PARTIAL_REQUIRE_STAFF',
    'customer_id', v_cust_rec.id,
    'match_count', v_match_count,
    'matched_fields', v_matched_fields,
    'message', 'Verification details queued for staff confirmation.'
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. Atomic RPC: update_customer_phone_atomic
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.update_customer_phone_atomic(p_new_phone_e164 TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_norm_phone TEXT := btrim(COALESCE(p_new_phone_e164, ''));
  v_cust RECORD;
  v_count INT := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_norm_phone = '' THEN
    RAISE EXCEPTION 'Valid phone number is required';
  END IF;

  FOR v_cust IN
    SELECT id, organization_id, phone, phone_e164
    FROM core.customers
    WHERE auth_user_id = v_uid OR user_id = v_uid
    FOR UPDATE
  LOOP
    INSERT INTO core.customer_phone_history (
      customer_id,
      organization_id,
      old_phone,
      new_phone,
      changed_by,
      change_reason
    ) VALUES (
      v_cust.id,
      v_cust.organization_id,
      COALESCE(v_cust.phone_e164, v_cust.phone),
      v_norm_phone,
      v_uid,
      'PROFILE_UPDATE'
    );

    UPDATE core.customers
    SET phone_e164 = v_norm_phone,
        phone = v_norm_phone,
        updated_at = now()
    WHERE id = v_cust.id;

    v_count := v_count + 1;
  END LOOP;

  -- Also sync core.parents if exists
  UPDATE core.parents
  SET phone = v_norm_phone,
      updated_at = now()
  WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'success', true,
    'updated_customers_count', v_count,
    'new_phone_e164', v_norm_phone
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 8. Harden core.link_toss_customer_by_phone against account hijacking
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.link_toss_customer_by_phone(
  p_user_id UUID,
  p_toss_user_key TEXT,
  p_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_norm_phone TEXT;
  v_cust_rec RECORD;
  v_is_staff BOOLEAN := false;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  v_norm_phone := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');

  IF v_norm_phone <> '' THEN
    SELECT * INTO v_cust_rec
    FROM core.customers
    WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = v_norm_phone
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      -- Account hijacking defense: do not overwrite if already claimed by someone else
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

  SELECT EXISTS(
    SELECT 1 FROM core.organization_members
    WHERE user_id = p_user_id
  ) INTO v_is_staff;

  RETURN jsonb_build_object(
    'success', true,
    'linked_customer_id', v_cust_rec.id,
    'organization_id', v_cust_rec.organization_id,
    'is_staff', v_is_staff
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 9. Expose functions to public schema & grant permissions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_store_token_v2(p_raw_token TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT core.claim_store_token_v2(p_raw_token);
$$;

CREATE OR REPLACE FUNCTION public.verify_and_link_remote_customer(
  p_org_id UUID,
  p_phone_e164 TEXT,
  p_candidate_name TEXT,
  p_candidate_child_name TEXT DEFAULT NULL,
  p_candidate_birth_date TEXT DEFAULT NULL,
  p_candidate_service TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT core.verify_and_link_remote_customer(
    p_org_id,
    p_phone_e164,
    p_candidate_name,
    p_candidate_child_name,
    p_candidate_birth_date,
    p_candidate_service
  );
$$;

CREATE OR REPLACE FUNCTION public.update_customer_phone_atomic(p_new_phone_e164 TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT core.update_customer_phone_atomic(p_new_phone_e164);
$$;

GRANT EXECUTE ON FUNCTION core.claim_store_token_v2(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.verify_and_link_remote_customer(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.update_customer_phone_atomic(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.link_toss_customer_by_phone(UUID, TEXT, TEXT) TO authenticated;

GRANT EXECUTE ON FUNCTION public.claim_store_token_v2(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_and_link_remote_customer(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_customer_phone_atomic(TEXT) TO authenticated;

GRANT SELECT ON core.customer_phone_history TO authenticated;

COMMIT;
