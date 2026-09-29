-- =============================================================================
-- core.idempotency_request_hash: pgcrypto digest() 의존 제거
--
-- 20260924310000 의 정의는 search_path 없이 비한정 digest() 를 호출한다.
-- 원격(Supabase)의 pgcrypto 는 extensions 스키마에만 있으므로
-- search_path = core, public 인 호출자(begin_idempotency 경로,
-- core.record_combined_payment)에서
--   ERROR: function digest(bytea, unknown) does not exist
-- 로 실패한다.
--
-- 내장 sha256(bytea) (PG11+) 로 교체: 결과(hex)는 digest(..., 'sha256') 와 동일하므로
-- 기존 저장 해시/클라이언트 해시(src/core/idempotency/hash.ts)와 호환.
-- 병합된 20260924310000 은 수정하지 않고 이 파일에서 재정의만 한다. 멱등.
-- CREATE OR REPLACE 는 기존 EXECUTE 권한을 유지한다.
-- =============================================================================

CREATE OR REPLACE FUNCTION core.idempotency_request_hash(p_canonical TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT encode(sha256(convert_to(p_canonical, 'utf8')), 'hex');
$$;
