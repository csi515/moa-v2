-- =============================================================================
-- 20260928180000 idempotency hash 회귀 테스트 (로컬/스테이징 전용 — 운영 DB 금지)
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/idempotency_hash_search_path.sql
-- 전체가 하나의 트랜잭션이고 마지막에 ROLLBACK 한다. 실패 시 RAISE EXCEPTION.
-- Supabase 운영처럼 pgcrypto 가 extensions 스키마에만 있고 search_path = core, public 인 상황에서
-- begin_idempotency / record_combined_payment 경로가 digest() 없이 동작해야 한다.
-- =============================================================================
\set ON_ERROR_STOP 1
BEGIN;

DROP FUNCTION IF EXISTS public.digest(text, text);
DROP FUNCTION IF EXISTS public.digest(bytea, text);

SELECT set_config('t.owner', gen_random_uuid()::text, true);
SELECT set_config('t.org',   gen_random_uuid()::text, true);
SELECT set_config('t.cust',  gen_random_uuid()::text, true);
SELECT set_config('t.book',  gen_random_uuid()::text, true);
SELECT set_config('t.sale',  gen_random_uuid()::text, true);

INSERT INTO auth.users (id, email) VALUES (current_setting('t.owner')::uuid, 'owner@idem.test');
INSERT INTO core.organizations (id, name) VALUES (current_setting('t.org')::uuid, '멱등학원');
INSERT INTO core.organization_members (organization_id, user_id, role)
VALUES (current_setting('t.org')::uuid, current_setting('t.owner')::uuid, 'owner');
INSERT INTO core.customers (id, organization_id, name, metadata)
VALUES (current_setting('t.cust')::uuid, current_setting('t.org')::uuid, '가학생', '{"entityType":"student"}');
INSERT INTO piano.textbooks (id, organization_id, title)
VALUES (current_setting('t.book')::uuid, current_setting('t.org')::uuid, '교재');
-- 청구서에 연결된 판매 → record_combined_payment 가 skipped_linked 로 처리(금액 계산 경로 없이 멱등 경로만 검증)
INSERT INTO piano.textbook_sales (id, organization_id, customer_id, textbook_id, metadata)
VALUES (current_setting('t.sale')::uuid, current_setting('t.org')::uuid, current_setting('t.cust')::uuid,
        current_setting('t.book')::uuid, jsonb_build_object('billingInvoiceId', gen_random_uuid()));

SET LOCAL search_path = core, public;

DO $$
BEGIN
  IF to_regprocedure('public.digest(bytea,text)') IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL setup: public.digest shim still present';
  END IF;
  IF core.idempotency_request_hash('{"a":1}')
     <> encode(extensions.digest(convert_to('{"a":1}', 'utf8'), 'sha256'), 'hex') THEN
    RAISE EXCEPTION 'FAIL 1: hash differs from pgcrypto sha256';
  END IF;
  RAISE NOTICE 'PASS 1: idempotency_request_hash = pgcrypto sha256 (search_path core, public)';
END $$;

-- begin_idempotency 직접 호출 (호출자 search_path = core, public)
DO $$
DECLARE v JSONB;
BEGIN
  v := core.begin_idempotency(current_setting('t.org')::uuid, 'direct-k1', 'payment',
                              core.idempotency_request_hash('direct'));
  IF v->>'outcome' <> 'execute' THEN RAISE EXCEPTION 'FAIL 2: %', v; END IF;
  PERFORM core.complete_idempotency(current_setting('t.org')::uuid, 'direct-k1', '{"ok":true}'::jsonb);
  v := core.begin_idempotency(current_setting('t.org')::uuid, 'direct-k1', 'payment',
                              core.idempotency_request_hash('direct'));
  IF v->>'outcome' <> 'replay' OR v->'response' <> '{"ok":true}'::jsonb THEN RAISE EXCEPTION 'FAIL 2b: %', v; END IF;
  RAISE NOTICE 'PASS 2: begin_idempotency execute → complete → replay';
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('t.owner'), true);

DO $$
DECLARE r1 JSONB; r2 JSONB; items JSONB;
BEGIN
  items := jsonb_build_array(jsonb_build_object('sale_id', current_setting('t.sale')));
  r1 := core.record_combined_payment(current_setting('t.org')::uuid, '[]'::jsonb, items,
                                     'cash'::core.payment_method, CURRENT_DATE, NULL, false, 'combined-k1');
  IF r1->>'action' <> 'paid' OR r1->'textbooks'->0->>'action' <> 'skipped_linked' THEN
    RAISE EXCEPTION 'FAIL 3: %', r1;
  END IF;
  r2 := core.record_combined_payment(current_setting('t.org')::uuid, '[]'::jsonb, items,
                                     'cash'::core.payment_method, CURRENT_DATE, NULL, false, 'combined-k1');
  IF r2 <> r1 THEN RAISE EXCEPTION 'FAIL 3b: replay differs % vs %', r2, r1; END IF;
  RAISE NOTICE 'PASS 3: record_combined_payment with command key (paid → replay)';
END $$;

RESET ROLE;
DO $$
BEGIN
  IF (SELECT count(*) FROM core.idempotency_keys WHERE organization_id = current_setting('t.org')::uuid) <> 2 THEN
    RAISE EXCEPTION 'FAIL 4: expected 2 idempotency rows';
  END IF;
  RAISE NOTICE 'PASS 4: idempotency_keys rows recorded';
END $$;

ROLLBACK;
