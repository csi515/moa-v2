-- =============================================================================
-- 20260928200000 레거시 예약 앱(oneslot/shop) public 객체 제거
--
-- 대상 (repo 마이그레이션이 만든 것이 아님 — 과거 예약 앱이 대시보드로 만든 원격 전용 객체):
--   테이블  public.booking_change_requests, bookings, blocked_times, services, customer_profiles, profiles
--           (+ identity 시퀀스·인덱스·RLS 정책·bookings 트리거·supabase_realtime 등록은 테이블과 함께 제거됨)
--   함수    public.check_booking_overlap(), prevent_direct_booking_schedule_change(), get_booking_slots(...),
--           is_booking_customer(...), is_booking_owner(...), create_booking_change_request(...),
--           respond_booking_change_request(...)
--   - 원격 행 수 0 (2026-09-28 확인). anon/authenticated 에 ALL(TRUNCATE/TRIGGER/REFERENCES 포함) 권한,
--     profiles/services/blocked_times 는 anon 공개 읽기, bookings 는 anon INSERT 정책이 열려 있었다.
--   - Moa 앱은 core/piano/bath 스키마만 사용(src·Edge Function·scripts·e2e 에 public 스키마 클라이언트 없음).
--   - auth.users 트리거(on_auth_user_created → core.handle_new_user, on_auth_user_email_updated →
--     core.sync_profile_email_from_auth_user)는 core.profiles 만 쓰며 public.profiles 를 참조하지 않는다.
--
-- 남겨 두는 것 (의도):
--   - public.set_updated_at()  : 20260903015302 가 참조
--   - public.rls_auto_enable() : Supabase 플랫폼 이벤트 트리거(ensure_rls)용
--   - btree_gist 확장(public)  : core.room_reservations_no_overlap 배제 제약이 사용
--   - storage 버킷 'shop-assets' 와 storage.objects 정책 4개: storage.objects 소유자가 supabase_storage_admin 이라
--     마이그레이션(postgres)으로 다루지 않는다. 대시보드/Storage API 로 별도 정리.
--
-- 안전장치:
--   1) 대상 테이블 중 하나라도 행이 있으면 중단(RAISE) — 트랜잭션 전체 롤백
--   2) public.profiles 가 예약 앱 모양(slug, business_name)이 아니면 중단
--   3) auth 스키마 테이블의 트리거 함수가 대상 테이블을 쓸 수 있으면 중단(가입 경로 보호)
--   4) CASCADE 없음 — 예상치 못한 의존 객체가 있으면 DROP 이 실패해 전체 롤백
--   5) 멱등 — IF EXISTS 만 사용(로컬 새 replay 에서는 테이블 없이 함수 스텁만 제거)
-- 마지막으로 남아 있는 public 테이블/뷰에서 anon/authenticated 의 TRUNCATE/TRIGGER/REFERENCES 를 회수한다.
-- =============================================================================

DO $$
DECLARE
  t text;
  has_rows boolean;
  r record;
BEGIN
  -- 1) 비어 있지 않으면 중단
  FOREACH t IN ARRAY ARRAY[
    'public.booking_change_requests', 'public.bookings', 'public.blocked_times',
    'public.services', 'public.customer_profiles', 'public.profiles'
  ] LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s)', t) INTO has_rows;
      IF has_rows THEN
        RAISE EXCEPTION 'legacy booking table % is not empty; refusing to drop (back up and clear it first)', t
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END LOOP;

  -- 2) public.profiles 가 예약 앱 테이블인지 확인
  IF to_regclass('public.profiles') IS NOT NULL AND (
       NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = to_regclass('public.profiles')
                   AND attname = 'slug' AND NOT attisdropped)
    OR NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = to_regclass('public.profiles')
                   AND attname = 'business_name' AND NOT attisdropped)
  ) THEN
    RAISE EXCEPTION 'public.profiles does not look like the legacy booking-app table; refusing to drop'
      USING ERRCODE = 'P0001';
  END IF;

  -- 3) auth 트리거가 대상 테이블을 쓰면 중단 (DROP 후 가입이 깨지는 것을 방지)
  FOR r IN
    SELECT tg.tgrelid::regclass::text AS rel, tg.tgname, p.oid::regprocedure::text AS fn, p.prosrc,
           coalesce(array_to_string(p.proconfig, ','), '') AS cfg
    FROM pg_trigger tg
    JOIN pg_class c ON c.oid = tg.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = tg.tgfoid
    WHERE n.nspname = 'auth' AND NOT tg.tgisinternal
  LOOP
    IF r.prosrc ~* '\mpublic\.(profiles|customer_profiles|services|bookings|blocked_times|booking_change_requests)\M'
       OR r.prosrc ~* '\m(customer_profiles|blocked_times|booking_change_requests)\M'
       OR (r.cfg !~ 'search_path="?(core|bath|piano)\M' AND r.prosrc ~* '\m(profiles|services|bookings)\M')
    THEN
      RAISE EXCEPTION 'auth trigger % on % (function %) may write to a legacy public booking table; refusing to drop',
        r.tgname, r.rel, r.fn USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
END $$;

-- 테이블: FK 참조 순서대로 (CASCADE 없음)
DROP TABLE IF EXISTS public.booking_change_requests;
DROP TABLE IF EXISTS public.bookings;
DROP TABLE IF EXISTS public.blocked_times;
DROP TABLE IF EXISTS public.services;
DROP TABLE IF EXISTS public.customer_profiles;
DROP TABLE IF EXISTS public.profiles;

-- 함수 (정확한 시그니처, CASCADE 없음)
DROP FUNCTION IF EXISTS public.check_booking_overlap();
DROP FUNCTION IF EXISTS public.prevent_direct_booking_schedule_change();
DROP FUNCTION IF EXISTS public.get_booking_slots(uuid, date, bigint);
DROP FUNCTION IF EXISTS public.create_booking_change_request(bigint, date, time without time zone, time without time zone, bigint, text);
DROP FUNCTION IF EXISTS public.respond_booking_change_request(bigint, text, text);
DROP FUNCTION IF EXISTS public.is_booking_customer(bigint, uuid);
DROP FUNCTION IF EXISTS public.is_booking_owner(bigint, uuid);

-- 남은 public 테이블/뷰: anon/authenticated 의 TRUNCATE/TRIGGER/REFERENCES 회수 (확장 소속 객체 제외)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.oid::regclass::text AS rel
    FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d
                      WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON %s FROM anon, authenticated', r.rel);
  END LOOP;
END $$;
