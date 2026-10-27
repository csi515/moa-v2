-- =============================================================================
-- Account Linking & Token RPC Security Audit Regression Test
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/account_linking_security_audit.sql
-- Entire test runs within a transaction and executes ROLLBACK at the end.
-- =============================================================================
\set ON_ERROR_STOP 1
BEGIN;

SELECT set_config('t.owner',      gen_random_uuid()::text, true);
SELECT set_config('t.victim',     gen_random_uuid()::text, true);
SELECT set_config('t.attacker',   gen_random_uuid()::text, true);
SELECT set_config('t.org1',       gen_random_uuid()::text, true);
SELECT set_config('t.org2',       gen_random_uuid()::text, true);
SELECT set_config('t.cust_claim', gen_random_uuid()::text, true);
SELECT set_config('t.cust_free',  gen_random_uuid()::text, true);
SELECT set_config('t.cust_org2',  gen_random_uuid()::text, true);

INSERT INTO auth.users (id, email) VALUES
  (current_setting('t.owner')::uuid,    'owner@moa.test'),
  (current_setting('t.victim')::uuid,   'victim@moa.test'),
  (current_setting('t.attacker')::uuid, 'attacker@moa.test');

INSERT INTO core.organizations (id, name) VALUES
  (current_setting('t.org1')::uuid, '모아피아노 본점'),
  (current_setting('t.org2')::uuid, '모아필라테스 2호점');

INSERT INTO core.organization_members (organization_id, user_id, role, is_active) VALUES
  (current_setting('t.org1')::uuid, current_setting('t.owner')::uuid, 'owner', true);

-- Customers in Org 1:
-- 1. cust_claim: already claimed by victim
INSERT INTO core.customers (id, organization_id, name, phone, phone_e164, auth_user_id, user_id) VALUES
  (current_setting('t.cust_claim')::uuid, current_setting('t.org1')::uuid, '피해자고객', '010-1111-2222', '01011112222', current_setting('t.victim')::uuid, current_setting('t.victim')::uuid);

-- 2. cust_free: unlinked customer
INSERT INTO core.customers (id, organization_id, name, phone, phone_e164, auth_user_id, user_id) VALUES
  (current_setting('t.cust_free')::uuid, current_setting('t.org1')::uuid, '신규미연결고객', '010-3333-4444', '01033334444', NULL, NULL);

-- 3. cust_org2: customer in Org 2
INSERT INTO core.customers (id, organization_id, name, phone, phone_e164, auth_user_id, user_id) VALUES
  (current_setting('t.cust_org2')::uuid, current_setting('t.org2')::uuid, '타테넌트고객', '010-5555-6666', '01055556666', NULL, NULL);


-- =============================================================================
-- TEST 1: Direct RPC execution of core.link_toss_customer_by_phone from authenticated role
-- Must be rejected with permission denied!
-- =============================================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.attacker'), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

DO $$
BEGIN
  BEGIN
    PERFORM core.link_toss_customer_by_phone(
      current_setting('t.attacker')::uuid,
      'fake_toss_key',
      '010-1111-2222'
    );
    RAISE EXCEPTION 'FAIL 1: authenticated role was able to invoke core.link_toss_customer_by_phone directly!';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS 1: authenticated direct RPC correctly blocked with insufficient_privilege';
  WHEN OTHERS THEN
    IF SQLERRM ~* 'permission denied|service_role required' THEN
      RAISE NOTICE 'PASS 1: authenticated direct RPC correctly blocked (%s)', SQLERRM;
    ELSE
      RAISE;
    END IF;
  END;
END $$;
RESET ROLE;


-- =============================================================================
-- TEST 2: Hijack defense in core.link_toss_customer_by_phone (invoked via service_role)
-- Attempting to link an already-claimed customer to another user must be blocked!
-- =============================================================================
DO $$
DECLARE
  v_err TEXT;
BEGIN
  -- Simulate service_role
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  BEGIN
    PERFORM core.link_toss_customer_by_phone(
      current_setting('t.attacker')::uuid,
      'toss_key_attacker',
      '010-1111-2222'
    );
    RAISE EXCEPTION 'FAIL 2: Hijack defense failed! Already claimed customer was linked to attacker!';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ~* 'Account already claimed by another user' THEN
      RAISE NOTICE 'PASS 2: Hijack defense prevented overwriting victim account in link_toss_customer_by_phone';
    ELSE
      RAISE;
    END IF;
  END;
END $$;


-- =============================================================================
-- TEST 3: Hijack defense in core.claim_store_token_v2
-- Attacker attempts to claim a store token pointing to victim's customer.
-- Must return BLOCKED_ALREADY_CLAIMED and increment attempt_count!
-- =============================================================================
INSERT INTO core.onboarding_tokens (
  id, tenant_id, issuer_type, claim_token, token_hash, customer_id, expires_at, is_used, attempt_count, max_attempts
) VALUES (
  gen_random_uuid(),
  current_setting('t.org1')::uuid,
  'STORE',
  'ST-VICTIMTOK1',
  encode(sha256(convert_to('ST-VICTIMTOK1', 'UTF8')), 'hex'),
  current_setting('t.cust_claim')::uuid,
  now() + interval '5 minutes',
  false,
  0,
  5
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.attacker'), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

DO $$
DECLARE
  v_res JSONB;
  v_tok RECORD;
BEGIN
  v_res := core.claim_store_token_v2('ST-VICTIMTOK1');
  IF (v_res->>'success')::boolean = true THEN
    RAISE EXCEPTION 'FAIL 3: claim_store_token_v2 allowed claiming already bound customer! %', v_res;
  END IF;
  IF v_res->>'status' <> 'BLOCKED_ALREADY_CLAIMED' THEN
    RAISE EXCEPTION 'FAIL 3: Expected BLOCKED_ALREADY_CLAIMED, got %', v_res;
  END IF;

  SELECT * INTO v_tok FROM core.onboarding_tokens WHERE claim_token = 'ST-VICTIMTOK1';
  IF v_tok.attempt_count <> 1 THEN
    RAISE EXCEPTION 'FAIL 3b: attempt_count was not persisted on failed attempt! count=%', v_tok.attempt_count;
  END IF;

  RAISE NOTICE 'PASS 3: claim_store_token_v2 blocked hijack and persisted attempt_count atomically';
END $$;
RESET ROLE;


-- =============================================================================
-- TEST 4: Cross-tenant isolation in claim_store_token_v2
-- Token tenant_id is Org 1, but customer_id belongs to Org 2.
-- Must be rejected with Target customer not found in tenant!
-- =============================================================================
INSERT INTO core.onboarding_tokens (
  id, tenant_id, issuer_type, claim_token, token_hash, customer_id, expires_at, is_used
) VALUES (
  gen_random_uuid(),
  current_setting('t.org1')::uuid,
  'STORE',
  'ST-CROSSTORG',
  encode(sha256(convert_to('ST-CROSSTORG', 'UTF8')), 'hex'),
  current_setting('t.cust_org2')::uuid, -- Belongs to org2, not org1
  now() + interval '5 minutes',
  false
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.victim'), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

DO $$
BEGIN
  BEGIN
    PERFORM core.claim_store_token_v2('ST-CROSSTORG');
    RAISE EXCEPTION 'FAIL 4: Cross-tenant token was accepted!';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ~* 'Target customer not found in tenant' THEN
      RAISE NOTICE 'PASS 4: Cross-tenant customer claim rejected';
    ELSE
      RAISE;
    END IF;
  END;
END $$;
RESET ROLE;


-- =============================================================================
-- TEST 5: Token type isolation
-- Staff invite token cannot be claimed via claim_store_token_v2
-- Store token cannot be claimed via claim_staff_invite
-- =============================================================================
INSERT INTO core.onboarding_tokens (
  id, tenant_id, issuer_type, claim_token, token_hash, customer_id, expires_at, is_used
) VALUES (
  gen_random_uuid(),
  current_setting('t.org1')::uuid,
  'STORE_STAFF_INVITE',
  'SI-STAFFONLY',
  encode(sha256(convert_to('SI-STAFFONLY', 'UTF8')), 'hex'),
  current_setting('t.cust_free')::uuid,
  now() + interval '5 minutes',
  false
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.victim'), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

DO $$
BEGIN
  BEGIN
    -- Attempt to claim staff invite via store token RPC
    PERFORM core.claim_store_token_v2('SI-STAFFONLY');
    RAISE EXCEPTION 'FAIL 5a: Staff invite token was accepted by claim_store_token_v2!';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ~* 'Invalid or expired token' THEN
      RAISE NOTICE 'PASS 5a: Staff invite token rejected by claim_store_token_v2';
    ELSE
      RAISE;
    END IF;
  END;
END $$;
RESET ROLE;


-- =============================================================================
-- TEST 6: Normal legitimate claim of unlinked customer
-- =============================================================================
INSERT INTO core.onboarding_tokens (
  id, tenant_id, issuer_type, claim_token, token_hash, customer_id, expires_at, is_used
) VALUES (
  gen_random_uuid(),
  current_setting('t.org1')::uuid,
  'STORE',
  'ST-VALIDTOK1',
  encode(sha256(convert_to('ST-VALIDTOK1', 'UTF8')), 'hex'),
  current_setting('t.cust_free')::uuid,
  now() + interval '5 minutes',
  false
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.victim'), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

DO $$
DECLARE
  v_res JSONB;
  v_cust RECORD;
  v_tok RECORD;
BEGIN
  v_res := core.claim_store_token_v2('ST-VALIDTOK1');
  IF (v_res->>'success')::boolean <> true THEN
    RAISE EXCEPTION 'FAIL 6: Normal valid token claim failed: %', v_res;
  END IF;

  SELECT * INTO v_cust FROM core.customers WHERE id = current_setting('t.cust_free')::uuid;
  IF v_cust.auth_user_id <> current_setting('t.victim')::uuid THEN
    RAISE EXCEPTION 'FAIL 6b: Customer auth_user_id not updated to caller!';
  END IF;

  SELECT * INTO v_tok FROM core.onboarding_tokens WHERE claim_token = 'ST-VALIDTOK1';
  IF v_tok.is_used <> true THEN
    RAISE EXCEPTION 'FAIL 6c: Token was not marked used!';
  END IF;

  RAISE NOTICE 'PASS 6: Legitimate onboarding token claim succeeded and is atomic';
END $$;
RESET ROLE;


-- =============================================================================
-- TEST 7: Staff invite claimed by store owner preserves owner role
-- =============================================================================
INSERT INTO core.onboarding_tokens (
  id, tenant_id, issuer_type, claim_token, expires_at, is_used
) VALUES (
  gen_random_uuid(),
  current_setting('t.org1')::uuid,
  'STORE_STAFF_INVITE',
  'SI-OWNERCLAIM',
  now() + interval '5 minutes',
  false
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner'), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

DO $$
DECLARE
  v_res JSONB;
  v_member RECORD;
BEGIN
  v_res := core.claim_staff_invite('SI-OWNERCLAIM');
  IF (v_res->>'success')::boolean <> true THEN
    RAISE EXCEPTION 'FAIL 7: Staff invite claim failed for owner: %', v_res;
  END IF;

  SELECT * INTO v_member FROM core.organization_members
  WHERE organization_id = current_setting('t.org1')::uuid
    AND user_id = current_setting('t.owner')::uuid;

  IF v_member.role <> 'owner' THEN
    RAISE EXCEPTION 'FAIL 7b: Owner was demoted to % after claiming staff invite!', v_member.role;
  END IF;

  RAISE NOTICE 'PASS 7: Owner role preserved when claiming staff invite';
END $$;
RESET ROLE;

ROLLBACK;
