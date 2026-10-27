-- =============================================================================
-- 20260928210000 payroll / join request 테이블 권한 테스트 (로컬/스테이징 전용 — 운영 DB 금지)
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/grant_authenticated_payroll_join_requests.sql
-- 전체가 하나의 트랜잭션이고 마지막에 ROLLBACK 한다. 실패 시 RAISE EXCEPTION.
-- =============================================================================
\set ON_ERROR_STOP 1
BEGIN;

-- 원격(적용 전)과 같은 상태: authenticated/anon 테이블 권한 없음
REVOKE ALL ON TABLE core.teacher_payroll_settlements FROM authenticated, anon;
REVOKE ALL ON TABLE core.customer_join_requests FROM authenticated, anon;

SELECT set_config('t.owner',    gen_random_uuid()::text, true);
SELECT set_config('t.owner_b',  gen_random_uuid()::text, true);
SELECT set_config('t.app',      gen_random_uuid()::text, true);
SELECT set_config('t.stranger', gen_random_uuid()::text, true);
SELECT set_config('t.org',      gen_random_uuid()::text, true);
SELECT set_config('t.org_b',    gen_random_uuid()::text, true);

INSERT INTO auth.users (id, email) VALUES
  (current_setting('t.owner')::uuid,    'owner@gpj.test'),
  (current_setting('t.owner_b')::uuid,  'owner.b@gpj.test'),
  (current_setting('t.app')::uuid,      'applicant@gpj.test'),
  (current_setting('t.stranger')::uuid, 'stranger@gpj.test');
INSERT INTO core.profiles (id, email)
SELECT u.id, u.email FROM auth.users u
WHERE u.email LIKE '%@gpj.test' AND NOT EXISTS (SELECT 1 FROM core.profiles p WHERE p.id = u.id);
INSERT INTO core.organizations (id, name) VALUES
  (current_setting('t.org')::uuid, '권한학원'),
  (current_setting('t.org_b')::uuid, '다른학원');
INSERT INTO core.organization_members (organization_id, user_id, role) VALUES
  (current_setting('t.org')::uuid,   current_setting('t.owner')::uuid,   'owner'),
  (current_setting('t.org_b')::uuid, current_setting('t.owner_b')::uuid, 'owner');

INSERT INTO core.teacher_payroll_settlements (organization_id, teacher_id, year_month, pay_type, calculated_amount, final_amount)
VALUES (current_setting('t.org')::uuid, 't1', '2026-09', 'fixed', 100, 100),
       (current_setting('t.org_b')::uuid, 't1', '2026-09', 'fixed', 200, 200);
INSERT INTO core.customer_join_requests (organization_id, applicant_user_id, applicant_name)
VALUES (current_setting('t.org')::uuid, current_setting('t.app')::uuid, '신청자');

-- 인증 사용자로 전환 (로컬 auth.uid() 는 claim.sub, 원격은 claims JSON — 둘 다 설정)
-- 헬퍼는 트랜잭션 안 임시 스키마(ROLLBACK 으로 사라짐)에 둔다
CREATE SCHEMA t_gpj;
GRANT USAGE ON SCHEMA t_gpj TO authenticated, anon;
CREATE OR REPLACE FUNCTION t_gpj.act_as(p_key text) RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', current_setting(p_key), true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', current_setting(p_key), 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
END $f$;
CREATE OR REPLACE FUNCTION t_gpj.try_count(p_sql text) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE n bigint;
BEGIN
  EXECUTE p_sql INTO n;
  RETURN n::text;
EXCEPTION WHEN insufficient_privilege THEN RETURN '42501';
END $f$;

-- 1) 적용 전: owner 도 42501 (운영 장애 재현)
DO $$
DECLARE r text;
BEGIN
  PERFORM t_gpj.act_as('t.owner');
  r := t_gpj.try_count('SELECT count(*) FROM core.teacher_payroll_settlements');
  RESET ROLE;
  IF r <> '42501' THEN RAISE EXCEPTION 'FAIL 1: expected 42501 before grant, got %', r; END IF;
  RAISE NOTICE 'PASS 1: before grant, owner select is denied (42501)';
END $$;

-- 2) RLS 가 꺼져 있으면 마이그레이션이 중단
--    (의도된 오류가 출력된다: "core.teacher_payroll_settlements is missing or RLS is disabled")
SAVEPOINT s_rls;
ALTER TABLE core.teacher_payroll_settlements DISABLE ROW LEVEL SECURITY;
\set ON_ERROR_STOP 0
\ir ../migrations/20260928210000_grant_authenticated_payroll_join_requests.sql
\set ON_ERROR_STOP 1
ROLLBACK TO SAVEPOINT s_rls;
DO $$
BEGIN
  IF has_table_privilege('authenticated', 'core.teacher_payroll_settlements', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL 2: granted although RLS was disabled';
  END IF;
  RAISE NOTICE 'PASS 2: RLS-disabled guard blocks the grant';
END $$;

-- 3) 실제 마이그레이션 + 재실행(멱등)
\ir ../migrations/20260928210000_grant_authenticated_payroll_join_requests.sql
\ir ../migrations/20260928210000_grant_authenticated_payroll_join_requests.sql

DO $$
DECLARE
  tps oid := 'core.teacher_payroll_settlements'::regclass;
  cjr oid := 'core.customer_join_requests'::regclass;
BEGIN
  IF NOT (has_table_privilege('authenticated', tps, 'SELECT') AND has_table_privilege('authenticated', tps, 'INSERT')
      AND has_table_privilege('authenticated', tps, 'UPDATE') AND has_table_privilege('authenticated', tps, 'DELETE')) THEN
    RAISE EXCEPTION 'FAIL 3a: payroll privileges missing';
  END IF;
  IF NOT (has_table_privilege('authenticated', cjr, 'SELECT') AND has_table_privilege('authenticated', cjr, 'INSERT')
      AND has_table_privilege('authenticated', cjr, 'UPDATE')) THEN
    RAISE EXCEPTION 'FAIL 3b: join request privileges missing';
  END IF;
  IF has_table_privilege('authenticated', cjr, 'DELETE') THEN RAISE EXCEPTION 'FAIL 3c: join request DELETE granted'; END IF;
  IF has_table_privilege('authenticated', tps, 'TRUNCATE') OR has_table_privilege('authenticated', tps, 'TRIGGER')
     OR has_table_privilege('authenticated', tps, 'REFERENCES') THEN
    RAISE EXCEPTION 'FAIL 3d: extra payroll privileges granted';
  END IF;
  IF has_table_privilege('anon', tps, 'SELECT') OR has_table_privilege('anon', tps, 'INSERT')
     OR has_table_privilege('anon', cjr, 'SELECT') OR has_table_privilege('anon', cjr, 'INSERT') THEN
    RAISE EXCEPTION 'FAIL 3e: anon has privileges';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = tps) OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid = cjr) THEN
    RAISE EXCEPTION 'FAIL 3f: RLS disabled';
  END IF;
  RAISE NOTICE 'PASS 3: expected privileges only (idempotent), anon none, RLS on';
END $$;

-- 4) RLS 행 제한
DO $$
DECLARE r text;
BEGIN
  PERFORM t_gpj.act_as('t.owner');
  r := t_gpj.try_count('SELECT count(*) FROM core.teacher_payroll_settlements');
  IF r <> '1' THEN RAISE EXCEPTION 'FAIL 4a: owner should see only own org payroll (1), got %', r; END IF;
  r := t_gpj.try_count($q$SELECT count(*) FROM core.customer_join_requests WHERE status = 'pending'$q$);
  IF r <> '1' THEN RAISE EXCEPTION 'FAIL 4b: owner should see pending join request (1), got %', r; END IF;

  PERFORM t_gpj.act_as('t.owner_b');
  r := t_gpj.try_count('SELECT count(*) FROM core.customer_join_requests');
  IF r <> '0' THEN RAISE EXCEPTION 'FAIL 4c: other org owner sees join requests (%)', r; END IF;

  PERFORM t_gpj.act_as('t.app');
  r := t_gpj.try_count('SELECT count(*) FROM core.teacher_payroll_settlements');
  IF r <> '0' THEN RAISE EXCEPTION 'FAIL 4d: applicant sees payroll (%)', r; END IF;
  r := t_gpj.try_count('SELECT count(*) FROM core.customer_join_requests');
  IF r <> '1' THEN RAISE EXCEPTION 'FAIL 4e: applicant should see own request (1), got %', r; END IF;
  BEGIN
    INSERT INTO core.teacher_payroll_settlements (organization_id, teacher_id, year_month, pay_type, calculated_amount, final_amount)
    VALUES (current_setting('t.org')::uuid, 't2', '2026-09', 'fixed', 1, 1);
    RAISE EXCEPTION 'FAIL 4f: non-owner inserted payroll';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  PERFORM t_gpj.act_as('t.stranger');
  r := t_gpj.try_count('SELECT count(*) FROM core.customer_join_requests');
  IF r <> '0' THEN RAISE EXCEPTION 'FAIL 4g: stranger sees join requests (%)', r; END IF;

  PERFORM set_config('role', 'anon', true);
  r := t_gpj.try_count('SELECT count(*) FROM core.teacher_payroll_settlements');
  IF r <> '42501' THEN RAISE EXCEPTION 'FAIL 4h: anon payroll select not denied (%)', r; END IF;
  r := t_gpj.try_count('SELECT count(*) FROM core.customer_join_requests');
  IF r <> '42501' THEN RAISE EXCEPTION 'FAIL 4i: anon join request select not denied (%)', r; END IF;
  RESET ROLE;
  RAISE NOTICE 'PASS 4: RLS limits rows (owner own org only; applicant own request; others none; anon 42501)';
END $$;

ROLLBACK;
