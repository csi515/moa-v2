-- =============================================================================
-- 20260928200000 레거시 예약 앱 public 객체 제거 테스트 (로컬/스테이징 전용 — 운영 DB 금지)
--   cd supabase/tests && psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f legacy_booking_cleanup.sql
-- 전체가 하나의 트랜잭션이고 마지막에 ROLLBACK 한다. 실패 시 RAISE EXCEPTION.
-- 원격 모양 픽스처(fixtures/legacy_booking_remote_shape.sql)를 만든 뒤 실제 마이그레이션을 \ir 로 실행한다.
-- 의도된 오류가 3건 출력된다(PASS 1~3: 중단 가드).
-- =============================================================================
\set ON_ERROR_STOP 1
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;

-- 원격 모양 재현 (테이블이 이미 있으면 그대로 사용)
SELECT to_regclass('public.profiles') IS NULL AS need_fixture \gset
\if :need_fixture
\ir fixtures/legacy_booking_remote_shape.sql
\endif

-- 남은 public 테이블 권한 회수 확인용 (원격 모양: anon/authenticated ALL)
CREATE TABLE public.zz_legacy_cleanup_probe (id int PRIMARY KEY);
GRANT ALL ON public.zz_legacy_cleanup_probe TO anon, authenticated;

-- 1) 데이터가 있으면 중단
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-4000-8000-00000000b001', 'legacy-shop@example.test');
INSERT INTO public.profiles (id, slug, business_name) VALUES ('00000000-0000-4000-8000-00000000b001', 'legacy-shop', 'Legacy Shop');
SAVEPOINT s1;
\set ON_ERROR_STOP 0
\ir ../migrations/20260928200000_drop_legacy_booking_public_objects.sql
\set ON_ERROR_STOP 1
ROLLBACK TO SAVEPOINT s1;
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL OR (SELECT count(*) FROM public.profiles) <> 1
     OR to_regclass('public.bookings') IS NULL OR to_regprocedure('public.get_booking_slots(uuid,date,bigint)') IS NULL THEN
    RAISE EXCEPTION 'FAIL 1: non-empty legacy table was dropped';
  END IF;
  RAISE NOTICE 'PASS 1: non-empty legacy table blocks the migration';
END $$;
DELETE FROM public.profiles;

-- 2) auth.users 트리거가 public.profiles 를 쓰면 중단 (가입 경로 보호)
SAVEPOINT s2;
CREATE FUNCTION core.zz_legacy_signup_hook() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $f$
BEGIN
  INSERT INTO public.profiles (id, slug, business_name) VALUES (NEW.id, NEW.id::text, 'x');
  RETURN NEW;
END $f$;
CREATE TRIGGER zz_legacy_signup_hook AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION core.zz_legacy_signup_hook();
SAVEPOINT s2b;
\set ON_ERROR_STOP 0
\ir ../migrations/20260928200000_drop_legacy_booking_public_objects.sql
\set ON_ERROR_STOP 1
ROLLBACK TO SAVEPOINT s2b;
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'FAIL 2: dropped public.profiles while an auth trigger writes to it';
  END IF;
  RAISE NOTICE 'PASS 2: auth trigger referencing public.profiles blocks the migration';
END $$;
ROLLBACK TO SAVEPOINT s2;

-- 3) public.profiles 가 예약 앱 모양이 아니면 중단
SAVEPOINT s3;
ALTER TABLE public.profiles DROP COLUMN slug;
SAVEPOINT s3b;
\set ON_ERROR_STOP 0
\ir ../migrations/20260928200000_drop_legacy_booking_public_objects.sql
\set ON_ERROR_STOP 1
ROLLBACK TO SAVEPOINT s3b;
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'FAIL 3: dropped a public.profiles that is not the booking-app table';
  END IF;
  RAISE NOTICE 'PASS 3: unexpected public.profiles shape blocks the migration';
END $$;
ROLLBACK TO SAVEPOINT s3;

-- 4) 실제 마이그레이션 (빈 테이블 → 제거)
\ir ../migrations/20260928200000_drop_legacy_booking_public_objects.sql
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles', 'services', 'blocked_times', 'bookings', 'customer_profiles',
                           'booking_change_requests', 'services_id_seq', 'blocked_times_id_seq',
                           'bookings_id_seq', 'booking_change_requests_id_seq'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN RAISE EXCEPTION 'FAIL 4: public.% still exists', t; END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname IN (
       'check_booking_overlap', 'prevent_direct_booking_schedule_change', 'get_booking_slots', 'is_booking_customer',
       'is_booking_owner', 'create_booking_change_request', 'respond_booking_change_request')) THEN
    RAISE EXCEPTION 'FAIL 4b: legacy booking functions still exist';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE schemaname = 'public'
             AND tablename IN ('profiles', 'services', 'bookings')) THEN
    RAISE EXCEPTION 'FAIL 4c: realtime publication still lists legacy tables';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public') THEN
    RAISE EXCEPTION 'FAIL 4d: public policies left behind';
  END IF;
  RAISE NOTICE 'PASS 4: legacy booking tables, sequences, policies, triggers, functions, publication entries dropped';
END $$;

-- 5) 남겨야 하는 것은 그대로
DO $$
BEGIN
  IF to_regprocedure('public.set_updated_at()') IS NULL THEN RAISE EXCEPTION 'FAIL 5: set_updated_at dropped'; END IF;
  IF to_regprocedure('public.rls_auto_enable()') IS NULL
     AND EXISTS (SELECT 1 FROM pg_event_trigger WHERE evtname = 'ensure_rls') THEN
    RAISE EXCEPTION 'FAIL 5b: rls_auto_enable dropped';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'core' AND indexname = 'room_reservations_no_overlap')
     AND NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist') THEN
    RAISE EXCEPTION 'FAIL 5c: btree_gist dropped';
  END IF;
  IF to_regclass('core.profiles') IS NULL OR to_regclass('bath.bookings') IS NULL OR to_regclass('bath.services') IS NULL
     OR to_regclass('core.services') IS NULL THEN
    RAISE EXCEPTION 'FAIL 5d: same-named core/bath tables must be untouched';
  END IF;
  RAISE NOTICE 'PASS 5: set_updated_at, rls_auto_enable, btree_gist, core/bath tables kept';
END $$;

-- 6) 가입 경로: auth.users INSERT 가 계속 동작하고 core.profiles 가 만들어진다
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('00000000-0000-4000-8000-00000000b002', 'signup-after-cleanup@example.test', '{"full_name":"Signup Test"}');
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND tgname = 'on_auth_user_created')
     AND NOT EXISTS (SELECT 1 FROM core.profiles WHERE id = '00000000-0000-4000-8000-00000000b002') THEN
    RAISE EXCEPTION 'FAIL 6: signup trigger did not create core.profiles';
  END IF;
  RAISE NOTICE 'PASS 6: auth.users signup still works (core.handle_new_user)';
END $$;

-- 7) 남은 public 테이블: anon/authenticated 의 TRUNCATE/TRIGGER/REFERENCES 회수, 다른 권한은 유지
DO $$
DECLARE r text; p text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH p IN ARRAY ARRAY['TRUNCATE', 'TRIGGER', 'REFERENCES'] LOOP
      IF has_table_privilege(r, 'public.zz_legacy_cleanup_probe', p) THEN
        RAISE EXCEPTION 'FAIL 7: % still has % on remaining public table', r, p;
      END IF;
    END LOOP;
    IF NOT has_table_privilege(r, 'public.zz_legacy_cleanup_probe', 'SELECT') THEN
      RAISE EXCEPTION 'FAIL 7b: unrelated privilege removed from %', r;
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS 7: TRUNCATE/TRIGGER/REFERENCES revoked from anon/authenticated on remaining public tables';
END $$;

-- 8) 재실행해도 오류 없음 (멱등)
\ir ../migrations/20260928200000_drop_legacy_booking_public_objects.sql
DO $$ BEGIN RAISE NOTICE 'PASS 8: migration is idempotent'; END $$;

ROLLBACK;
