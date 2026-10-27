-- =============================================================================
-- 20260928210000 core.teacher_payroll_settlements / core.customer_join_requests 테이블 권한 복구
--
-- 원인: 두 테이블은 core 일괄 GRANT(20260822000003) 이후에 만들어졌고, 생성 마이그레이션에
--   authenticated 테이블 GRANT 가 없었다(relacl=NULL). RLS 정책은 있으나 권한이 없어 PostgREST 가
--   403(42501 permission denied)을 돌려줬다.
--   - 원장 hydrate(coreEntityHydrate: teacher_payroll_settlements select) 실패
--     → "Incomplete hydrate (core): payrollSettlements" → "데이터를 불러오지 못했습니다" 배너
--   - 가입 요청 대기 목록(customer_join_requests select) 403
-- 운영 적용: 2026-09-28 17:19:46 KST, MCP apply_migration
--   grant_authenticated_payroll_join_requests (version 20260928081946). 이 파일의 GRANT 와 동일.
--
-- 행 접근은 기존 RLS 정책이 제한한다 (이 마이그레이션은 정책을 바꾸지 않음):
--   teacher_payroll_settlements: select/insert/update/delete 모두 core.is_org_owner(organization_id)
--   customer_join_requests: insert_own(본인), select_org(원장/관리자), select_own(본인), update_org
--   customer_join_requests DELETE 정책이 없으므로 DELETE 는 주지 않는다. anon 에는 아무것도 주지 않는다.
-- 멱등: GRANT 는 반복 실행해도 같은 결과. RLS 가 꺼져 있으면 권한을 열지 않고 중단한다.
-- 롤백:
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE core.teacher_payroll_settlements FROM authenticated;
--   REVOKE SELECT, INSERT, UPDATE ON TABLE core.customer_join_requests FROM authenticated;
-- =============================================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['teacher_payroll_settlements', 'customer_join_requests'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'core' AND c.relname = t AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'core.% is missing or RLS is disabled; refusing to grant table privileges', t;
    END IF;
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE core.teacher_payroll_settlements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE core.customer_join_requests TO authenticated;
