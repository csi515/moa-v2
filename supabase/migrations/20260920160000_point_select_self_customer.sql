-- 일반 사용자(Customer)는 본인 포인트만 SELECT.
-- 스태프 역할은 사업장 전체 조회 유지. customer/member/parent/guardian 은 is_my_customer만.

BEGIN;

DROP POLICY IF EXISTS core_point_accounts_select ON core.point_accounts;
CREATE POLICY core_point_accounts_select
  ON core.point_accounts
  FOR SELECT TO authenticated
  USING (
    core.is_my_customer(organization_id, customer_id)
    OR core.get_org_role(organization_id) IN (
      'owner'::core.member_role,
      'admin'::core.member_role,
      'manager'::core.member_role,
      'staff'::core.member_role,
      'instructor'::core.member_role
    )
  );

DROP POLICY IF EXISTS core_point_transactions_select ON core.point_transactions;
CREATE POLICY core_point_transactions_select
  ON core.point_transactions
  FOR SELECT TO authenticated
  USING (
    core.is_my_customer(organization_id, customer_id)
    OR core.get_org_role(organization_id) IN (
      'owner'::core.member_role,
      'admin'::core.member_role,
      'manager'::core.member_role,
      'staff'::core.member_role,
      'instructor'::core.member_role
    )
  );

COMMIT;
