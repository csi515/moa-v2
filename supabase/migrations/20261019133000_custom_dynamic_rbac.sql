-- 사업주가 UI에서 편집하는 직급·권한 매트릭스.
-- organization_members.custom_role_id 는 기존 tenant_roles FK를 유지한다.
-- 이번 매트릭스는 organization_role_id 로 organization_roles 에 연결한다.

CREATE TABLE IF NOT EXISTS core.organization_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name varchar(64) NOT NULL,
  description varchar(255) DEFAULT '',
  is_system boolean DEFAULT false,
  permissions jsonb NOT NULL DEFAULT '{
    "billing_invoices": false,
    "attendance": true,
    "booking": true,
    "passes": true,
    "statistics": false,
    "members_manage": false,
    "policies": false
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_roles_tenant_name
  ON core.organization_roles (tenant_id, name);

ALTER TABLE core.organization_members
  ADD COLUMN IF NOT EXISTS organization_role_id uuid REFERENCES core.organization_roles(id) ON DELETE SET NULL;

ALTER TABLE core.organization_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organization_roles_select ON core.organization_roles;
CREATE POLICY organization_roles_select ON core.organization_roles
  FOR SELECT TO authenticated
  USING (core.is_org_member(tenant_id));

DROP POLICY IF EXISTS organization_roles_owner_write ON core.organization_roles;
CREATE POLICY organization_roles_owner_write ON core.organization_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM core.organization_members m
      WHERE m.organization_id = organization_roles.tenant_id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM core.organization_members m
      WHERE m.organization_id = organization_roles.tenant_id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );

CREATE OR REPLACE FUNCTION core.member_has_org_permission(p_org uuid, p_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.organization_members m
    LEFT JOIN core.organization_roles r ON r.id = m.organization_role_id
    WHERE m.organization_id = p_org
      AND m.user_id = auth.uid()
      AND m.is_active = true
      AND (
        m.role = 'owner'
        OR COALESCE((r.permissions->>p_key)::boolean, false)
      )
  );
$$;

DROP POLICY IF EXISTS payments_dynamic_finance_rbac ON core.payments;
CREATE POLICY payments_dynamic_finance_rbac ON core.payments
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    core.is_org_owner_or_admin(organization_id)
    OR core.member_has_org_permission(organization_id, 'billing_invoices')
    OR core.member_has_org_permission(organization_id, 'statistics')
  )
  WITH CHECK (
    core.is_org_owner_or_admin(organization_id)
    OR core.member_has_org_permission(organization_id, 'billing_invoices')
  );

DROP POLICY IF EXISTS sales_dynamic_finance_rbac ON core.sales;
CREATE POLICY sales_dynamic_finance_rbac ON core.sales
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    core.is_org_owner_or_admin(organization_id)
    OR core.member_has_org_permission(organization_id, 'billing_invoices')
    OR core.member_has_org_permission(organization_id, 'statistics')
  )
  WITH CHECK (
    core.is_org_owner_or_admin(organization_id)
    OR core.member_has_org_permission(organization_id, 'billing_invoices')
  );
