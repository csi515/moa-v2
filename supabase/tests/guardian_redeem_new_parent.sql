-- =============================================================================
-- 20260928160000 신규 학부모 redeem / 재지정 차단 회귀 테스트 (로컬/스테이징 전용 — 운영 DB 금지)
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/guardian_redeem_new_parent.sql
-- 전체가 하나의 트랜잭션이고 마지막에 ROLLBACK 한다. 실패 시 RAISE EXCEPTION.
-- =============================================================================
\set ON_ERROR_STOP 1
BEGIN;

DROP FUNCTION IF EXISTS public.digest(text, text);
DROP FUNCTION IF EXISTS public.digest(bytea, text);

SELECT set_config('t.owner_a', gen_random_uuid()::text, true);
SELECT set_config('t.owner_b', gen_random_uuid()::text, true);
SELECT set_config('t.new1',    gen_random_uuid()::text, true);  -- 완전 신규
SELECT set_config('t.glob',    gen_random_uuid()::text, true);  -- 전역 parents 만 있음
SELECT set_config('t.multi',   gen_random_uuid()::text, true);  -- org A 연결 후 org B
SELECT set_config('t.mail',    gen_random_uuid()::text, true);  -- 직원 등록 고객과 이메일 일치
SELECT set_config('t.victim',  gen_random_uuid()::text, true);
SELECT set_config('t.attacker',gen_random_uuid()::text, true);
SELECT set_config('t.org_a',   gen_random_uuid()::text, true);
SELECT set_config('t.org_b',   gen_random_uuid()::text, true);

INSERT INTO auth.users (id, email) VALUES
  (current_setting('t.owner_a')::uuid,  'owner.a@grn.test'),
  (current_setting('t.owner_b')::uuid,  'owner.b@grn.test'),
  (current_setting('t.new1')::uuid,     'new1@grn.test'),
  (current_setting('t.glob')::uuid,     'glob@grn.test'),
  (current_setting('t.multi')::uuid,    'multi@grn.test'),
  (current_setting('t.mail')::uuid,     'mail.parent@grn.test'),
  (current_setting('t.victim')::uuid,   'victim@grn.test'),
  (current_setting('t.attacker')::uuid, 'attacker@grn.test');

INSERT INTO core.organizations (id, name) VALUES
  (current_setting('t.org_a')::uuid, '에이학원'),
  (current_setting('t.org_b')::uuid, '비학원');
INSERT INTO core.organization_members (organization_id, user_id, role) VALUES
  (current_setting('t.org_a')::uuid, current_setting('t.owner_a')::uuid, 'owner'),
  (current_setting('t.org_b')::uuid, current_setting('t.owner_b')::uuid, 'owner');

-- 학생 고객 (트리거가 students/enrollments 생성, id = students.id)
CREATE TEMP TABLE t_students (k TEXT PRIMARY KEY, id UUID, org UUID) ON COMMIT DROP;
INSERT INTO t_students VALUES
  ('a1', gen_random_uuid(), current_setting('t.org_a')::uuid),
  ('a2', gen_random_uuid(), current_setting('t.org_a')::uuid),
  ('b1', gen_random_uuid(), current_setting('t.org_b')::uuid),
  ('b2', gen_random_uuid(), current_setting('t.org_b')::uuid),
  ('b3', gen_random_uuid(), current_setting('t.org_b')::uuid),
  ('b4', gen_random_uuid(), current_setting('t.org_b')::uuid),
  ('b5', gen_random_uuid(), current_setting('t.org_b')::uuid),
  ('b6', gen_random_uuid(), current_setting('t.org_b')::uuid);
INSERT INTO core.customers (id, organization_id, name, metadata)
SELECT id, org, '학생' || k, '{"entityType":"student"}' FROM t_students;
GRANT SELECT ON t_students TO authenticated;

CREATE OR REPLACE FUNCTION pg_temp.sid(p_k TEXT) RETURNS UUID LANGUAGE sql AS
  $$ SELECT id FROM t_students WHERE k = p_k $$;
CREATE OR REPLACE FUNCTION pg_temp.parent_of(p_user TEXT) RETURNS UUID LANGUAGE sql AS
  $$ SELECT id FROM core.parents WHERE user_id = current_setting(p_user)::uuid $$;
CREATE OR REPLACE FUNCTION pg_temp.is_guardian(p_user TEXT, p_k TEXT) RETURNS BOOLEAN LANGUAGE sql AS $$
  SELECT EXISTS (
    SELECT 1 FROM core.parent_student_guardians g
    JOIN core.parents p ON p.id = g.parent_id
    WHERE p.user_id = current_setting(p_user)::uuid
      AND g.student_id = (SELECT se.student_id FROM core.student_enrollments se WHERE se.customer_id = pg_temp.sid(p_k))
  ) $$;

-- 관리자 토큰 발급 헬퍼 (결과를 설정값으로 저장)
CREATE OR REPLACE FUNCTION pg_temp.issue(p_owner TEXT, p_org TEXT, p_k TEXT, p_key TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', current_setting(p_owner), true);
  PERFORM set_config(p_key, core.create_guardian_link_token(current_setting(p_org)::uuid, pg_temp.sid(p_k))->>'token', true);
END $$;
CREATE OR REPLACE FUNCTION pg_temp.redeem(p_user TEXT, p_key TEXT) RETURNS JSONB LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', current_setting(p_user), true);
  RETURN core.redeem_guardian_link_token(current_setting(p_key));
END $$;
CREATE OR REPLACE FUNCTION pg_temp.preview(p_user TEXT, p_key TEXT) RETURNS JSONB LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', current_setting(p_user), true);
  RETURN core.preview_guardian_link_token(current_setting(p_key));
END $$;

-- ---------- 1. 완전 신규 계정(고객·전역 parents 없음) → 일반 코드 연결 ----------
SET LOCAL ROLE authenticated;
SELECT pg_temp.issue('t.owner_a', 't.org_a', 'a1', 't.tok1');
SELECT set_config('t.pv1', pg_temp.preview('t.new1', 't.tok1')::text, true);
SELECT set_config('t.rd1', pg_temp.redeem('t.new1', 't.tok1')::text, true);
RESET ROLE;
DO $$
DECLARE r JSONB := current_setting('t.rd1')::jsonb; g UUID := pg_temp.parent_of('t.new1');
BEGIN
  IF NOT (current_setting('t.pv1')::jsonb->>'valid')::boolean THEN RAISE EXCEPTION 'FAIL 1: preview %', current_setting('t.pv1'); END IF;
  IF NOT (r->>'success')::boolean OR r->>'status' <> 'linked' THEN RAISE EXCEPTION 'FAIL 1b: redeem %', r; END IF;
  IF (SELECT count(*) FROM core.parents WHERE user_id = current_setting('t.new1')::uuid) <> 1 THEN
    RAISE EXCEPTION 'FAIL 1c: parents rows for account';
  END IF;
  IF NOT pg_temp.is_guardian('t.new1', 'a1') THEN RAISE EXCEPTION 'FAIL 1d: not guardian'; END IF;
  -- 조직 학부모 고객 id = 전역 parents id (동기화 전제와 일치)
  IF NOT EXISTS (SELECT 1 FROM core.customers c WHERE c.id = g AND c.organization_id = current_setting('t.org_a')::uuid
                 AND c.user_id = current_setting('t.new1')::uuid AND c.metadata->>'entityType' = 'parent') THEN
    RAISE EXCEPTION 'FAIL 1e: org parent customer not aligned';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM core.parent_student_links WHERE organization_id = current_setting('t.org_a')::uuid
                 AND parent_customer_id = g AND student_customer_id = pg_temp.sid('a1')) THEN
    RAISE EXCEPTION 'FAIL 1f: parent_student_links not synced';
  END IF;
  RAISE NOTICE 'PASS 1: brand-new parent account redeems general token (no parents_user_id_key conflict)';
END $$;

-- ---------- 2. 전역 parents 만 있고 조직 고객 없음 → 연결 ----------
INSERT INTO core.parents (id, user_id, name) VALUES (gen_random_uuid(), current_setting('t.glob')::uuid, '전역보호자');
SET LOCAL ROLE authenticated;
SELECT pg_temp.issue('t.owner_b', 't.org_b', 'b1', 't.tok2');
SELECT set_config('t.rd2', pg_temp.redeem('t.glob', 't.tok2')::text, true);
RESET ROLE;
DO $$
DECLARE r JSONB := current_setting('t.rd2')::jsonb;
BEGIN
  IF NOT (r->>'success')::boolean THEN RAISE EXCEPTION 'FAIL 2: redeem %', r; END IF;
  IF (SELECT count(*) FROM core.parents WHERE user_id = current_setting('t.glob')::uuid) <> 1 THEN
    RAISE EXCEPTION 'FAIL 2b: duplicate parents rows';
  END IF;
  IF NOT pg_temp.is_guardian('t.glob', 'b1') THEN RAISE EXCEPTION 'FAIL 2c: not guardian'; END IF;
  RAISE NOTICE 'PASS 2: existing global parents row without org customer -> linked';
END $$;

-- ---------- 3. org A 에 연결된 계정이 org B 코드 redeem (고객 id 정렬 불가 → 매핑) ----------
SET LOCAL ROLE authenticated;
SELECT pg_temp.issue('t.owner_a', 't.org_a', 'a2', 't.tok3a');
SELECT set_config('t.rd3a', pg_temp.redeem('t.multi', 't.tok3a')::text, true);
SELECT pg_temp.issue('t.owner_b', 't.org_b', 'b2', 't.tok3b');
SELECT set_config('t.rd3b', pg_temp.redeem('t.multi', 't.tok3b')::text, true);
RESET ROLE;
DO $$
DECLARE g UUID := pg_temp.parent_of('t.multi'); cb UUID;
BEGIN
  IF NOT (current_setting('t.rd3a')::jsonb->>'success')::boolean OR NOT (current_setting('t.rd3b')::jsonb->>'success')::boolean THEN
    RAISE EXCEPTION 'FAIL 3: % / %', current_setting('t.rd3a'), current_setting('t.rd3b');
  END IF;
  IF (SELECT count(*) FROM core.parents WHERE user_id = current_setting('t.multi')::uuid) <> 1 THEN
    RAISE EXCEPTION 'FAIL 3b: duplicate parents rows';
  END IF;
  IF NOT pg_temp.is_guardian('t.multi', 'a2') OR NOT pg_temp.is_guardian('t.multi', 'b2') THEN
    RAISE EXCEPTION 'FAIL 3c: guardian rows missing';
  END IF;
  SELECT customer_id INTO cb FROM core.org_parent_profiles WHERE parent_id = g AND organization_id = current_setting('t.org_b')::uuid;
  IF cb IS NULL OR cb = g OR NOT EXISTS (SELECT 1 FROM core.customers WHERE id = cb AND user_id = current_setting('t.multi')::uuid) THEN
    RAISE EXCEPTION 'FAIL 3d: org B customer mapping (%)', cb;
  END IF;
  PERFORM set_config('t.cb', cb::text, true);
  RAISE NOTICE 'PASS 3: account linked in org A also links in org B via org_parent_profiles mapping';
END $$;

-- 3e. 직원이 org B 고객 정보를 수정해도 매핑 유지, 직원 링크 추가/삭제가 계정 보호자에 반영
UPDATE core.customers SET phone = '010-0000-0000' WHERE id = current_setting('t.cb')::uuid;
INSERT INTO core.parent_student_links (organization_id, parent_customer_id, student_customer_id)
VALUES (current_setting('t.org_b')::uuid, current_setting('t.cb')::uuid, pg_temp.sid('b3'));
DO $$
BEGIN
  IF (SELECT parent_id FROM core.org_parent_profiles WHERE customer_id = current_setting('t.cb')::uuid) <> pg_temp.parent_of('t.multi') THEN
    RAISE EXCEPTION 'FAIL 3e: mapping reset by customer update';
  END IF;
  IF NOT pg_temp.is_guardian('t.multi', 'b3') THEN RAISE EXCEPTION 'FAIL 3f: staff link not synced to account guardian'; END IF;
  IF (SELECT count(*) FROM core.parents WHERE user_id = current_setting('t.multi')::uuid) <> 1 THEN
    RAISE EXCEPTION 'FAIL 3g: duplicate parents rows after staff edits';
  END IF;
END $$;
DELETE FROM core.parent_student_links
WHERE parent_customer_id = current_setting('t.cb')::uuid AND student_customer_id = pg_temp.sid('b3');
DO $$
BEGIN
  IF pg_temp.is_guardian('t.multi', 'b3') THEN RAISE EXCEPTION 'FAIL 3h: staff unlink not synced'; END IF;
  RAISE NOTICE 'PASS 3e: mapping survives customer edits; staff link/unlink follows mapping';
END $$;

-- 3i. 직원 브리지 동기화 RPC 가 충돌 없이 동작하고 매핑을 유지
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner_b'), true);
SELECT core.sync_org_parent_student_bridge(current_setting('t.org_b')::uuid) IS NOT NULL AS bridged;
RESET ROLE;
DO $$
BEGIN
  IF (SELECT parent_id FROM core.org_parent_profiles WHERE customer_id = current_setting('t.cb')::uuid) <> pg_temp.parent_of('t.multi') THEN
    RAISE EXCEPTION 'FAIL 3i: bridge reset mapping';
  END IF;
  IF NOT pg_temp.is_guardian('t.multi', 'b2') THEN RAISE EXCEPTION 'FAIL 3j: bridge lost guardian'; END IF;
  RAISE NOTICE 'PASS 3i: sync_org_parent_student_bridge keeps account mapping (no unique conflict)';
END $$;

-- ---------- 4. 직원 등록 학부모(이메일 일치, 계정 없음) 가 일반 코드로 연결 → 기존 자녀 관계 승계 ----------
INSERT INTO core.customers (id, organization_id, name, email, metadata)
VALUES (gen_random_uuid(), current_setting('t.org_b')::uuid, '메일학부모', 'mail.parent@grn.test', '{"entityType":"parent"}');
SELECT set_config('t.mc', (SELECT id::text FROM core.customers WHERE email = 'mail.parent@grn.test'), true);
INSERT INTO core.parent_student_links (organization_id, parent_customer_id, student_customer_id)
VALUES (current_setting('t.org_b')::uuid, current_setting('t.mc')::uuid, pg_temp.sid('b4'));
SET LOCAL ROLE authenticated;
SELECT pg_temp.issue('t.owner_b', 't.org_b', 'b5', 't.tok4');
SELECT set_config('t.rd4', pg_temp.redeem('t.mail', 't.tok4')::text, true);
RESET ROLE;
DO $$
BEGIN
  IF NOT (current_setting('t.rd4')::jsonb->>'success')::boolean THEN RAISE EXCEPTION 'FAIL 4: %', current_setting('t.rd4'); END IF;
  IF NOT pg_temp.is_guardian('t.mail', 'b5') OR NOT pg_temp.is_guardian('t.mail', 'b4') THEN
    RAISE EXCEPTION 'FAIL 4b: staff-registered relation not inherited';
  END IF;
  IF (SELECT user_id FROM core.customers WHERE id = current_setting('t.mc')::uuid) <> current_setting('t.mail')::uuid THEN
    RAISE EXCEPTION 'FAIL 4c: staff customer not claimed';
  END IF;
  IF (SELECT count(*) FROM core.parents WHERE user_id = current_setting('t.mail')::uuid) <> 1 THEN
    RAISE EXCEPTION 'FAIL 4d: duplicate parents rows';
  END IF;
  RAISE NOTICE 'PASS 4: email-matched staff customer claimed; existing staff links move to account guardian';
END $$;

-- ---------- 5. 학부모 초대 코드 (기존 흐름) + 재지정 공격 차단 ----------
SELECT set_config('t.pc', gen_random_uuid()::text, true);
INSERT INTO core.customers (id, organization_id, name, email, metadata)
VALUES (current_setting('t.pc')::uuid, current_setting('t.org_b')::uuid, '초대학부모', 'victim.contact@grn.test', '{"entityType":"parent"}');
INSERT INTO core.parent_student_links (organization_id, parent_customer_id, student_customer_id)
VALUES (current_setting('t.org_b')::uuid, current_setting('t.pc')::uuid, pg_temp.sid('b6'));
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner_b'), true);
SELECT set_config('t.inv1', core.create_parent_invite_link_tokens(current_setting('t.org_b')::uuid, current_setting('t.pc')::uuid)->0->>'token', true);
SELECT set_config('t.rd5', pg_temp.redeem('t.victim', 't.inv1')::text, true);
-- 이후 직원이 같은 학부모에게 초대 코드를 다시 발급 → 제3자가 입수
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner_b'), true);
SELECT set_config('t.inv2', core.create_parent_invite_link_tokens(current_setting('t.org_b')::uuid, current_setting('t.pc')::uuid)->0->>'token', true);
SELECT set_config('t.pv5x', pg_temp.preview('t.attacker', 't.inv2')::text, true);
SELECT set_config('t.rd5x', pg_temp.redeem('t.attacker', 't.inv2')::text, true);
RESET ROLE;
DO $$
DECLARE r JSONB := current_setting('t.rd5')::jsonb; x JSONB := current_setting('t.rd5x')::jsonb;
BEGIN
  IF NOT (r->>'success')::boolean THEN RAISE EXCEPTION 'FAIL 5: invite redeem %', r; END IF;
  IF pg_temp.parent_of('t.victim') <> current_setting('t.pc')::uuid OR NOT pg_temp.is_guardian('t.victim', 'b6') THEN
    RAISE EXCEPTION 'FAIL 5b: invite flow did not adopt parent customer';
  END IF;
  IF current_setting('t.pv5x')::jsonb->>'status' <> 'parent_already_linked' THEN
    RAISE EXCEPTION 'FAIL 5c: preview %', current_setting('t.pv5x');
  END IF;
  IF (x->>'success')::boolean OR x->>'status' <> 'parent_already_linked' THEN RAISE EXCEPTION 'FAIL 5d: re-point allowed %', x; END IF;
  IF (SELECT user_id FROM core.customers WHERE id = current_setting('t.pc')::uuid) <> current_setting('t.victim')::uuid
     OR (SELECT user_id FROM core.parents WHERE id = current_setting('t.pc')::uuid) <> current_setting('t.victim')::uuid THEN
    RAISE EXCEPTION 'FAIL 5e: victim lost parent customer';
  END IF;
  IF pg_temp.is_guardian('t.attacker', 'b6') THEN RAISE EXCEPTION 'FAIL 5f: attacker became guardian'; END IF;
  IF NOT EXISTS (SELECT 1 FROM core.guardian_link_tokens WHERE token_hash = core.guardian_link_code_hash(current_setting('t.inv2')) AND used_count = 0) THEN
    RAISE EXCEPTION 'FAIL 5g: rejected token consumed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM core.audit_logs WHERE action = 'guardian_link.redeem_rejected' AND after_data->>'reason' = 'parent_already_linked') THEN
    RAISE EXCEPTION 'FAIL 5h: audit missing';
  END IF;
  RAISE NOTICE 'PASS 5: parent invite flow works; re-pointing an account-linked parent customer is blocked';
END $$;

-- 5i. 본인(피해자) 재사용은 허용 (같은 계정이면 거절하지 않음)
SET LOCAL ROLE authenticated;
SELECT set_config('t.rd5v', pg_temp.redeem('t.victim', 't.inv2')::text, true);
RESET ROLE;
DO $$
BEGIN
  IF NOT (current_setting('t.rd5v')::jsonb->>'success')::boolean THEN RAISE EXCEPTION 'FAIL 5i: %', current_setting('t.rd5v'); END IF;
  RAISE NOTICE 'PASS 5i: same account may redeem reissued invite for its own parent customer';
END $$;

-- ---------- 6. 이메일이 같아도 다른 계정에 연결된 고객은 가져오지 않음 ----------
-- attacker 의 인증 이메일을 피해자 고객 연락처와 같게 (신규 계정)
SELECT set_config('t.att2', gen_random_uuid()::text, true);
INSERT INTO auth.users (id, email) VALUES (current_setting('t.att2')::uuid, 'victim.contact@grn.test');
SET LOCAL ROLE authenticated;
SELECT pg_temp.issue('t.owner_b', 't.org_b', 'b1', 't.tok6');
SELECT set_config('t.rd6', pg_temp.redeem('t.att2', 't.tok6')::text, true);
RESET ROLE;
DO $$
BEGIN
  IF (SELECT user_id FROM core.customers WHERE id = current_setting('t.pc')::uuid) <> current_setting('t.victim')::uuid THEN
    RAISE EXCEPTION 'FAIL 6: email match re-pointed victim customer';
  END IF;
  IF (SELECT parent_id FROM core.org_parent_profiles WHERE customer_id = current_setting('t.pc')::uuid) <> current_setting('t.pc')::uuid THEN
    RAISE EXCEPTION 'FAIL 6b: victim customer mapping changed';
  END IF;
  IF pg_temp.is_guardian('t.att2', 'b6') THEN RAISE EXCEPTION 'FAIL 6c: attacker got victim children'; END IF;
  RAISE NOTICE 'PASS 6: email-matched customer already linked to another account is not adopted (%).',
    current_setting('t.rd6')::jsonb->>'status';
END $$;

-- ---------- 7. 초대 코드를 다른 조직 연결 계정이 redeem → 병합 시 다른 조직 매핑 보존 ----------
SELECT set_config('t.pc2', gen_random_uuid()::text, true);
INSERT INTO core.customers (id, organization_id, name, metadata)
VALUES (current_setting('t.pc2')::uuid, current_setting('t.org_b')::uuid, '초대학부모2', '{"entityType":"parent"}');
INSERT INTO core.parent_student_links (organization_id, parent_customer_id, student_customer_id)
VALUES (current_setting('t.org_b')::uuid, current_setting('t.pc2')::uuid, pg_temp.sid('b3'));
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner_b'), true);
SELECT set_config('t.inv7', core.create_parent_invite_link_tokens(current_setting('t.org_b')::uuid, current_setting('t.pc2')::uuid)->0->>'token', true);
SELECT set_config('t.rd7', pg_temp.redeem('t.new1', 't.inv7')::text, true);  -- new1 은 org A 에 연결됨
RESET ROLE;
DO $$
BEGIN
  IF NOT (current_setting('t.rd7')::jsonb->>'success')::boolean THEN RAISE EXCEPTION 'FAIL 7: %', current_setting('t.rd7'); END IF;
  IF (SELECT count(*) FROM core.parents WHERE user_id = current_setting('t.new1')::uuid) <> 1 THEN
    RAISE EXCEPTION 'FAIL 7b: parents rows';
  END IF;
  IF NOT pg_temp.is_guardian('t.new1', 'a1') OR NOT pg_temp.is_guardian('t.new1', 'b3') THEN
    RAISE EXCEPTION 'FAIL 7c: lost org A child or missing org B child';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM core.org_parent_profiles WHERE parent_id = pg_temp.parent_of('t.new1')
                 AND organization_id = current_setting('t.org_a')::uuid) THEN
    RAISE EXCEPTION 'FAIL 7d: org A mapping lost on invite merge';
  END IF;
  RAISE NOTICE 'PASS 7: invite redeem by multi-org account keeps other-org mapping and children';
END $$;

ROLLBACK;
