-- =============================================================================
-- 20260928190000 레거시 public 테이블 제거 테스트 (로컬/스테이징 전용 — 운영 DB 금지)
--   cd supabase/tests && psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f legacy_public_lockdown.sql
-- 전체가 하나의 트랜잭션이고 마지막에 ROLLBACK 한다. 실패 시 RAISE EXCEPTION.
-- 원격과 같은 모양(anon USING(true) 정책 + ALL 권한)의 테이블을 만든 뒤 마이그레이션을 \ir 로 실행한다.
-- =============================================================================
\set ON_ERROR_STOP 1
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END $$;

-- 원격 모양 재현 (이미 있으면 그대로 사용)
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql
  SET search_path TO 'public', 'pg_catalog' AS $f$ begin new.updated_at = now(); return new; end; $f$;
CREATE TABLE IF NOT EXISTS public.students (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, frappe_id varchar(140) UNIQUE, name varchar(255),
  parent_phone varchar(50), grade varchar(50), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.attendances (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, frappe_id varchar(140) UNIQUE, student_id varchar(140) NOT NULL,
  attendance_date date NOT NULL, status varchar(20) NOT NULL, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.fees (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, frappe_id varchar(140) UNIQUE, student_id varchar(140) NOT NULL,
  student_name varchar(255), outstanding_amount numeric(12,2) NOT NULL DEFAULT 0, due_date date,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['students', 'attendances', 'fees'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow anon read ' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO public USING (true)', 'Allow anon read ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow anon delete ' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO public USING (true)', 'Allow anon delete ' || t, t);
    EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated', t);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_updated_at', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t || '_updated_at', t);
  END LOOP;
END $$;

-- 1) 데이터가 있으면 실제 마이그레이션이 중단(오류)되어야 한다
--    (의도된 오류 1건이 출력된다: "legacy table public.students is not empty")
INSERT INTO public.students (name) VALUES ('legacy row');
SAVEPOINT s1;
\set ON_ERROR_STOP 0
\ir ../migrations/20260928190000_lockdown_legacy_public_tables.sql
\set ON_ERROR_STOP 1
ROLLBACK TO SAVEPOINT s1;
DO $$
BEGIN
  IF to_regclass('public.students') IS NULL OR (SELECT count(*) FROM public.students) <> 1
     OR to_regclass('public.fees') IS NULL OR to_regclass('public.attendances') IS NULL THEN
    RAISE EXCEPTION 'FAIL 1: non-empty legacy table was dropped';
  END IF;
  RAISE NOTICE 'PASS 1: non-empty legacy table blocks the migration';
END $$;
DELETE FROM public.students;

-- 2) 실제 마이그레이션 파일 실행 (빈 테이블 → 제거)
\ir ../migrations/20260928190000_lockdown_legacy_public_tables.sql

DO $$
BEGIN
  IF to_regclass('public.students') IS NOT NULL OR to_regclass('public.attendances') IS NOT NULL
     OR to_regclass('public.fees') IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL 2: legacy tables still exist';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relname IN ('students_id_seq', 'attendances_id_seq', 'fees_id_seq')) THEN
    RAISE EXCEPTION 'FAIL 2b: identity sequences left behind';
  END IF;
  IF to_regprocedure('public.set_updated_at()') IS NULL THEN
    RAISE EXCEPTION 'FAIL 2c: public.set_updated_at() must be kept';
  END IF;
  RAISE NOTICE 'PASS 2: legacy tables, policies, sequences dropped; set_updated_at kept';
END $$;

-- 3) 재실행해도 오류 없음 (멱등)
\ir ../migrations/20260928190000_lockdown_legacy_public_tables.sql
DO $$ BEGIN RAISE NOTICE 'PASS 3: migration is idempotent'; END $$;

-- 4) core 쪽 동명 테이블은 영향 없음
DO $$
BEGIN
  IF to_regclass('core.students') IS NULL THEN RAISE EXCEPTION 'FAIL 4: core.students missing'; END IF;
  RAISE NOTICE 'PASS 4: core.students untouched';
END $$;

ROLLBACK;
