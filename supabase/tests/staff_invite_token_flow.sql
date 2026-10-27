-- =============================================================================
-- 20260928 staff invite token flow 회귀 테스트 (로컬/스테이징 전용 — 운영 DB 금지)
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/staff_invite_token_flow.sql
-- 전체가 하나의 트랜잭션이고 마지막에 ROLLBACK 한다. 실패 시 RAISE EXCEPTION.
-- =============================================================================
\set ON_ERROR_STOP 1
BEGIN;

SELECT set_config('t.owner',    gen_random_uuid()::text, true);
SELECT set_config('t.squatter', gen_random_uuid()::text, true);
SELECT set_config('t.invitee',  gen_random_uuid()::text, true);
SELECT set_config('t.other',    gen_random_uuid()::text, true);
SELECT set_config('t.org',      gen_random_uuid()::text, true);
SELECT set_config('t.staff',    gen_random_uuid()::text, true);
SELECT set_config('t.staff2',   gen_random_uuid()::text, true);

INSERT INTO auth.users (id, email) VALUES
  (current_setting('t.owner')::uuid,    'owner@staff.test'),
  -- 공격자가 교직원 초대 이메일로 먼저 가입(자동 인증)한 상황
  (current_setting('t.squatter')::uuid, 'teacher@staff.test'),
  (current_setting('t.invitee')::uuid,  'real.teacher@staff.test'),
  (current_setting('t.other')::uuid,    'other@staff.test');

INSERT INTO core.organizations (id, name) VALUES (current_setting('t.org')::uuid, '교직원학원');
INSERT INTO core.organization_members (organization_id, user_id, role)
VALUES (current_setting('t.org')::uuid, current_setting('t.owner')::uuid, 'owner');
INSERT INTO core.staff (id, organization_id, name) VALUES
  (current_setting('t.staff')::uuid,  current_setting('t.org')::uuid, '이선생'),
  (current_setting('t.staff2')::uuid, current_setting('t.org')::uuid, '최선생');

-- ---------- 1. 초대: 같은 이메일 계정이 있어도 즉시 연결하지 않음 ----------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner'), true);
SELECT set_config('t.r1', core.invite_staff_member(
  current_setting('t.org')::uuid, current_setting('t.staff')::uuid, 'Teacher@Staff.test')::text, true);
RESET ROLE;
DO $$
DECLARE r JSONB := current_setting('t.r1')::jsonb;
BEGIN
  IF r->>'status' <> 'invited' THEN RAISE EXCEPTION 'FAIL 1: status %', r->>'status'; END IF;
  IF (r->>'token') !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$' THEN
    RAISE EXCEPTION 'FAIL 1b: token format %', r->>'token';
  END IF;
  IF r->>'organization_name' <> '교직원학원' OR r->>'staff_name' <> '이선생' OR r->>'expires_at' IS NULL THEN
    RAISE EXCEPTION 'FAIL 1c: payload %', r;
  END IF;
  IF (SELECT user_id FROM core.staff WHERE id = current_setting('t.staff')::uuid) IS NOT NULL
     OR EXISTS (SELECT 1 FROM core.organization_members WHERE user_id = current_setting('t.squatter')::uuid) THEN
    RAISE EXCEPTION 'FAIL 1d: squatter auto-linked by email';
  END IF;
  IF (SELECT token_hash FROM core.staff_invitations WHERE staff_id = current_setting('t.staff')::uuid)
     <> encode(sha256(convert_to(r->>'token', 'UTF8')), 'hex') THEN
    RAISE EXCEPTION 'FAIL 1e: token hash mismatch';
  END IF;
  IF EXISTS (SELECT 1 FROM core.staff_invitations WHERE token_hash = r->>'token') THEN
    RAISE EXCEPTION 'FAIL 1f: raw token stored';
  END IF;
  PERFORM set_config('t.tok_old', r->>'token', true);
  RAISE NOTICE 'PASS 1: invite_staff_member -> invited + token, no email auto-link';
END $$;

-- ---------- 2. 로그인 시 자동 수락 없음 ----------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.squatter'), true);
SELECT set_config('t.r2', core.connect_staff_on_login()::text, true);
RESET ROLE;
DO $$
BEGIN
  IF (current_setting('t.r2')::jsonb->>'connected')::int <> 0
     OR EXISTS (SELECT 1 FROM core.organization_members WHERE user_id = current_setting('t.squatter')::uuid) THEN
    RAISE EXCEPTION 'FAIL 2: connect_staff_on_login linked squatter';
  END IF;
  RAISE NOTICE 'PASS 2: connect_staff_on_login still no-op';
END $$;

-- ---------- 3. 비관리자 초대 불가 / 직접 쓰기·조회 불가 ----------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.squatter'), true);
DO $$
DECLARE n INT;
BEGIN
  BEGIN
    PERFORM core.invite_staff_member(current_setting('t.org')::uuid, current_setting('t.staff2')::uuid, 'x@staff.test');
    RAISE EXCEPTION 'FAIL 3: non-admin invited';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
  END;
  SELECT count(*) INTO n FROM core.staff_invitations;  -- 이메일 일치 SELECT 정책 제거됨
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL 3b: invitee can read invitations (%)', n; END IF;
  RAISE NOTICE 'PASS 3: non-admin cannot invite or read invitations';
END $$;
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner'), true);
DO $$
BEGIN
  BEGIN
    INSERT INTO core.staff_invitations (organization_id, staff_id, email, role, status, token_hash, expires_at)
    VALUES (current_setting('t.org')::uuid, current_setting('t.staff2')::uuid, 'y@staff.test', 'owner', 'pending',
            encode(sha256(convert_to('CHOSENTOKEN1', 'UTF8')), 'hex'), now() + interval '1 day');
    RAISE EXCEPTION 'FAIL 3c: admin direct insert allowed';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS 3c: direct insert blocked (RPC only)';
  END;
END $$;
RESET ROLE;

-- ---------- 4. 재발급: 새 토큰 발급, 이전 토큰 무효 ----------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner'), true);
SELECT set_config('t.tok', core.invite_staff_member(
  current_setting('t.org')::uuid, current_setting('t.staff')::uuid, 'teacher@staff.test')->>'token', true);
SELECT set_config('request.jwt.claim.sub', current_setting('t.invitee'), true);
DO $$
BEGIN
  IF current_setting('t.tok') = current_setting('t.tok_old') THEN RAISE EXCEPTION 'FAIL 4: same token'; END IF;
  BEGIN
    PERFORM core.accept_staff_invite(current_setting('t.tok_old'));
    RAISE EXCEPTION 'FAIL 4b: old token still valid';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
  END;
  RAISE NOTICE 'PASS 4: reissue invalidates old token';
END $$;

-- ---------- 5. preview (소문자·구분자 허용) ----------
SELECT set_config('t.r5', core.preview_staff_invite(
  lower(substr(current_setting('t.tok'),1,4)) || '-' || substr(current_setting('t.tok'),5))::text, true);
DO $$
DECLARE r JSONB := current_setting('t.r5')::jsonb;
BEGIN
  IF r->>'organization_name' <> '교직원학원' OR r->>'staff_name' <> '이선생' OR r->>'role' <> 'staff' THEN
    RAISE EXCEPTION 'FAIL 5: preview %', r;
  END IF;
  IF EXISTS (SELECT 1 FROM core.organization_members WHERE user_id = current_setting('t.invitee')::uuid) THEN
    RAISE EXCEPTION 'FAIL 5b: preview linked account';
  END IF;
  RAISE NOTICE 'PASS 5: preview works without side effects';
END $$;

-- ---------- 6. 수락: 역할은 항상 staff ----------
RESET ROLE;
UPDATE core.staff_invitations SET role = 'owner' WHERE staff_id = current_setting('t.staff')::uuid;  -- 조작 가정
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.invitee'), true);
SELECT set_config('t.r6', core.accept_staff_invite(current_setting('t.tok'))::text, true);
RESET ROLE;
DO $$
DECLARE r JSONB := current_setting('t.r6')::jsonb; v_roles TEXT;
BEGIN
  IF (r->>'success')::boolean IS DISTINCT FROM true OR r->>'organization_id' <> current_setting('t.org') THEN
    RAISE EXCEPTION 'FAIL 6: accept %', r;
  END IF;
  SELECT string_agg(role::text, ',') INTO v_roles FROM core.organization_members
  WHERE organization_id = current_setting('t.org')::uuid AND user_id = current_setting('t.invitee')::uuid;
  IF v_roles IS DISTINCT FROM 'staff' THEN RAISE EXCEPTION 'FAIL 6b: roles %', v_roles; END IF;
  IF (SELECT user_id FROM core.staff WHERE id = current_setting('t.staff')::uuid) <> current_setting('t.invitee')::uuid THEN
    RAISE EXCEPTION 'FAIL 6c: staff.user_id not set';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM core.staff_invitations WHERE staff_id = current_setting('t.staff')::uuid
                 AND status = 'accepted' AND token_hash IS NULL
                 AND accepted_by = current_setting('t.invitee')::uuid) THEN
    RAISE EXCEPTION 'FAIL 6d: invitation not closed';
  END IF;
  RAISE NOTICE 'PASS 6: explicit accept links account as staff only';
END $$;

-- ---------- 7. 1회용: 재사용 불가 ----------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.other'), true);
DO $$
BEGIN
  BEGIN
    PERFORM core.accept_staff_invite(current_setting('t.tok'));
    RAISE EXCEPTION 'FAIL 7: token reused';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
    RAISE NOTICE 'PASS 7: single-use (%).', SQLERRM;
  END;
END $$;
RESET ROLE;

-- ---------- 8. 만료 / 9. 취소 ----------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner'), true);
SELECT set_config('t.tok2', core.invite_staff_member(
  current_setting('t.org')::uuid, current_setting('t.staff2')::uuid, 'choi@staff.test')->>'token', true);
RESET ROLE;
UPDATE core.staff_invitations SET expires_at = now() - interval '1 minute' WHERE staff_id = current_setting('t.staff2')::uuid;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.other'), true);
DO $$
BEGIN
  BEGIN
    PERFORM core.accept_staff_invite(current_setting('t.tok2'));
    RAISE EXCEPTION 'FAIL 8: expired token accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
    RAISE NOTICE 'PASS 8: expired token rejected';
  END;
END $$;
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner'), true);
SELECT set_config('t.st', core.get_staff_account_statuses(current_setting('t.org')::uuid)::text, true);
SELECT set_config('t.tok3', core.invite_staff_member(
  current_setting('t.org')::uuid, current_setting('t.staff2')::uuid, 'choi@staff.test')->>'token', true);
SELECT core.revoke_staff_invitation(current_setting('t.org')::uuid, current_setting('t.staff2')::uuid);
SELECT set_config('request.jwt.claim.sub', current_setting('t.other'), true);
DO $$
DECLARE s JSONB;
BEGIN
  BEGIN
    PERFORM core.accept_staff_invite(current_setting('t.tok3'));
    RAISE EXCEPTION 'FAIL 9: revoked token accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
  END;
  SELECT e INTO s FROM jsonb_array_elements(current_setting('t.st')::jsonb) e
  WHERE e->>'staff_id' = current_setting('t.staff2');
  IF s->>'status' <> 'invited' OR (s->>'invite_expired')::boolean IS DISTINCT FROM true
     OR (s->>'invite_has_code')::boolean IS DISTINCT FROM true OR s->>'invite_expires_at' IS NULL THEN
    RAISE EXCEPTION 'FAIL 9b: status payload %', s;
  END IF;
  RAISE NOTICE 'PASS 9: revoked token rejected; statuses expose expiry';
END $$;
RESET ROLE;

-- ---------- 10. 레거시 1-인자 오버로드 제거: 인자 1개 호출도 안전한 (TEXT,JSONB) 로 해석 ----------
SELECT set_config('t.parent',  gen_random_uuid()::text, true);
SELECT set_config('t.student', gen_random_uuid()::text, true);
INSERT INTO core.customers (id, organization_id, name, email, metadata) VALUES
  (current_setting('t.parent')::uuid,  current_setting('t.org')::uuid, '박학부', 'p@staff.test', '{"entityType":"parent"}'),
  (current_setting('t.student')::uuid, current_setting('t.org')::uuid, '박학생', NULL, '{"entityType":"student"}');
INSERT INTO core.parent_student_links (organization_id, parent_customer_id, student_customer_id)
VALUES (current_setting('t.org')::uuid, current_setting('t.parent')::uuid, current_setting('t.student')::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner'), true);
SELECT set_config('t.ptok', core.invite_parent_member(
  current_setting('t.org')::uuid, current_setting('t.parent')::uuid, 'p@staff.test')->'link_codes'->0->>'token', true);
SELECT set_config('request.jwt.claim.sub', current_setting('t.other'), true);
SELECT set_config('t.r10', core.redeem_guardian_link_token(current_setting('t.ptok')::text)::text, true);
RESET ROLE;
DO $$
BEGIN
  IF (current_setting('t.r10')::jsonb->>'success')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'FAIL 10: legacy redeem %', current_setting('t.r10');
  END IF;
  -- 2-인자 경로만 수행하는 동작: 학부모 고객 연결 + 동의 기록
  IF (SELECT user_id FROM core.customers WHERE id = current_setting('t.parent')::uuid) IS DISTINCT FROM current_setting('t.other')::uuid
     OR NOT EXISTS (SELECT 1 FROM core.academy_data_sharing_consents WHERE organization_id = current_setting('t.org')::uuid) THEN
    RAISE EXCEPTION 'FAIL 10b: single-arg call did not use 2-arg path';
  END IF;
  IF to_regprocedure('core.redeem_guardian_link_token(text)') IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL 10c: legacy overload still exists';
  END IF;
  RAISE NOTICE 'PASS 10: single-arg redeem call resolves to redeem(TEXT,JSONB)';
END $$;

-- ---------- 11. register_auth_provider: 클라이언트 email 불신 ----------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.other'), true);
SELECT core.register_auth_provider('kakao', 'kakao-123', 'owner@staff.test', NULL, '{}'::jsonb);
DO $$
BEGIN
  BEGIN
    PERFORM core.register_auth_provider('email', 'owner@staff.test', 'owner@staff.test', NULL, '{}'::jsonb);
    RAISE EXCEPTION 'FAIL 11: foreign email identity registered';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
  END;
END $$;
RESET ROLE;
DO $$
BEGIN
  IF (SELECT email FROM core.auth_providers WHERE provider = 'kakao' AND provider_user_id = 'kakao-123')
     IS DISTINCT FROM 'other@staff.test' THEN
    RAISE EXCEPTION 'FAIL 11b: client email trusted';
  END IF;
  RAISE NOTICE 'PASS 11: register_auth_provider ignores client email; email identity must be own';
END $$;

ROLLBACK;
