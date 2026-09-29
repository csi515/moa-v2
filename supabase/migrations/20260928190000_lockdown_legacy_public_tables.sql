-- =============================================================================
-- 20260928190000 레거시 public 테이블 제거 (anon 전체 CRUD 노출 차단)
--
-- 대상: public.students, public.attendances, public.fees
--   - repo 마이그레이션이 만든 테이블이 아님(원격에만 존재하던 과거 Frappe 동기화용 테이블).
--   - 원격에서 RLS 정책이 모두 USING(true)/WITH CHECK(true) 이고 anon/authenticated 에
--     ALL 권한이 있어, PostgREST(db_schemas 에 public 포함)로 누구나 읽기/쓰기/삭제 가능했다.
--   - 앱(src)·Edge Function·scripts·e2e 어디에서도 사용하지 않는다(클라이언트는 core/piano/bath 스키마).
--   - 원격 행 수 0, FK·뷰·함수·publication 의존 없음(자체 트리거/identity 시퀀스/인덱스/정책만).
--
-- 방식: 데이터가 있으면 중단(RAISE)하고, 비어 있으면 DROP TABLE IF EXISTS (CASCADE 없음).
--   - 예상치 못한 의존 객체가 생겼다면 DROP 이 실패해 트랜잭션 전체가 롤백된다(의도된 안전장치).
--   - 멱등: 테이블이 없으면 아무것도 하지 않는다(로컬 새 replay 포함).
--   - public.set_updated_at() 는 남겨 둔다(20260903015302 가 참조, 권한 노출 없음).
-- 복구용 DDL/정책/권한 스냅샷은 PR 본문 참고(운영 백업은 별도 보관).
-- =============================================================================

DO $$
DECLARE
  t text;
  has_rows boolean;
BEGIN
  FOREACH t IN ARRAY ARRAY['public.students', 'public.attendances', 'public.fees'] LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s)', t) INTO has_rows;
      IF has_rows THEN
        RAISE EXCEPTION 'legacy table % is not empty; refusing to drop (back up and clear it first)', t
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END LOOP;
END $$;

DROP TABLE IF EXISTS public.attendances;
DROP TABLE IF EXISTS public.fees;
DROP TABLE IF EXISTS public.students;
