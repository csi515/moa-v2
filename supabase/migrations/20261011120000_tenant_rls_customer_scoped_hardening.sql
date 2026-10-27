-- =============================================================================
-- Moa v2: Tenant RLS & Customer-Scoped Access Hardening
-- File: 20261011120000_tenant_rls_customer_scoped_hardening.sql
--
-- 1. core.is_my_customer:
--    - Verify both auth_user_id (direct auth.users link) and legacy user_id
--    - Strictly enforce tenant isolation (organization_id = org_id)
-- 2. core.passes:
--    - Add customer-scoped SELECT policy (is_my_customer / parent_owns_student)
--    - Preserves passes_member_all for staff operations while preventing cross-tenant leakage
-- 3. core.lockers:
--    - Add customer-scoped SELECT policy for assigned lockers
--    - Preserves lockers_member_all for staff operations while preventing cross-tenant leakage
-- =============================================================================

BEGIN;

-- 1. Update core.is_my_customer to support both auth_user_id and user_id
CREATE OR REPLACE FUNCTION core.is_my_customer(org_id UUID, customer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM core.customers c
    WHERE c.id = customer_id
      AND c.organization_id = org_id
      AND (c.auth_user_id = auth.uid() OR c.user_id = auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION core.is_my_customer(UUID, UUID) TO authenticated;

-- 2. Scoped customer SELECT for core.passes
DROP POLICY IF EXISTS passes_customer_select ON core.passes;
CREATE POLICY passes_customer_select ON core.passes
  FOR SELECT TO authenticated
  USING (
    customer_id IS NOT NULL AND (
      core.is_my_customer(tenant_id, customer_id)
      OR core.parent_owns_student(tenant_id, customer_id)
    )
  );

COMMENT ON POLICY passes_customer_select ON core.passes IS
  '고객 본인 또는 학부모 연계 고객만 본인의 이용권을 조회 가능. 테넌트(tenant_id) 및 본인 계정 엄격 검증.';

-- 3. Scoped customer SELECT for core.lockers
DROP POLICY IF EXISTS lockers_customer_select ON core.lockers;
CREATE POLICY lockers_customer_select ON core.lockers
  FOR SELECT TO authenticated
  USING (
    assigned_customer_id IS NOT NULL AND (
      core.is_my_customer(tenant_id, assigned_customer_id)
      OR core.parent_owns_student(tenant_id, assigned_customer_id)
    )
  );

COMMENT ON POLICY lockers_customer_select ON core.lockers IS
  '배정된 고객 본인 또는 학부모 연계 고객만 본인의 락커를 조회 가능. 테넌트(tenant_id) 및 배정 고객 엄격 검증.';

COMMIT;
