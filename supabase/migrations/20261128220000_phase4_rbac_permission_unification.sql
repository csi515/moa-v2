-- Phase 4: RBAC → RLS 권한 키 통일 + has_permission 파일럿 + 필드 ACL 최소
-- docs/MOA_AGNOSTIC_ERP_PHASE4_SPEC.md

BEGIN;

-- ── 1. 권한 키 별칭 (레거시 JSONB / colon 키 → 카탈로그 canonical) ────────────
CREATE TABLE IF NOT EXISTS core.permission_key_aliases (
  legacy_key text PRIMARY KEY,
  canonical_key text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE core.permission_key_aliases IS
  '레거시 RolePermissionKey / colon 키 → permission_catalog canonical 매핑';

INSERT INTO core.permission_key_aliases (legacy_key, canonical_key, notes) VALUES
  ('billing_invoices', 'finance.read', 'organization_roles JSONB + payments/sales RLS'),
  ('billing:invoices:read', 'finance.read', 'standardPermissionKeys'),
  ('statistics', 'reports.read', '통계·리포트'),
  ('members_manage', 'staff.manage', '레거시 underscore'),
  ('members:manage', 'staff.manage', 'colon 키'),
  ('resources_manage', 'rooms.manage', '시설·자원 관리 근사'),
  ('resources:manage', 'rooms.manage', 'colon 키'),
  ('sales', 'sales.read', 'Refine resource short'),
  ('finance', 'finance.read', 'Refine resource short'),
  ('inventory.manage', 'inventory.write', '재고·상품 쓰기')
ON CONFLICT (legacy_key) DO UPDATE
  SET canonical_key = EXCLUDED.canonical_key,
      notes = EXCLUDED.notes;

-- catalog에 없을 수 있는 키 보강 (idempotent). PK 컬럼명 = permission
INSERT INTO core.permission_catalog (permission, resource, action, description)
VALUES
  ('inventory.read', 'inventory', 'read', '재고·상품 조회'),
  ('inventory.write', 'inventory', 'write', '재고·상품 변경'),
  ('org.manage', 'org', 'manage', '조직 설정 관리'),
  ('locations.read', 'locations', 'read', '지점 접근')
ON CONFLICT (permission) DO NOTHING;

-- staff/instructor 기본권에 inventory.read·locations.read 반영 (TS STAFF_DEFAULT 동기)
CREATE OR REPLACE FUNCTION core.role_has_default_permission(
  p_role core.member_role,
  p_permission TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT CASE
    WHEN p_role IN ('owner'::core.member_role, 'admin'::core.member_role, 'manager'::core.member_role) THEN
      core.is_known_permission(p_permission)
    WHEN p_role IN ('staff'::core.member_role, 'instructor'::core.member_role) THEN
      p_permission = ANY (ARRAY[
        'customers.read',
        'customers.write',
        'sales.read',
        'sales.create',
        'sales.refund',
        'locations.read',
        'rooms.read',
        'staff.read',
        'reports.read',
        'inventory.read'
      ]::text[])
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION core.resolve_canonical_permission(p_key text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT COALESCE(
    (SELECT a.canonical_key FROM core.permission_key_aliases a WHERE a.legacy_key = p_key),
    p_key
  );
$$;

REVOKE ALL ON FUNCTION core.resolve_canonical_permission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.resolve_canonical_permission(text) TO authenticated;

-- ── 2. 통합 판정: 매트릭스(JSONB) + has_permission(canonical) ────────────────
CREATE OR REPLACE FUNCTION core.member_has_permission(p_org uuid, p_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_canonical text;
BEGIN
  IF p_org IS NULL OR p_key IS NULL OR btrim(p_key) = '' THEN
    RETURN false;
  END IF;

  IF core.is_org_owner_or_admin(p_org) THEN
    RETURN true;
  END IF;

  v_canonical := core.resolve_canonical_permission(p_key);

  -- 1) 직급 JSONB 레거시 키 또는 canonical 키
  IF core.member_has_org_permission(p_org, p_key) THEN
    RETURN true;
  END IF;
  IF v_canonical <> p_key AND core.member_has_org_permission(p_org, v_canonical) THEN
    RETURN true;
  END IF;
  -- billing_invoices ↔ finance.read 양방향
  IF v_canonical = 'finance.read'
     AND core.member_has_org_permission(p_org, 'billing_invoices') THEN
    RETURN true;
  END IF;

  -- 2) authorization_grants + 역할 기본권 (canonical만 catalog에 있을 때)
  IF core.is_known_permission(v_canonical)
     AND core.has_permission(p_org, v_canonical, 'organization', NULL) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION core.member_has_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.member_has_permission(uuid, text) TO authenticated;

COMMENT ON FUNCTION core.member_has_permission(uuid, text) IS
  'Phase 4 통합 권한. JSONB 매트릭스 + permission_key_aliases + has_permission.';

-- ── 3. 스코프 fail-closed 옵트인 (기본은 기존 fail-open 유지) ────────────────
CREATE OR REPLACE FUNCTION core.org_rbac_scope_fail_closed(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT COALESCE(
    (SELECT (o.settings->'rbac'->>'scope_fail_closed')::boolean
     FROM core.organizations o WHERE o.id = p_org),
    false
  );
$$;

CREATE OR REPLACE FUNCTION core.has_permission(
  p_organization_id UUID,
  p_permission TEXT,
  p_scope_type TEXT DEFAULT 'organization',
  p_scope_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_role core.member_role;
  v_has_scope_assignment BOOLEAN;
  v_perm TEXT;
BEGIN
  IF auth.uid() IS NULL OR p_organization_id IS NULL THEN
    RETURN false;
  END IF;

  v_perm := core.resolve_canonical_permission(p_permission);

  IF NOT core.is_known_permission(v_perm) THEN
    RETURN false;
  END IF;
  IF p_scope_type IS NULL
     OR p_scope_type NOT IN ('organization', 'location', 'resource', 'customer') THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM core.authorization_grants g
    WHERE g.organization_id = p_organization_id
      AND g.user_id = auth.uid()
      AND g.permission = v_perm
      AND g.is_active = true
      AND (
        g.scope_type = 'organization'
        OR (
          g.scope_type = p_scope_type
          AND g.scope_id IS NOT DISTINCT FROM NULLIF(btrim(p_scope_id), '')
        )
      )
  ) THEN
    RETURN true;
  END IF;

  IF core.is_org_admin(p_organization_id) THEN
    RETURN true;
  END IF;

  IF core.is_org_staff_actor(p_organization_id) THEN
    v_role := core.get_org_role(p_organization_id);
    IF NOT core.role_has_default_permission(v_role, v_perm) THEN
      RETURN false;
    END IF;

    IF p_scope_type = 'organization' THEN
      RETURN true;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM core.authorization_grants g
      WHERE g.organization_id = p_organization_id
        AND g.user_id = auth.uid()
        AND g.scope_type = p_scope_type
        AND g.is_active = true
    ) INTO v_has_scope_assignment;

    IF NOT v_has_scope_assignment THEN
      -- Phase 4: 옵트인 fail-closed
      IF core.org_rbac_scope_fail_closed(p_organization_id) THEN
        RETURN false;
      END IF;
      RETURN true;
    END IF;

    RETURN EXISTS (
      SELECT 1
      FROM core.authorization_grants g
      WHERE g.organization_id = p_organization_id
        AND g.user_id = auth.uid()
        AND g.scope_type = p_scope_type
        AND g.scope_id IS NOT DISTINCT FROM NULLIF(btrim(p_scope_id), '')
        AND g.is_active = true
    );
  END IF;

  RETURN false;
END;
$$;

-- ── 4. 파일럿 RLS: payments / sales / products ───────────────────────────────
DROP POLICY IF EXISTS payments_dynamic_finance_rbac ON core.payments;
CREATE POLICY payments_dynamic_finance_rbac ON core.payments
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    core.is_org_owner_or_admin(organization_id)
    OR core.member_has_permission(organization_id, 'finance.read')
    OR core.member_has_permission(organization_id, 'sales.read')
    OR core.member_has_permission(organization_id, 'reports.read')
  )
  WITH CHECK (
    core.is_org_owner_or_admin(organization_id)
    OR core.member_has_permission(organization_id, 'finance.read')
    OR core.member_has_permission(organization_id, 'sales.create')
  );

DROP POLICY IF EXISTS sales_dynamic_finance_rbac ON core.sales;
CREATE POLICY sales_dynamic_finance_rbac ON core.sales
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    core.is_org_owner_or_admin(organization_id)
    OR core.member_has_permission(organization_id, 'finance.read')
    OR core.member_has_permission(organization_id, 'sales.read')
    OR core.member_has_permission(organization_id, 'reports.read')
  )
  WITH CHECK (
    core.is_org_owner_or_admin(organization_id)
    OR core.member_has_permission(organization_id, 'sales.create')
    OR core.member_has_permission(organization_id, 'finance.read')
  );

-- products: 조회는 멤버, 쓰기는 inventory/sales 권한
DROP POLICY IF EXISTS products_phase4_write_rbac ON core.products;
CREATE POLICY products_phase4_write_rbac ON core.products
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    core.is_org_owner_or_admin(organization_id)
    OR core.member_has_permission(organization_id, 'inventory.write')
    OR core.member_has_permission(organization_id, 'sales.create')
  );

DROP POLICY IF EXISTS products_phase4_update_rbac ON core.products;
CREATE POLICY products_phase4_update_rbac ON core.products
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    core.is_org_owner_or_admin(organization_id)
    OR core.member_has_permission(organization_id, 'inventory.write')
    OR core.member_has_permission(organization_id, 'sales.create')
  )
  WITH CHECK (
    core.is_org_owner_or_admin(organization_id)
    OR core.member_has_permission(organization_id, 'inventory.write')
    OR core.member_has_permission(organization_id, 'sales.create')
  );

DROP POLICY IF EXISTS products_phase4_delete_rbac ON core.products;
CREATE POLICY products_phase4_delete_rbac ON core.products
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    core.is_org_owner_or_admin(organization_id)
    OR core.member_has_permission(organization_id, 'inventory.write')
  );

-- ── 5. 필드 ACL 최소 (PII / 금액) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS core.sensitive_field_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  column_name text NOT NULL,
  required_permission text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity, column_name)
);

COMMENT ON TABLE core.sensitive_field_policies IS
  '민감 컬럼 접근에 필요한 canonical permission (필드 ACL)';

INSERT INTO core.sensitive_field_policies (entity, column_name, required_permission) VALUES
  ('customers', 'phone', 'customers.write'),
  ('customers', 'email', 'customers.write'),
  ('payments', 'amount', 'finance.read'),
  ('sales', 'total_amount', 'sales.read')
ON CONFLICT (entity, column_name) DO UPDATE
  SET required_permission = EXCLUDED.required_permission;

ALTER TABLE core.sensitive_field_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sensitive_field_policies_select ON core.sensitive_field_policies;
CREATE POLICY sensitive_field_policies_select ON core.sensitive_field_policies
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON core.sensitive_field_policies TO authenticated;

-- PII 마스킹 고객 조회 (phone/email은 customers.write 없으면 마스킹)
CREATE OR REPLACE FUNCTION core.get_customer_masked(p_org_id uuid, p_customer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_row core.customers%ROWTYPE;
  v_can_pii boolean;
BEGIN
  IF NOT core.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_row
  FROM core.customers c
  WHERE c.id = p_customer_id AND c.organization_id = p_org_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_can_pii := core.member_has_permission(p_org_id, 'customers.write')
            OR core.is_org_owner_or_admin(p_org_id);

  RETURN jsonb_build_object(
    'id', v_row.id,
    'organization_id', v_row.organization_id,
    'name', v_row.name,
    'phone', CASE WHEN v_can_pii THEN v_row.phone
                  WHEN v_row.phone IS NULL OR length(v_row.phone) < 4 THEN '****'
                  ELSE repeat('*', greatest(length(v_row.phone) - 4, 0)) || right(v_row.phone, 4)
             END,
    'email', CASE WHEN v_can_pii THEN v_row.email
                  WHEN v_row.email IS NULL THEN NULL
                  ELSE regexp_replace(v_row.email, '^(.{0,2}).*(@.*)$', '\1***\2')
             END,
    'pii_masked', NOT v_can_pii
  );
END;
$$;

REVOKE ALL ON FUNCTION core.get_customer_masked(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.get_customer_masked(uuid, uuid) TO authenticated;

COMMIT;
