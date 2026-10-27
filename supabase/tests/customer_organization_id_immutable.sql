-- =============================================================================
-- 20261004120000 customers.organization_id 불변 회귀 테스트 (로컬/스테이징 전용 — 운영 DB 금지)
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/customer_organization_id_immutable.sql
-- 전체가 하나의 트랜잭션이고 마지막에 ROLLBACK 한다. 실패 시 RAISE EXCEPTION.
-- 시크릿/서비스 롤 키 없음. 로컬 Postgres(마이그레이션 적용본)만 필요.
--
-- 재현: owner 가 조직 A·B 모두에 속하면 customers_update RLS(USING/WITH CHECK =
-- core.rls_staff_or_admin)는 organization_id A→B UPDATE 를 허용한다.
-- 트리거가 check_violation 으로 막아야 하고, 다른 컬럼 UPDATE 는 통과해야 한다.
-- =============================================================================
\set ON_ERROR_STOP 1
BEGIN;

SELECT set_config('t.owner', gen_random_uuid()::text, true);
SELECT set_config('t.org_a', gen_random_uuid()::text, true);
SELECT set_config('t.org_b', gen_random_uuid()::text, true);
SELECT set_config('t.cust',  gen_random_uuid()::text, true);

INSERT INTO auth.users (id, email)
VALUES (current_setting('t.owner')::uuid, 'owner@cust-org-immutable.test');

INSERT INTO core.organizations (id, name) VALUES
  (current_setting('t.org_a')::uuid, '조직A'),
  (current_setting('t.org_b')::uuid, '조직B');

INSERT INTO core.organization_members (organization_id, user_id, role) VALUES
  (current_setting('t.org_a')::uuid, current_setting('t.owner')::uuid, 'owner'),
  (current_setting('t.org_b')::uuid, current_setting('t.owner')::uuid, 'owner');

INSERT INTO core.customers (id, organization_id, name)
VALUES (current_setting('t.cust')::uuid, current_setting('t.org_a')::uuid, '가고객');

-- 테이블 소유자(RLS 우회)도 organization_id 를 옮길 수 없다.
DO $$
DECLARE
  v_blocked boolean := false;
BEGIN
  BEGIN
    UPDATE core.customers
       SET organization_id = current_setting('t.org_b')::uuid
     WHERE id = current_setting('t.cust')::uuid;
  EXCEPTION
    WHEN check_violation THEN
      IF SQLERRM NOT LIKE '%core.customers.organization_id is immutable%' THEN
        RAISE;
      END IF;
      v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL 1: owner bypass still changed core.customers.organization_id';
  END IF;
  IF (SELECT organization_id FROM core.customers WHERE id = current_setting('t.cust')::uuid)
     IS DISTINCT FROM current_setting('t.org_a')::uuid THEN
    RAISE EXCEPTION 'FAIL 1b: organization_id changed after rejected update';
  END IF;
  RAISE NOTICE 'PASS 1: table owner cannot move customers.organization_id';
END $$;

UPDATE core.customers
   SET name = '가고객-수정'
 WHERE id = current_setting('t.cust')::uuid;

DO $$
BEGIN
  IF (SELECT name FROM core.customers WHERE id = current_setting('t.cust')::uuid) <> '가고객-수정' THEN
    RAISE EXCEPTION 'FAIL 2: unrelated column update did not apply';
  END IF;
  IF (SELECT organization_id FROM core.customers WHERE id = current_setting('t.cust')::uuid)
     IS DISTINCT FROM current_setting('t.org_a')::uuid THEN
    RAISE EXCEPTION 'FAIL 2b: organization_id changed on name update';
  END IF;
  RAISE NOTICE 'PASS 2: name update keeps organization_id';
END $$;

-- 이중 조직 owner 의 직접 UPDATE (customers_update RLS 는 통과, 트리거가 거부).
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner'), true);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.owner'))::text, true);

DO $$
DECLARE
  v_blocked boolean := false;
BEGIN
  BEGIN
    UPDATE core.customers
       SET organization_id = current_setting('t.org_b')::uuid
     WHERE id = current_setting('t.cust')::uuid;
  EXCEPTION
    WHEN check_violation THEN
      IF SQLERRM NOT LIKE '%core.customers.organization_id is immutable%' THEN
        RAISE;
      END IF;
      v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL 3: dual-org owner UPDATE moved core.customers.organization_id';
  END IF;
  RAISE NOTICE 'PASS 3: dual-org owner cannot move customers.organization_id';
END $$;

UPDATE core.customers
   SET name = '가고객-멤버수정'
 WHERE id = current_setting('t.cust')::uuid;

RESET ROLE;

DO $$
BEGIN
  IF (SELECT name FROM core.customers WHERE id = current_setting('t.cust')::uuid) <> '가고객-멤버수정' THEN
    RAISE EXCEPTION 'FAIL 4: authenticated name update did not apply';
  END IF;
  IF (SELECT organization_id FROM core.customers WHERE id = current_setting('t.cust')::uuid)
     IS DISTINCT FROM current_setting('t.org_a')::uuid THEN
    RAISE EXCEPTION 'FAIL 4b: organization_id changed';
  END IF;
  RAISE NOTICE 'PASS 4: authenticated name update keeps organization_id';
END $$;

ROLLBACK;
