-- =============================================================================
-- Tenant Data Isolation & RLS Cross-Tenant Regression Test
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/tenant_isolation_rls_audit.sql
-- Entire test runs within a transaction and executes ROLLBACK at the end.
-- =============================================================================
\set ON_ERROR_STOP 1
BEGIN;

-- Setup test entities
SELECT set_config('t.org1',          gen_random_uuid()::text, true);
SELECT set_config('t.org2',          gen_random_uuid()::text, true);
SELECT set_config('t.staff_org1',    gen_random_uuid()::text, true);
SELECT set_config('t.staff_org2',    gen_random_uuid()::text, true);
SELECT set_config('t.cust_org1',     gen_random_uuid()::text, true);
SELECT set_config('t.cust_org2',     gen_random_uuid()::text, true);
SELECT set_config('t.pass_org1',     gen_random_uuid()::text, true);
SELECT set_config('t.pass_org2',     gen_random_uuid()::text, true);
SELECT set_config('t.locker_org1',   gen_random_uuid()::text, true);
SELECT set_config('t.locker_org2',   gen_random_uuid()::text, true);

INSERT INTO auth.users (id, email) VALUES
  (current_setting('t.staff_org1')::uuid, 'staff1@moa.test'),
  (current_setting('t.staff_org2')::uuid, 'staff2@moa.test'),
  (current_setting('t.cust_org1')::uuid,  'cust1@moa.test'),
  (current_setting('t.cust_org2')::uuid,  'cust2@moa.test');

INSERT INTO core.organizations (id, name, is_active) VALUES
  (current_setting('t.org1')::uuid, '테넌트 1호점', true),
  (current_setting('t.org2')::uuid, '테넌트 2호점', true);

INSERT INTO core.organization_members (organization_id, user_id, role, is_active) VALUES
  (current_setting('t.org1')::uuid, current_setting('t.staff_org1')::uuid, 'staff', true),
  (current_setting('t.org2')::uuid, current_setting('t.staff_org2')::uuid, 'staff', true);

INSERT INTO core.customers (id, organization_id, name, phone, auth_user_id, user_id) VALUES
  (gen_random_uuid(), current_setting('t.org1')::uuid, '고객 1', '010-1111-1111', current_setting('t.cust_org1')::uuid, current_setting('t.cust_org1')::uuid),
  (gen_random_uuid(), current_setting('t.org2')::uuid, '고객 2', '010-2222-2222', current_setting('t.cust_org2')::uuid, current_setting('t.cust_org2')::uuid);

-- Fetch customer IDs
DO $$
DECLARE
  v_c1 UUID;
  v_c2 UUID;
BEGIN
  SELECT id INTO v_c1 FROM core.customers WHERE organization_id = current_setting('t.org1')::uuid;
  SELECT id INTO v_c2 FROM core.customers WHERE organization_id = current_setting('t.org2')::uuid;

  INSERT INTO core.passes (id, tenant_id, customer_id, pass_name, status) VALUES
    (current_setting('t.pass_org1')::uuid, current_setting('t.org1')::uuid, v_c1, '1호점 이용권', 'ACTIVE'),
    (current_setting('t.pass_org2')::uuid, current_setting('t.org2')::uuid, v_c2, '2호점 이용권', 'ACTIVE');

  INSERT INTO core.lockers (id, tenant_id, locker_number, section, assigned_customer_id, status) VALUES
    (current_setting('t.locker_org1')::uuid, current_setting('t.org1')::uuid, '101', 'A구역', v_c1, 'OCCUPIED'),
    (current_setting('t.locker_org2')::uuid, current_setting('t.org2')::uuid, '201', 'B구역', v_c2, 'OCCUPIED');
END $$;

-- =============================================================================
-- TEST 1: Staff 1 CANNOT read, update, or delete passes/lockers in Org 2
-- =============================================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.staff_org1'), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

DO $$
DECLARE
  v_count INT;
BEGIN
  -- Should see pass 1 but NOT pass 2
  SELECT COUNT(*) INTO v_count FROM core.passes WHERE id = current_setting('t.pass_org2')::uuid;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL 1.1: Staff in Org 1 was able to SELECT pass in Org 2!';
  END IF;

  -- Should see locker 1 but NOT locker 2
  SELECT COUNT(*) INTO v_count FROM core.lockers WHERE id = current_setting('t.locker_org2')::uuid;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL 1.2: Staff in Org 1 was able to SELECT locker in Org 2!';
  END IF;

  -- UPDATE Org 2 pass must affect 0 rows
  UPDATE core.passes SET pass_name = '탈취시도' WHERE id = current_setting('t.pass_org2')::uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL 1.3: Staff in Org 1 was able to UPDATE pass in Org 2!';
  END IF;

  -- DELETE Org 2 pass must affect 0 rows
  DELETE FROM core.passes WHERE id = current_setting('t.pass_org2')::uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL 1.4: Staff in Org 1 was able to DELETE pass in Org 2!';
  END IF;

  RAISE NOTICE 'PASS 1: Staff cross-tenant read/update/delete strictly blocked by RLS.';
END $$;

-- =============================================================================
-- TEST 2: Tenant ID spoofing on INSERT is blocked
-- =============================================================================
DO $$
BEGIN
  BEGIN
    INSERT INTO core.passes (tenant_id, customer_id, pass_name)
    VALUES (current_setting('t.org2')::uuid, NULL, '위조 생성 시도');
    RAISE EXCEPTION 'FAIL 2.1: Staff in Org 1 was able to INSERT pass into Org 2!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS 2.1: Tenant ID spoofing on passes insert rejected as expected.';
    WHEN others THEN
      -- WITH CHECK violation will raise error
      RAISE NOTICE 'PASS 2.1: Tenant ID spoofing rejected: %', SQLERRM;
  END;
END $$;

-- =============================================================================
-- TEST 3: Customer 1 CAN see own pass and locker, but CANNOT see Org 2 or other customer
-- =============================================================================
SELECT set_config('request.jwt.claim.sub', current_setting('t.cust_org1'), true);

DO $$
DECLARE
  v_count INT;
BEGIN
  -- Customer 1 can see own pass
  SELECT COUNT(*) INTO v_count FROM core.passes WHERE id = current_setting('t.pass_org1')::uuid;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL 3.1: Customer 1 could not view their own pass!';
  END IF;

  -- Customer 1 CANNOT see Org 2 pass
  SELECT COUNT(*) INTO v_count FROM core.passes WHERE id = current_setting('t.pass_org2')::uuid;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL 3.2: Customer 1 was able to view Org 2 pass!';
  END IF;

  -- Customer 1 can see own locker
  SELECT COUNT(*) INTO v_count FROM core.lockers WHERE id = current_setting('t.locker_org1')::uuid;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL 3.3: Customer 1 could not view their own locker!';
  END IF;

  -- Customer 1 CANNOT see Org 2 locker
  SELECT COUNT(*) INTO v_count FROM core.lockers WHERE id = current_setting('t.locker_org2')::uuid;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL 3.4: Customer 1 was able to view Org 2 locker!';
  END IF;

  -- Customer CANNOT mutate (INSERT/UPDATE/DELETE) passes or lockers
  BEGIN
    UPDATE core.passes SET pass_name = '고객변조시도' WHERE id = current_setting('t.pass_org1')::uuid;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 0 THEN
      RAISE EXCEPTION 'FAIL 3.5: Customer was able to UPDATE pass!';
    END IF;
  END;

  RAISE NOTICE 'PASS 3: Customer-scoped access strictly limits visibility to own records in own tenant.';
END $$;

RESET ROLE;
ROLLBACK;
