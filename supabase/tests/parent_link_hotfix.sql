-- =============================================================================
-- 20260928 parent-link hotfix 회귀 테스트 (로컬/스테이징 전용 — 운영 DB 금지)
--
-- 실행 예 (로컬 supabase start 후):
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/parent_link_hotfix.sql
-- 전체가 하나의 트랜잭션이고 마지막에 ROLLBACK 한다. 실패 시 RAISE EXCEPTION.
-- auth.uid() 는 request.jwt.claim.sub 로 흉내 낸다.
-- =============================================================================
\set ON_ERROR_STOP 1
BEGIN;

-- ---------- fixture (superuser) ----------
SELECT set_config('t.owner',    gen_random_uuid()::text, true);
SELECT set_config('t.attacker', gen_random_uuid()::text, true);
SELECT set_config('t.squatter', gen_random_uuid()::text, true);
SELECT set_config('t.staffish', gen_random_uuid()::text, true);
SELECT set_config('t.org',      gen_random_uuid()::text, true);
SELECT set_config('t.parent',   gen_random_uuid()::text, true);
SELECT set_config('t.student',  gen_random_uuid()::text, true);
SELECT set_config('t.staff',    gen_random_uuid()::text, true);

INSERT INTO auth.users (id, email) VALUES
  (current_setting('t.owner')::uuid,    'owner@hotfix.test'),
  (current_setting('t.attacker')::uuid, 'attacker@hotfix.test'),
  -- 공격자가 피해 학부모 이메일로 먼저 가입(자동 인증)한 상황
  (current_setting('t.squatter')::uuid, 'victim.parent@hotfix.test'),
  -- 공격자가 교직원 초대 이메일로 먼저 가입한 상황
  (current_setting('t.staffish')::uuid, 'invited.staff@hotfix.test');

INSERT INTO core.organizations (id, name) VALUES (current_setting('t.org')::uuid, '핫픽스학원');
INSERT INTO core.organization_members (organization_id, user_id, role)
VALUES (current_setting('t.org')::uuid, current_setting('t.owner')::uuid, 'owner');

INSERT INTO core.customers (id, organization_id, name, email, metadata) VALUES
  (current_setting('t.parent')::uuid, current_setting('t.org')::uuid, '김학부', 'victim.parent@hotfix.test',
   '{"entityType":"parent"}'),
  (current_setting('t.student')::uuid, current_setting('t.org')::uuid, '김학생', NULL,
   '{"entityType":"student"}');

INSERT INTO core.parent_student_links (organization_id, parent_customer_id, student_customer_id)
VALUES (current_setting('t.org')::uuid, current_setting('t.parent')::uuid, current_setting('t.student')::uuid);

INSERT INTO core.staff (id, organization_id, name) VALUES (current_setting('t.staff')::uuid, current_setting('t.org')::uuid, '박선생');
INSERT INTO core.staff_invitations (organization_id, staff_id, email, status)
VALUES (current_setting('t.org')::uuid, current_setting('t.staff')::uuid, 'invited.staff@hotfix.test', 'pending');

-- ---------- 1. profiles.email 직접 변경 차단 ----------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.attacker'), true);
UPDATE core.profiles SET email = 'victim.parent@hotfix.test', full_name = '공격자'
WHERE id = current_setting('t.attacker')::uuid;
RESET ROLE;
DO $$
DECLARE r RECORD;
BEGIN
  SELECT email, full_name INTO r FROM core.profiles WHERE id = current_setting('t.attacker')::uuid;
  IF r.email <> 'attacker@hotfix.test' THEN
    RAISE EXCEPTION 'FAIL 1: profiles.email changed by user to %', r.email;
  END IF;
  IF r.full_name <> '공격자' THEN
    RAISE EXCEPTION 'FAIL 1b: other profile columns must stay editable';
  END IF;
  RAISE NOTICE 'PASS 1: profiles.email not user-editable';
END $$;

-- ---------- 2. auth.users.email 변경은 profiles 에 반영 ----------
UPDATE auth.users SET email = 'attacker2@hotfix.test' WHERE id = current_setting('t.attacker')::uuid;
DO $$
BEGIN
  IF (SELECT email FROM core.profiles WHERE id = current_setting('t.attacker')::uuid) <> 'attacker2@hotfix.test' THEN
    RAISE EXCEPTION 'FAIL 2: profiles.email not synced from auth.users';
  END IF;
  RAISE NOTICE 'PASS 2: auth email change syncs to profiles';
END $$;

-- ---------- 3. connect_parent_on_login: no-op (이메일 일치해도 연결 안 됨) ----------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.squatter'), true);
SELECT set_config('t.r3', core.connect_parent_on_login()::text, true);
RESET ROLE;
DO $$
BEGIN
  IF current_setting('t.r3')::jsonb <> '{"connected":0,"memberships":[]}'::jsonb THEN
    RAISE EXCEPTION 'FAIL 3: unexpected connect_parent_on_login result %', current_setting('t.r3');
  END IF;
  IF (SELECT user_id FROM core.customers WHERE id = current_setting('t.parent')::uuid) IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL 3b: parent customer linked by email match';
  END IF;
  RAISE NOTICE 'PASS 3: connect_parent_on_login is a no-op';
END $$;

-- ---------- 4. connect_staff_on_login: no-op ----------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.staffish'), true);
SELECT set_config('t.r4', core.connect_staff_on_login()::text, true);
RESET ROLE;
DO $$
BEGIN
  IF (current_setting('t.r4')::jsonb ->> 'connected')::int <> 0 THEN
    RAISE EXCEPTION 'FAIL 4: connect_staff_on_login connected someone';
  END IF;
  IF EXISTS (SELECT 1 FROM core.organization_members
             WHERE user_id = current_setting('t.staffish')::uuid) THEN
    RAISE EXCEPTION 'FAIL 4b: staff membership created by email match';
  END IF;
  IF (SELECT status FROM core.staff_invitations WHERE staff_id = current_setting('t.staff')::uuid) <> 'pending' THEN
    RAISE EXCEPTION 'FAIL 4c: staff invitation auto-accepted';
  END IF;
  RAISE NOTICE 'PASS 4: connect_staff_on_login is a no-op';
END $$;

-- ---------- 5. identity helper: 일반 사용자 호출 불가 ----------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.attacker'), true);
DO $$
BEGIN
  BEGIN
    PERFORM core.find_user_id_by_identity_email('owner@hotfix.test');
    RAISE EXCEPTION 'FAIL 5: find_user_id_by_identity_email callable by authenticated';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS 5: find_user_id_by_identity_email not executable by authenticated';
  END;
END $$;
RESET ROLE;

-- ---------- 6. invite_parent_member: 기존 계정 이메일이 같아도 invited ----------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner'), true);
SELECT set_config('t.r6', core.invite_parent_member(
  current_setting('t.org')::uuid, current_setting('t.parent')::uuid, 'victim.parent@hotfix.test')::text, true);
RESET ROLE;
DO $$
DECLARE r JSONB := current_setting('t.r6')::jsonb;
BEGIN
  IF r->>'status' <> 'invited' THEN
    RAISE EXCEPTION 'FAIL 6: invite_parent_member status %', r->>'status';
  END IF;
  IF jsonb_array_length(r->'link_codes') < 1 THEN
    RAISE EXCEPTION 'FAIL 6b: no link codes issued';
  END IF;
  IF (SELECT user_id FROM core.customers WHERE id = current_setting('t.parent')::uuid) IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL 6c: parent auto-linked to pre-registered account';
  END IF;
  IF (SELECT status FROM core.parent_invitations
      WHERE organization_id = current_setting('t.org')::uuid
        AND parent_customer_id = current_setting('t.parent')::uuid) <> 'pending' THEN
    RAISE EXCEPTION 'FAIL 6d: invitation not pending';
  END IF;
  PERFORM set_config('t.token', r->'link_codes'->0->>'token', true);
  RAISE NOTICE 'PASS 6: invite_parent_member always invited, no auto-link';
END $$;

-- ---------- 7. get_parent_invite_email_context ----------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner'), true);
SELECT set_config('t.r7', core.get_parent_invite_email_context(ARRAY[lower(current_setting('t.token'))])::text, true);
RESET ROLE;
DO $$
DECLARE r JSONB := current_setting('t.r7')::jsonb;
BEGIN
  IF r->>'email' <> 'victim.parent@hotfix.test'
     OR r->>'organization_name' <> '핫픽스학원'
     OR r->>'parent_name' <> '김학부'
     OR r->>'organization_id' <> current_setting('t.org')
     OR jsonb_array_length(r->'link_codes') <> 1
     OR r->'link_codes'->0->>'token' <> current_setting('t.token') THEN
    RAISE EXCEPTION 'FAIL 7: unexpected email context %', r;
  END IF;
  RAISE NOTICE 'PASS 7: email context resolved from DB for org admin';
END $$;

-- 7b. 비관리자는 같은 코드로도 조회 불가
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.attacker'), true);
DO $$
BEGIN
  BEGIN
    PERFORM core.get_parent_invite_email_context(ARRAY[current_setting('t.token')]);
    RAISE EXCEPTION 'FAIL 7b: non-admin got email context';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
    RAISE NOTICE 'PASS 7b: non-admin rejected (%).', SQLERRM;
  END;
  -- 7c. 존재하지 않는 코드
  BEGIN
    PERFORM core.get_parent_invite_email_context(ARRAY['ZZZZZZZZ']);
    RAISE EXCEPTION 'FAIL 7c: bogus token accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
    RAISE NOTICE 'PASS 7c: bogus token rejected';
  END;
END $$;
RESET ROLE;

-- ---------- 8. 토큰 수락(명시적) 경로는 그대로 동작 ----------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.squatter'), true);
SELECT set_config('t.r8', core.redeem_guardian_link_token(current_setting('t.token'), '["display_name"]'::jsonb)::text, true);
RESET ROLE;
DO $$
BEGIN
  IF (current_setting('t.r8')::jsonb ->> 'success')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'FAIL 8: redeem failed %', current_setting('t.r8');
  END IF;
  RAISE NOTICE 'PASS 8: token redeem still works (explicit acceptance path)';
END $$;

-- ---------- 9. snapshot 테이블은 일반 사용자 접근 불가 ----------
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM core.security_profile_email_snapshot LIMIT 1;
    RAISE EXCEPTION 'FAIL 9: snapshot readable by authenticated';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS 9: snapshot table not readable by authenticated';
  END;
END $$;
RESET ROLE;

ROLLBACK;
