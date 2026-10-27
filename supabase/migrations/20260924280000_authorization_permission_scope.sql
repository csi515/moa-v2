-- Role + Permission + Scope 기반.
-- 기존 is_org_admin / is_org_staff_actor / rls_staff_or_admin / staff_owns_* 를 제거하지 않는다.
-- 기존 RLS 정책을 교체하지 않는다.

BEGIN;

CREATE TABLE core.permission_catalog (
  permission  TEXT PRIMARY KEY,
  resource    TEXT NOT NULL,
  action      TEXT NOT NULL,
  description TEXT NOT NULL,
  CONSTRAINT permission_catalog_key_check CHECK (permission ~ '^[a-z]+(\.[a-z]+)+$')
);

COMMENT ON TABLE core.permission_catalog IS
  '권한 카탈로그. src/core/authorization/registry.ts 와 키가 동일해야 한다.';

INSERT INTO core.permission_catalog (permission, resource, action, description) VALUES
  ('customers.read',  'customers', 'read',   '고객 조회'),
  ('customers.write', 'customers', 'write',  '고객 생성·수정'),
  ('sales.read',      'sales',     'read',   '판매 조회'),
  ('sales.create',    'sales',     'create', '판매 생성'),
  ('sales.refund',    'sales',     'refund', '판매 반품·환불'),
  ('rooms.read',      'rooms',     'read',   '객실·공간 조회'),
  ('rooms.manage',    'rooms',     'manage', '객실·공간 관리'),
  ('staff.read',      'staff',     'read',   '직원 조회'),
  ('staff.manage',    'staff',     'manage', '직원 관리'),
  ('reports.read',    'reports',   'read',   '리포트 조회'),
  ('finance.read',    'finance',   'read',   '회계·정산 조회');

ALTER TABLE core.permission_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY permission_catalog_select ON core.permission_catalog
  FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON core.permission_catalog TO authenticated;

CREATE TABLE core.authorization_grants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,
  permission      TEXT NOT NULL REFERENCES core.permission_catalog(permission),
  scope_type      TEXT NOT NULL DEFAULT 'organization',
  scope_id        TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT authorization_grants_scope_type_check
    CHECK (scope_type IN ('organization', 'location', 'resource', 'customer')),
  CONSTRAINT authorization_grants_scope_id_check
    CHECK (
      (scope_type = 'organization' AND scope_id IS NULL)
      OR (scope_type <> 'organization' AND length(btrim(scope_id)) > 0)
    )
);

COMMENT ON TABLE core.authorization_grants IS
  '향후 location/finance 한정 grant. 기존 RLS를 대체하지 않으며 배정 UI는 없다.';

CREATE UNIQUE INDEX uq_authorization_grants_target
  ON core.authorization_grants (
    organization_id,
    user_id,
    permission,
    scope_type,
    COALESCE(scope_id, '')
  );

CREATE INDEX idx_authorization_grants_org_user
  ON core.authorization_grants (organization_id, user_id, is_active);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.authorization_grants
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE core.authorization_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY authorization_grants_select ON core.authorization_grants
  FOR SELECT TO authenticated
  USING (
    core.is_org_member(organization_id)
    OR core.is_org_staff_actor(organization_id)
  );

CREATE POLICY authorization_grants_admin_write ON core.authorization_grants
  FOR ALL TO authenticated
  USING (core.is_org_owner_or_admin(organization_id))
  WITH CHECK (core.is_org_owner_or_admin(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON core.authorization_grants TO authenticated;

CREATE OR REPLACE FUNCTION core.is_known_permission(p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.permission_catalog c
    WHERE c.permission = p_permission
  );
$$;

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
        'rooms.read',
        'staff.read',
        'reports.read'
      ]::text[])
    ELSE false
  END;
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
BEGIN
  IF auth.uid() IS NULL OR p_organization_id IS NULL THEN
    RETURN false;
  END IF;
  IF NOT core.is_known_permission(p_permission) THEN
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
      AND g.permission = p_permission
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

  -- 호환: 본사 관리자(owner/admin/manager)는 조직 전체
  IF core.is_org_admin(p_organization_id) THEN
    RETURN true;
  END IF;

  -- 호환: 직원·강사는 기본 permission + 배정 없으면 전 지점
  IF core.is_org_staff_actor(p_organization_id) THEN
    v_role := core.get_org_role(p_organization_id);
    IF NOT core.role_has_default_permission(v_role, p_permission) THEN
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

COMMENT ON FUNCTION core.is_known_permission(TEXT) IS
  'permission_catalog 존재 여부. 미등록 권한은 fail-closed.';
COMMENT ON FUNCTION core.role_has_default_permission(core.member_role, TEXT) IS
  '역할 기본 permission. owner/admin/manager=전체, staff/instructor=현장 기본.';
COMMENT ON FUNCTION core.has_permission(UUID, TEXT, TEXT, TEXT) IS
  'Role+Permission+Scope 판정. is_org_admin / is_org_staff_actor를 대체하지 않는다.';

COMMENT ON FUNCTION core.is_org_admin(UUID) IS
  '호환 레이어. owner/admin/manager 활성 membership. 세분 권한은 core.has_permission.';
COMMENT ON FUNCTION core.is_org_staff_actor(UUID) IS
  '호환 레이어. owner/admin/manager/staff/instructor. 세분 권한은 core.has_permission.';
COMMENT ON FUNCTION core.rls_staff_or_admin(UUID, BOOLEAN) IS
  '호환 레이어. admin 전체 또는 staff+조건. 기존 RLS 정책을 교체하지 않는다.';

GRANT EXECUTE ON FUNCTION core.is_known_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.role_has_default_permission(core.member_role, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.has_permission(UUID, TEXT, TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION core.is_known_permission(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION core.role_has_default_permission(core.member_role, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION core.has_permission(UUID, TEXT, TEXT, TEXT) FROM anon;

COMMIT;
