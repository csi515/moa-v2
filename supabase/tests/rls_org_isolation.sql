-- RLS org 격리 감사 시나리오 (수동/CI에서 anon + 테스트 유저 JWT로 검증)
-- 실행 전제: 두 개의 조직(OrgA, OrgB), 각각 owner/staff/parent 멤버십 시드
-- Retail: OrgB에 products / inventory / sales / point_* 시드 행이 있어야 "0행"이 의미 있음
-- 정책 대량 재작성 없음 — 실패 시 해당 정책만 수정
--
-- 러너: npm run test:rls-audit  (scripts/rls-org-isolation-audit.ts)
-- 멤버십 권한 상승: npm run test:rls-membership-escalation
-- 정책 정적 검증: npm run test:rls-membership-policy
--
-- =============================================================================
-- M1-M3. 비멤버가 타 org에 자신을 owner/admin/manager 로 INSERT 할 수 없다
-- =============================================================================
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claim.sub = '<attacker_user_id>';
-- INSERT INTO core.organization_members (organization_id, user_id, role, is_active)
-- VALUES ('<orgB_id>', '<attacker_user_id>', 'owner', true);
-- 기대: RLS 위반 (42501)
--
-- =============================================================================
-- M4. 기존 customer 멤버가 동일 org에 owner 행을 추가 INSERT 할 수 없다
-- =============================================================================
-- (multi-role UNIQUE(org,user,role) 하에서 privilege escalation 차단)
-- 기대: RLS 위반
--
-- =============================================================================
-- M5. owner/admin 은 다른 사용자 membership INSERT 가능 (초대 UI/직접)
-- =============================================================================
-- 기대: 성공 또는 UNIQUE 충돌 (RLS 거부가 아님)
-- 최초 owner·스태프 연결은 SECURITY DEFINER RPC가 RLS를 우회하므로 정상 유지
--
-- Retail 현재 SELECT 정책 (분석 요약, 덮어쓰지 않음):
--   core_products_select / core_inventory_select / core_stock_movements_select / core_sales_select
--     USING (is_org_member(org) OR is_org_admin(org))
--   core_product_variants_select / core_sale_items_select
--     EXISTS 부모 + 동일 멤버십
--   core_point_accounts_select / core_point_transactions_select
--     is_my_customer(org, customer_id)
--     OR has_any_org_role(org, [owner, admin, manager, staff, instructor])

-- =============================================================================
-- S1. OrgA staff는 OrgB customers를 SELECT 할 수 없다
-- =============================================================================
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claim.sub = '<orgA_staff_user_id>';
-- SELECT count(*) FROM core.customers WHERE organization_id = '<orgB_id>';
-- 기대: 0

-- =============================================================================
-- S2. OrgA staff는 OrgB invoices를 SELECT 할 수 없다
-- =============================================================================
-- SELECT count(*) FROM core.invoices WHERE organization_id = '<orgB_id>';
-- 기대: 0

-- =============================================================================
-- S3. Parent는 연결되지 않은 타 자녀 customer를 SELECT 할 수 없다
-- =============================================================================
-- SET LOCAL request.jwt.claim.sub = '<parent_user_id>';
-- SELECT count(*) FROM core.customers c
-- WHERE c.id = '<unrelated_student_id>';
-- 기대: 0

-- =============================================================================
-- S4. OrgA owner는 자사 customers만 본다
-- =============================================================================
-- SET LOCAL request.jwt.claim.sub = '<orgA_owner_user_id>';
-- SELECT count(*) FILTER (WHERE organization_id = '<orgA_id>') AS own_count,
--        count(*) FILTER (WHERE organization_id <> '<orgA_id>') AS other_count
-- FROM core.customers;
-- 기대: other_count = 0, own_count > 0 (시드 시)

-- =============================================================================
-- R1. OrgA staff는 OrgB products를 SELECT 할 수 없다
-- =============================================================================
-- SET LOCAL request.jwt.claim.sub = '<orgA_staff_user_id>';
-- SELECT count(*) FROM core.products WHERE organization_id = '<orgB_id>';
-- 기대: 0

-- =============================================================================
-- R2. OrgA staff는 OrgB product_variants를 SELECT 할 수 없다
-- =============================================================================
-- SELECT count(*) FROM core.product_variants v
-- JOIN core.products p ON p.id = v.product_id
-- WHERE p.organization_id = '<orgB_id>';
-- 기대: 0

-- =============================================================================
-- R3. OrgA staff는 OrgB inventory를 SELECT 할 수 없다
-- =============================================================================
-- SELECT count(*) FROM core.inventory WHERE organization_id = '<orgB_id>';
-- 기대: 0

-- =============================================================================
-- R4. OrgA staff는 OrgB stock_movements를 SELECT 할 수 없다
-- =============================================================================
-- SELECT count(*) FROM core.stock_movements WHERE organization_id = '<orgB_id>';
-- 기대: 0

-- =============================================================================
-- R5. OrgA staff는 OrgB sales를 SELECT 할 수 없다
-- =============================================================================
-- SELECT count(*) FROM core.sales WHERE organization_id = '<orgB_id>';
-- 기대: 0

-- =============================================================================
-- R6. OrgA staff는 OrgB sale_items를 SELECT 할 수 없다
-- =============================================================================
-- SELECT count(*) FROM core.sale_items si
-- JOIN core.sales s ON s.id = si.sale_id
-- WHERE s.organization_id = '<orgB_id>';
-- 기대: 0

-- =============================================================================
-- R7. OrgA staff는 OrgB point_accounts를 SELECT 할 수 없다
-- =============================================================================
-- SELECT count(*) FROM core.point_accounts WHERE organization_id = '<orgB_id>';
-- 기대: 0

-- =============================================================================
-- R8. OrgA staff는 OrgB point_transactions를 SELECT 할 수 없다
-- =============================================================================
-- SELECT count(*) FROM core.point_transactions WHERE organization_id = '<orgB_id>';
-- 기대: 0

-- =============================================================================
-- R9. 일반 사용자는 연결되지 않은 Customer의 Retail 포인트를 SELECT 할 수 없다
-- =============================================================================
-- SET LOCAL request.jwt.claim.sub = '<end_user_id>';  -- customers.user_id 미연결
-- SELECT count(*) FROM core.point_accounts
-- WHERE customer_id = '<unlinked_customer_id>';
-- SELECT count(*) FROM core.point_transactions
-- WHERE customer_id = '<unlinked_customer_id>';
-- 기대: 0
-- (정책: is_my_customer 만 허용 — user_id = auth.uid() 인 Customer)

-- =============================================================================
-- 헬퍼 확인
-- =============================================================================
-- SELECT core.is_org_member('<orgA_id>');
-- SELECT core.is_org_admin('<orgA_id>');
-- SELECT core.is_my_customer('<orgB_id>', '<unlinked_customer_id>');  -- 기대: false
