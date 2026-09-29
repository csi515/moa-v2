-- =============================================================================
-- 20260928150000 guardian link hardening 회귀 테스트 (로컬/스테이징 전용 — 운영 DB 금지)
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/guardian_link_hardening.sql
-- 전체가 하나의 트랜잭션이고 마지막에 ROLLBACK 한다. 실패 시 RAISE EXCEPTION.
-- =============================================================================
\set ON_ERROR_STOP 1
BEGIN;

-- Supabase 운영처럼 pgcrypto 가 extensions 스키마에만 있는 상황을 재현:
-- 로컬 전용 public.digest shim 을 (트랜잭션 안에서) 제거해도 모든 토큰 RPC 가 동작해야 함.
DROP FUNCTION IF EXISTS public.digest(text, text);
DROP FUNCTION IF EXISTS public.digest(bytea, text);

SELECT set_config('t.owner',    gen_random_uuid()::text, true);
SELECT set_config('t.member',   gen_random_uuid()::text, true);
SELECT set_config('t.p1',       gen_random_uuid()::text, true);
SELECT set_config('t.p2',       gen_random_uuid()::text, true);
SELECT set_config('t.p3',       gen_random_uuid()::text, true);
SELECT set_config('t.p4',       gen_random_uuid()::text, true);
SELECT set_config('t.attacker', gen_random_uuid()::text, true);
SELECT set_config('t.org',      gen_random_uuid()::text, true);
SELECT set_config('t.s1',       gen_random_uuid()::text, true);
SELECT set_config('t.s2',       gen_random_uuid()::text, true);
SELECT set_config('t.s3',       gen_random_uuid()::text, true);
SELECT set_config('t.pc',       gen_random_uuid()::text, true);

INSERT INTO auth.users (id, email) VALUES
  (current_setting('t.owner')::uuid,    'owner@glh.test'),
  (current_setting('t.member')::uuid,   'member@glh.test'),
  (current_setting('t.p1')::uuid,       'p1@glh.test'),
  (current_setting('t.p2')::uuid,       'p2@glh.test'),
  (current_setting('t.p3')::uuid,       'p3@glh.test'),
  (current_setting('t.p4')::uuid,       'p4@glh.test'),
  (current_setting('t.attacker')::uuid, 'attacker@glh.test');

INSERT INTO core.organizations (id, name) VALUES (current_setting('t.org')::uuid, '보강학원');
INSERT INTO core.organization_members (organization_id, user_id, role) VALUES
  (current_setting('t.org')::uuid, current_setting('t.owner')::uuid,  'owner'),
  (current_setting('t.org')::uuid, current_setting('t.member')::uuid, 'staff');

INSERT INTO core.customers (id, organization_id, name, metadata) VALUES
  (current_setting('t.s1')::uuid, current_setting('t.org')::uuid, '가학생', '{"entityType":"student"}'),
  (current_setting('t.s2')::uuid, current_setting('t.org')::uuid, '나학생', '{"entityType":"student"}'),
  (current_setting('t.s3')::uuid, current_setting('t.org')::uuid, '다학생', '{"entityType":"student"}'),
  (current_setting('t.pc')::uuid, current_setting('t.org')::uuid, '다학부모', '{"entityType":"parent"}');

-- 이 조직에 이미 학부모 고객으로 연결된 계정(p1~p4).
-- 고객이 없는 신규 계정 경로는 supabase/tests/guardian_redeem_new_parent.sql (20260928160000) 에서 검증.
INSERT INTO core.customers (organization_id, name, email, user_id, metadata)
SELECT current_setting('t.org')::uuid, v.n, v.e, current_setting(v.k)::uuid, '{"entityType":"parent"}'
FROM (VALUES ('t.p1', '일학부모', 'p1@glh.test'), ('t.p2', '이학부모', 'p2@glh.test'),
             ('t.p3', '삼학부모', 'p3@glh.test'), ('t.p4', '사학부모', 'p4@glh.test')) AS v(k, n, e);

-- customers → students/enrollments 브리지가 트리거로 없을 수 있으므로 보장
INSERT INTO core.students (id, display_name)
SELECT c.id, c.name FROM core.customers c
WHERE c.organization_id = current_setting('t.org')::uuid AND c.metadata->>'entityType' = 'student'
ON CONFLICT (id) DO NOTHING;
INSERT INTO core.student_enrollments (student_id, organization_id, customer_id, status)
SELECT c.id, c.organization_id, c.id, 'active' FROM core.customers c
WHERE c.organization_id = current_setting('t.org')::uuid AND c.metadata->>'entityType' = 'student'
ON CONFLICT (customer_id) DO NOTHING;

SELECT set_config('t.st1', (SELECT student_id::text FROM core.student_enrollments WHERE customer_id = current_setting('t.s1')::uuid), true);
SELECT set_config('t.st2', (SELECT student_id::text FROM core.student_enrollments WHERE customer_id = current_setting('t.s2')::uuid), true);
SELECT set_config('t.st3', (SELECT student_id::text FROM core.student_enrollments WHERE customer_id = current_setting('t.s3')::uuid), true);

-- ---------- 0. digest() 비의존 + 정규화 ----------
DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n
  FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
  WHERE ns.nspname = 'core'
    AND p.proname IN ('create_guardian_link_token', 'create_parent_invite_link_tokens',
                      'preview_guardian_link_token', 'redeem_guardian_link_token',
                      'get_parent_invite_email_context')
    AND p.prosrc ~ 'digest\(';
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL 0: % token RPC(s) still call digest()', n; END IF;
  IF core.normalize_guardian_link_code(' abcd-o1il ') <> 'ABCD0111' THEN
    RAISE EXCEPTION 'FAIL 0b: normalize %', core.normalize_guardian_link_code(' abcd-o1il ');
  END IF;
  IF core.guardian_link_code_hash('abcd1234') <> encode(sha256(convert_to('ABCD1234', 'UTF8')), 'hex') THEN
    RAISE EXCEPTION 'FAIL 0c: hash';
  END IF;
  IF core.guardian_link_code_hash('  ') IS NOT NULL THEN RAISE EXCEPTION 'FAIL 0d: empty hash'; END IF;
  RAISE NOTICE 'PASS 0: token RPCs no longer use digest(); normalize/hash helpers';
END $$;

-- ---------- 1. 새 코드 형식·1회용·7일 ----------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner'), true);
SELECT set_config('t.r1', core.create_guardian_link_token(
  current_setting('t.org')::uuid, current_setting('t.s1')::uuid, 30, 5)::text, true);
RESET ROLE;
DO $$
DECLARE r JSONB := current_setting('t.r1')::jsonb; t RECORD;
BEGIN
  IF (r->>'token') !~ '^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{20}$' THEN
    RAISE EXCEPTION 'FAIL 1: token format %', r->>'token';
  END IF;
  SELECT * INTO t FROM core.guardian_link_tokens WHERE id = (r->>'id')::uuid;
  IF t.max_uses <> 1 THEN RAISE EXCEPTION 'FAIL 1b: max_uses %', t.max_uses; END IF;
  IF t.expires_at > now() + interval '7 days' + interval '1 minute' THEN
    RAISE EXCEPTION 'FAIL 1c: expiry % > 7d', t.expires_at;
  END IF;
  IF t.token_hash <> encode(sha256(convert_to(r->>'token', 'UTF8')), 'hex') THEN
    RAISE EXCEPTION 'FAIL 1d: hash mismatch';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM core.audit_logs WHERE entity_type = 'guardian_link'
                 AND action = 'guardian_link.issue' AND entity_id = r->>'id') THEN
    RAISE EXCEPTION 'FAIL 1e: issue audit missing';
  END IF;
  PERFORM set_config('t.tok_old', r->>'token', true);
  RAISE NOTICE 'PASS 1: 20-char Crockford token, max_uses=1, <=7d, sha256 hash, audit';
END $$;

-- ---------- 2. 재발급 → 이전 코드 자동 폐기 ----------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner'), true);
SELECT set_config('t.r2', core.create_guardian_link_token(
  current_setting('t.org')::uuid, current_setting('t.s1')::uuid)::text, true);
SELECT set_config('request.jwt.claim.sub', current_setting('t.p1'), true);
SELECT set_config('t.pv_old', core.preview_guardian_link_token(current_setting('t.tok_old'))::text, true);
SELECT set_config('t.pv_new', core.preview_guardian_link_token(
  lower(current_setting('t.r2')::jsonb->>'token'))::text, true);
RESET ROLE;
DO $$
DECLARE r JSONB := current_setting('t.r2')::jsonb;
BEGIN
  IF (r->>'revoked_previous')::int <> 1 THEN RAISE EXCEPTION 'FAIL 2: revoked_previous %', r; END IF;
  IF current_setting('t.pv_old')::jsonb->>'status' <> 'invalid_or_expired'
     OR (current_setting('t.pv_old')::jsonb->>'valid')::boolean THEN
    RAISE EXCEPTION 'FAIL 2b: old token preview %', current_setting('t.pv_old');
  END IF;
  IF NOT (current_setting('t.pv_new')::jsonb->>'valid')::boolean
     OR current_setting('t.pv_new')::jsonb->>'organization_name' <> '보강학원'
     OR current_setting('t.pv_new')::jsonb->>'student_name' <> '가학생' THEN
    RAISE EXCEPTION 'FAIL 2c: new token preview %', current_setting('t.pv_new');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM core.guardian_link_tokens WHERE token_hash = core.guardian_link_code_hash(current_setting('t.tok_old'))
                 AND used_count >= max_uses AND metadata->>'revoked' = 'true' AND metadata->>'revoked_reason' = 'reissued') THEN
    RAISE EXCEPTION 'FAIL 2d: old token not marked revoked';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM core.audit_logs WHERE action = 'guardian_link.preview' AND entity_id = r->>'id') THEN
    RAISE EXCEPTION 'FAIL 2e: preview audit missing';
  END IF;
  IF (SELECT count(*) FROM core.guardian_link_attempts WHERE user_id = current_setting('t.p1')::uuid AND action = 'preview') <> 2 THEN
    RAISE EXCEPTION 'FAIL 2f: preview attempts not recorded';
  END IF;
  RAISE NOTICE 'PASS 2: reissue revokes previous token; preview returns status JSON; attempts+audit';
END $$;

-- ---------- 3. redeem 성공 + 알림 + 감사 + 재사용 불가 ----------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.p1'), true);
SELECT set_config('t.rd1', core.redeem_guardian_link_token(current_setting('t.r2')::jsonb->>'token')::text, true);
SELECT set_config('t.rd1b', core.redeem_guardian_link_token(current_setting('t.r2')::jsonb->>'token')::text, true);
RESET ROLE;
DO $$
DECLARE r JSONB := current_setting('t.rd1')::jsonb; rb JSONB := current_setting('t.rd1b')::jsonb;
BEGIN
  IF NOT (r->>'success')::boolean OR r->>'status' <> 'linked' OR r->>'student_name' <> '가학생' THEN
    RAISE EXCEPTION 'FAIL 3: redeem %', r;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM core.parent_student_guardians g JOIN core.parents p ON p.id = g.parent_id
                 WHERE g.student_id = current_setting('t.st1')::uuid AND p.user_id = current_setting('t.p1')::uuid) THEN
    RAISE EXCEPTION 'FAIL 3b: guardian not linked';
  END IF;
  IF (rb->>'success')::boolean OR rb->>'status' <> 'invalid_or_expired' THEN
    RAISE EXCEPTION 'FAIL 3c: token reused %', rb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM core.notifications WHERE organization_id = current_setting('t.org')::uuid
                 AND type = 'guardian_linked' AND metadata->>'student_id' = current_setting('t.st1')) THEN
    RAISE EXCEPTION 'FAIL 3d: staff notification missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM core.audit_logs WHERE action = 'guardian_link.redeem'
                 AND entity_id = current_setting('t.r2')::jsonb->>'id' AND after_data->>'status' = 'linked') THEN
    RAISE EXCEPTION 'FAIL 3e: redeem audit missing';
  END IF;
  IF (SELECT metadata->>'redeemed_by' FROM core.guardian_link_tokens WHERE id = (current_setting('t.r2')::jsonb->>'id')::uuid)
     <> current_setting('t.p1') THEN
    RAISE EXCEPTION 'FAIL 3f: redeemed_by missing';
  END IF;
  IF (SELECT count(*) FROM core.guardian_link_attempts WHERE user_id = current_setting('t.p1')::uuid
      AND action = 'redeem' AND success = false AND reason = 'invalid_or_expired') <> 1 THEN
    RAISE EXCEPTION 'FAIL 3g: failed redeem attempt not persisted';
  END IF;
  RAISE NOTICE 'PASS 3: redeem links once, notification + audit + attempts, reuse rejected without exception';
END $$;

-- ---------- 4. 기존 8자리 코드 호환 + 직접 INSERT 규칙 강제 ----------
INSERT INTO core.guardian_link_tokens (organization_id, student_id, enrollment_id, token_hash, expires_at, max_uses, metadata)
SELECT current_setting('t.org')::uuid, se.student_id, se.id,
       encode(sha256(convert_to('ABCD1234', 'UTF8')), 'hex'), now() + interval '14 days', 5,
       jsonb_build_object('customer_id', se.customer_id, 'student_name', '다학생')
FROM core.student_enrollments se WHERE se.customer_id = current_setting('t.s3')::uuid;
UPDATE core.guardian_link_tokens SET max_uses = 9, expires_at = now() + interval '30 days'
WHERE token_hash = encode(sha256(convert_to('ABCD1234', 'UTF8')), 'hex');
DO $$
DECLARE t RECORD;
BEGIN
  SELECT * INTO t FROM core.guardian_link_tokens WHERE token_hash = encode(sha256(convert_to('ABCD1234', 'UTF8')), 'hex');
  IF t.max_uses <> 1 OR t.expires_at > now() + interval '7 days' + interval '1 minute' THEN
    RAISE EXCEPTION 'FAIL 4: trigger did not force limits (max_uses %, expires %)', t.max_uses, t.expires_at;
  END IF;
  RAISE NOTICE 'PASS 4a: direct insert/update cannot raise max_uses or extend expiry';
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.p2'), true);
SELECT set_config('t.rd4', core.redeem_guardian_link_token('abcd-1234', '["display_name"]'::jsonb)::text, true);
RESET ROLE;
DO $$
DECLARE r JSONB := current_setting('t.rd4')::jsonb;
BEGIN
  IF NOT (r->>'success')::boolean OR r->>'student_name' <> '다학생' THEN
    RAISE EXCEPTION 'FAIL 4b: legacy 8-char token not redeemable %', r;
  END IF;
  RAISE NOTICE 'PASS 4b: legacy 8-char hex token still redeemable (case/dash tolerant)';
END $$;

-- ---------- 5. 퇴원 등록은 재활성화하지 않고 승인 대기 요청 생성 ----------
UPDATE core.student_enrollments SET status = 'withdrawn', left_at = CURRENT_DATE
WHERE customer_id = current_setting('t.s2')::uuid;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner'), true);
SELECT set_config('t.r5', core.create_guardian_link_token(
  current_setting('t.org')::uuid, current_setting('t.s2')::uuid)::text, true);
SELECT set_config('request.jwt.claim.sub', current_setting('t.p1'), true);
SELECT set_config('t.rd5', core.redeem_guardian_link_token(current_setting('t.r5')::jsonb->>'token')::text, true);
RESET ROLE;
DO $$
DECLARE r JSONB := current_setting('t.rd5')::jsonb; st TEXT;
BEGIN
  IF NOT (r->>'success')::boolean OR r->>'status' <> 'linked_enrollment_pending' OR r->>'enrollment_request_id' IS NULL THEN
    RAISE EXCEPTION 'FAIL 5: redeem withdrawn %', r;
  END IF;
  SELECT status::text INTO st FROM core.student_enrollments WHERE customer_id = current_setting('t.s2')::uuid;
  IF st <> 'withdrawn' THEN RAISE EXCEPTION 'FAIL 5b: enrollment silently reactivated (%)', st; END IF;
  IF NOT EXISTS (SELECT 1 FROM core.guardian_enrollment_requests
                 WHERE id = (r->>'enrollment_request_id')::uuid AND status = 'pending'
                   AND metadata->>'source' = 'guardian_link_redeem') THEN
    RAISE EXCEPTION 'FAIL 5c: pending enrollment request missing';
  END IF;
  PERFORM set_config('t.req5', r->>'enrollment_request_id', true);
  RAISE NOTICE 'PASS 5: withdrawn enrollment stays withdrawn; pending guardian_enrollment_request created';
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner'), true);
SELECT core.approve_guardian_enrollment(current_setting('t.req5')::uuid) IS NOT NULL AS approved;
RESET ROLE;
DO $$
BEGIN
  IF (SELECT status::text FROM core.student_enrollments WHERE customer_id = current_setting('t.s2')::uuid) <> 'active' THEN
    RAISE EXCEPTION 'FAIL 5d: staff approval did not reactivate';
  END IF;
  RAISE NOTICE 'PASS 5d: staff approve_guardian_enrollment reactivates enrollment';
END $$;

-- ---------- 6. 학생당 보호자 상한 (기본 2) ----------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner'), true);
SELECT set_config('t.r6a', core.create_guardian_link_token(current_setting('t.org')::uuid, current_setting('t.s1')::uuid)->>'token', true);
SELECT set_config('request.jwt.claim.sub', current_setting('t.p3'), true);
SELECT set_config('t.rd6a', core.redeem_guardian_link_token(current_setting('t.r6a'))::text, true);
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner'), true);
SELECT set_config('t.r6b', core.create_guardian_link_token(current_setting('t.org')::uuid, current_setting('t.s1')::uuid)->>'token', true);
SELECT set_config('request.jwt.claim.sub', current_setting('t.p4'), true);
SELECT set_config('t.pv6b', core.preview_guardian_link_token(current_setting('t.r6b'))::text, true);
SELECT set_config('t.rd6b', core.redeem_guardian_link_token(current_setting('t.r6b'))::text, true);
-- 이미 연결된 보호자(p1)의 재연결은 상한과 무관
SELECT set_config('request.jwt.claim.sub', current_setting('t.p1'), true);
SELECT set_config('t.rd6c', core.redeem_guardian_link_token(current_setting('t.r6b'))::text, true);
RESET ROLE;
DO $$
BEGIN
  IF NOT (current_setting('t.rd6a')::jsonb->>'success')::boolean THEN
    RAISE EXCEPTION 'FAIL 6: second guardian rejected %', current_setting('t.rd6a');
  END IF;
  IF current_setting('t.pv6b')::jsonb->>'status' <> 'guardian_limit_reached' THEN
    RAISE EXCEPTION 'FAIL 6b: preview did not report limit %', current_setting('t.pv6b');
  END IF;
  IF (current_setting('t.rd6b')::jsonb->>'success')::boolean
     OR current_setting('t.rd6b')::jsonb->>'status' <> 'guardian_limit_reached' THEN
    RAISE EXCEPTION 'FAIL 6c: third guardian linked %', current_setting('t.rd6b');
  END IF;
  IF NOT (current_setting('t.rd6c')::jsonb->>'success')::boolean THEN
    RAISE EXCEPTION 'FAIL 6d: token consumed by rejected redeem / existing guardian blocked %', current_setting('t.rd6c');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM core.audit_logs WHERE action = 'guardian_link.redeem_rejected'
                 AND after_data->>'reason' = 'guardian_limit_reached') THEN
    RAISE EXCEPTION 'FAIL 6e: limit audit missing';
  END IF;
  RAISE NOTICE 'PASS 6: max 2 account guardians per student (preview+redeem), token not consumed on rejection';
END $$;
-- 트리거 백스톱: 직접 INSERT 도 차단
DO $$
BEGIN
  BEGIN
    INSERT INTO core.parent_student_guardians (parent_id, student_id)
    SELECT p.id, current_setting('t.st1')::uuid FROM core.parents p WHERE p.user_id = current_setting('t.p4')::uuid LIMIT 1;
    RAISE EXCEPTION 'FAIL 6f: trigger allowed third account guardian';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS 6f: BEFORE INSERT trigger blocks third account guardian';
  END;
END $$;
-- 계정 없는 보호자(직원 등록)는 상한에 포함되지 않음
DO $$
DECLARE v_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO core.parents (id, user_id, name) VALUES (v_id, NULL, '계정없는보호자');
  INSERT INTO core.parent_student_guardians (parent_id, student_id) VALUES (v_id, current_setting('t.st1')::uuid);
  RAISE NOTICE 'PASS 6g: guardians without accounts are not capped';
END $$;

-- 직원이 parent_student_links 로 명시 연결(동기화 트리거 경유)한 계정 보호자는 상한 예외
SELECT set_config('t.p5', gen_random_uuid()::text, true);
SELECT set_config('t.pc5', gen_random_uuid()::text, true);
INSERT INTO auth.users (id, email) VALUES (current_setting('t.p5')::uuid, 'p5@glh.test');
INSERT INTO core.customers (id, organization_id, name, email, user_id, metadata)
VALUES (current_setting('t.pc5')::uuid, current_setting('t.org')::uuid, '오학부모', 'p5@glh.test',
        current_setting('t.p5')::uuid, '{"entityType":"parent"}');
INSERT INTO core.parent_student_links (organization_id, parent_customer_id, student_customer_id)
VALUES (current_setting('t.org')::uuid, current_setting('t.pc5')::uuid, current_setting('t.s1')::uuid);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM core.parent_student_guardians
                 WHERE parent_id = current_setting('t.pc5')::uuid AND student_id = current_setting('t.st1')::uuid) THEN
    RAISE EXCEPTION 'FAIL 6h: staff link sync did not create guardian';
  END IF;
  RAISE NOTICE 'PASS 6h: staff-sanctioned parent_student_links sync is not blocked by the cap';
END $$;

-- ---------- 7. 학부모 초대 코드: 14일 요청도 7일, 동일 학부모 재발급만 폐기 ----------
INSERT INTO core.parent_student_links (organization_id, parent_customer_id, student_customer_id)
VALUES (current_setting('t.org')::uuid, current_setting('t.pc')::uuid, current_setting('t.s3')::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner'), true);
SELECT set_config('t.g7', core.create_guardian_link_token(current_setting('t.org')::uuid, current_setting('t.s3')::uuid)->>'token', true);
SELECT set_config('t.i7a', core.create_parent_invite_link_tokens(current_setting('t.org')::uuid, current_setting('t.pc')::uuid, 14)::text, true);
SELECT set_config('t.i7b', core.create_parent_invite_link_tokens(current_setting('t.org')::uuid, current_setting('t.pc')::uuid, 14)::text, true);
RESET ROLE;
DO $$
DECLARE a JSONB := current_setting('t.i7a')::jsonb -> 0; b JSONB := current_setting('t.i7b')::jsonb -> 0;
BEGIN
  IF (a->>'token') !~ '^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{20}$' THEN RAISE EXCEPTION 'FAIL 7: invite token format %', a; END IF;
  IF (a->>'expires_at')::timestamptz > now() + interval '7 days' + interval '1 minute' THEN
    RAISE EXCEPTION 'FAIL 7b: invite expiry %', a->>'expires_at';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM core.guardian_link_tokens WHERE token_hash = core.guardian_link_code_hash(a->>'token')
                 AND metadata->>'revoked' = 'true') THEN
    RAISE EXCEPTION 'FAIL 7c: previous parent invite token not revoked';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM core.guardian_link_tokens WHERE token_hash = core.guardian_link_code_hash(b->>'token')
                 AND used_count < max_uses) THEN
    RAISE EXCEPTION 'FAIL 7d: new parent invite token inactive';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM core.guardian_link_tokens WHERE token_hash = core.guardian_link_code_hash(current_setting('t.g7'))
                 AND used_count < max_uses) THEN
    RAISE EXCEPTION 'FAIL 7e: generic token revoked by parent-invite reissue';
  END IF;
  RAISE NOTICE 'PASS 7: parent invite tokens 20-char, capped 7d, reissue scoped per parent';
END $$;

-- ---------- 8. 구성원(비관리자) 토큰 해시 직접 조회 불가, 목록 RPC 는 가능 ----------
-- Supabase 는 core 테이블에 authenticated SELECT 권한이 있을 수 있으므로 RLS 만으로 막히는지 확인
GRANT SELECT ON core.guardian_link_tokens TO authenticated;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.member'), true);
DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM core.guardian_link_tokens;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL 8: member can read token hashes (%)', n; END IF;
  IF jsonb_array_length(core.list_guardian_link_tokens(current_setting('t.org')::uuid)) < 1 THEN
    RAISE EXCEPTION 'FAIL 8b: list RPC empty';
  END IF;
  BEGIN
    PERFORM count(*) FROM core.guardian_link_attempts;
    RAISE EXCEPTION 'FAIL 8c: attempts table readable';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASS 8: member cannot select tokens/attempts; list RPC works';
END $$;
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner'), true);
DO $$
BEGIN
  IF (SELECT count(*) FROM core.guardian_link_tokens) = 0 THEN RAISE EXCEPTION 'FAIL 8d: admin cannot read'; END IF;
  RAISE NOTICE 'PASS 8d: admin policy intact';
END $$;
RESET ROLE;

-- ---------- 9. rate limit: 실패 누적 시 차단, 기록은 유지 ----------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.attacker'), true);
DO $$
DECLARE i INT; r JSONB;
BEGIN
  FOR i IN 1..10 LOOP
    r := core.redeem_guardian_link_token(upper(substr(md5(random()::text), 1, 20)));
    IF r->>'status' <> 'invalid_or_expired' THEN RAISE EXCEPTION 'FAIL 9: attempt % -> %', i, r; END IF;
  END LOOP;
  r := core.preview_guardian_link_token(current_setting('t.g7'));
  IF r->>'status' <> 'rate_limited' OR (r->>'retry_after_seconds')::int < 1 THEN
    RAISE EXCEPTION 'FAIL 9b: not rate limited after failures %', r;
  END IF;
  r := core.redeem_guardian_link_token(current_setting('t.g7'));
  IF r->>'status' <> 'rate_limited' THEN RAISE EXCEPTION 'FAIL 9c: redeem not rate limited %', r; END IF;
END $$;
RESET ROLE;
DO $$
BEGIN
  IF (SELECT count(*) FROM core.guardian_link_attempts WHERE user_id = current_setting('t.attacker')::uuid) <> 12 THEN
    RAISE EXCEPTION 'FAIL 9d: attempts not persisted (%)',
      (SELECT count(*) FROM core.guardian_link_attempts WHERE user_id = current_setting('t.attacker')::uuid);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM core.guardian_link_tokens WHERE token_hash = core.guardian_link_code_hash(current_setting('t.g7'))
                 AND used_count = 0) THEN
    RAISE EXCEPTION 'FAIL 9e: rate-limited redeem consumed token';
  END IF;
  IF NOT (core.check_rate_limit(current_setting('t.attacker')::uuid, 'guardian_link_failure_per_user')->>'allowed')::boolean IS FALSE THEN
    RAISE EXCEPTION 'FAIL 9f: check_rate_limit branch';
  END IF;
  RAISE NOTICE 'PASS 9: per-user failure limit blocks preview/redeem; attempts persisted; token untouched';
END $$;

-- 코드당 시도 제한
SELECT set_config('t.n9', (SELECT count(*)::text FROM core.guardian_link_attempts
  WHERE token_hash = core.guardian_link_code_hash(current_setting('t.g7'))
    AND COALESCE(reason, '') <> 'rate_limited'), true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.p2'), true);
DO $$
DECLARE i INT; r JSONB;
BEGIN
  FOR i IN (current_setting('t.n9')::int + 1)..10 LOOP
    r := core.preview_guardian_link_token(current_setting('t.g7'));
    IF NOT (r->>'valid')::boolean THEN RAISE EXCEPTION 'FAIL 9g: preview % -> %', i, r; END IF;
  END LOOP;
  r := core.preview_guardian_link_token(current_setting('t.g7'));
  IF r->>'status' <> 'rate_limited' THEN RAISE EXCEPTION 'FAIL 9h: per-token limit not applied %', r; END IF;
  RAISE NOTICE 'PASS 9h: per-token attempt window applied';
END $$;
RESET ROLE;

-- ---------- 10. 시그니처 호환 ----------
DO $$
BEGIN
  PERFORM 'core.redeem_guardian_link_token(text,jsonb)'::regprocedure;
  PERFORM 'core.preview_guardian_link_token(text)'::regprocedure;
  PERFORM 'core.create_guardian_link_token(uuid,uuid,integer,integer)'::regprocedure;
  PERFORM 'core.create_parent_invite_link_tokens(uuid,uuid,integer)'::regprocedure;
  PERFORM 'core.list_guardian_link_tokens(uuid)'::regprocedure;
  PERFORM 'core.revoke_guardian_link_token(uuid,uuid)'::regprocedure;
  PERFORM 'core.check_rate_limit(uuid,text)'::regprocedure;
  RAISE NOTICE 'PASS 10: RPC signatures unchanged';
END $$;

ROLLBACK;
