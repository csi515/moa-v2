-- 무한 계층 부서와 스코프 멤버십. 기존 organization_id를 테넌트 키로 사용한다.

BEGIN;

CREATE TABLE IF NOT EXISTS core.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  parent_id UUID NULL REFERENCES core.departments(id) ON DELETE RESTRICT,
  name VARCHAR(64) NOT NULL,
  path TEXT NOT NULL,
  depth INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT departments_name_len CHECK (length(btrim(name)) > 0)
);

-- 선행 mbo_cycle_and_departments 테이블이 있으면 계층 컬럼만 보강한다.
ALTER TABLE core.departments ADD COLUMN IF NOT EXISTS parent_id UUID NULL REFERENCES core.departments(id) ON DELETE RESTRICT;
ALTER TABLE core.departments ADD COLUMN IF NOT EXISTS path TEXT;
ALTER TABLE core.departments ADD COLUMN IF NOT EXISTS depth INT NOT NULL DEFAULT 1;

UPDATE core.departments
SET path = '/' || id::text || '/',
    depth = 1
WHERE path IS NULL;

ALTER TABLE core.departments ALTER COLUMN path SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_departments_tenant_path
  ON core.departments (organization_id, path);

CREATE TABLE IF NOT EXISTS core.department_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES core.departments(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES core.organization_members(id) ON DELETE CASCADE,
  custom_role_id UUID NULL REFERENCES core.organization_roles(id) ON DELETE SET NULL,
  scope_type VARCHAR(16) NOT NULL DEFAULT 'SELF_ONLY',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT department_members_scope_check CHECK (scope_type IN ('GLOBAL', 'DESCENDANTS', 'SELF_ONLY')),
  CONSTRAINT department_members_unique UNIQUE (department_id, member_id)
);

ALTER TABLE core.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.department_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS departments_member_read ON core.departments;
CREATE POLICY departments_member_read ON core.departments
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

DROP POLICY IF EXISTS departments_owner_write ON core.departments;
CREATE POLICY departments_owner_write ON core.departments
  FOR ALL TO authenticated
  USING (core.member_has_org_permission(organization_id, 'members_manage') OR EXISTS (
    SELECT 1 FROM core.organization_members m
    WHERE m.organization_id = departments.organization_id
      AND m.user_id = auth.uid() AND m.role = 'owner' AND m.is_active = true
  ))
  WITH CHECK (core.is_org_member(organization_id));

DROP POLICY IF EXISTS department_members_read ON core.department_members;
CREATE POLICY department_members_read ON core.department_members
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

DROP POLICY IF EXISTS department_members_write ON core.department_members;
CREATE POLICY department_members_write ON core.department_members
  FOR ALL TO authenticated
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

CREATE OR REPLACE FUNCTION core.department_scope_allows(
  p_scope TEXT,
  p_member_department UUID,
  p_member_path TEXT,
  p_resource_department UUID,
  p_resource_path TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_resource_department IS NULL THEN
    RETURN TRUE;
  END IF;
  IF p_scope = 'GLOBAL' THEN
    RETURN TRUE;
  END IF;
  IF p_scope = 'SELF_ONLY' THEN
    RETURN p_member_department = p_resource_department;
  END IF;
  IF p_scope = 'DESCENDANTS' AND p_member_path IS NOT NULL AND p_resource_path IS NOT NULL THEN
    RETURN p_resource_path LIKE p_member_path || '%';
  END IF;
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION core.move_department(p_department_id UUID, p_new_parent_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
DECLARE
  v_org UUID;
  v_old_path TEXT;
  v_new_path TEXT;
  v_parent_org UUID;
  v_parent_path TEXT;
BEGIN
  SELECT organization_id, path INTO v_org, v_old_path
  FROM core.departments WHERE id = p_department_id FOR UPDATE;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'department missing' USING ERRCODE = '42501';
  END IF;
  IF NOT core.member_has_org_permission(v_org, 'members_manage') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_new_parent_id IS NULL THEN
    v_new_path := '/' || p_department_id::text || '/';
  ELSE
    SELECT organization_id, path INTO v_parent_org, v_parent_path
    FROM core.departments WHERE id = p_new_parent_id;
    IF v_parent_org IS DISTINCT FROM v_org THEN
      RAISE EXCEPTION 'cross tenant move' USING ERRCODE = '42501';
    END IF;
    IF v_parent_path LIKE v_old_path || '%' THEN
      RAISE EXCEPTION 'cycle' USING ERRCODE = '42501';
    END IF;
    v_new_path := rtrim(v_parent_path, '/') || '/' || p_department_id::text || '/';
  END IF;
  UPDATE core.departments
  SET path = v_new_path || substring(path FROM length(v_old_path) + 1),
      depth = array_length(string_to_array(trim(both '/' FROM (v_new_path || substring(path FROM length(v_old_path) + 1))), '/'), 1),
      parent_id = CASE WHEN id = p_department_id THEN p_new_parent_id ELSE parent_id END
  WHERE organization_id = v_org AND path LIKE v_old_path || '%';
END;
$$;

CREATE OR REPLACE FUNCTION core.assign_or_revoke_member_role(
  p_member_id UUID,
  p_role_id UUID,
  p_revoke BOOLEAN DEFAULT FALSE
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
DECLARE
  v_org UUID;
  v_role TEXT;
  v_actor UUID;
BEGIN
  SELECT organization_id, role INTO v_org, v_role
  FROM core.organization_members WHERE id = p_member_id FOR UPDATE;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'member missing' USING ERRCODE = '42501';
  END IF;
  IF NOT (
    EXISTS (
      SELECT 1 FROM core.organization_members m
      WHERE m.organization_id = v_org AND m.user_id = auth.uid() AND m.role = 'owner' AND m.is_active
    )
    OR core.member_has_org_permission(v_org, 'roles:assign')
    OR core.member_has_org_permission(v_org, 'members_manage')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_role = 'owner' THEN
    RAISE EXCEPTION 'owner role locked' USING ERRCODE = '42501';
  END IF;
  UPDATE core.organization_members
  SET organization_role_id = CASE WHEN p_revoke THEN NULL ELSE p_role_id END,
      token_version = token_version + 1
  WHERE id = p_member_id;
  v_actor := auth.uid();
  INSERT INTO core.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, after_data)
  VALUES (
    v_org,
    v_actor,
    CASE WHEN p_revoke THEN 'ROLE_REVOKED' ELSE 'ROLE_ASSIGNED' END,
    'staff',
    p_member_id::text,
    jsonb_build_object('role_id', p_role_id, 'revoke', p_revoke)
  );
END;
$$;

CREATE OR REPLACE FUNCTION core.transfer_organization_ownership(
  p_organization_id UUID,
  p_next_owner_member_id UUID,
  p_reason TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
DECLARE
  v_current UUID;
BEGIN
  SELECT id INTO v_current
  FROM core.organization_members
  WHERE organization_id = p_organization_id AND user_id = auth.uid() AND role = 'owner' AND is_active
  FOR UPDATE;
  IF v_current IS NULL THEN
    RAISE EXCEPTION 'owner required' USING ERRCODE = '42501';
  END IF;
  IF v_current = p_next_owner_member_id THEN
    RAISE EXCEPTION 'same owner' USING ERRCODE = '42501';
  END IF;
  UPDATE core.organization_members
  SET role = 'owner', token_version = token_version + 1
  WHERE id = p_next_owner_member_id AND organization_id = p_organization_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'target missing' USING ERRCODE = '42501';
  END IF;
  UPDATE core.organization_members
  SET role = 'member', token_version = token_version + 1
  WHERE id = v_current;
  INSERT INTO core.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, after_data)
  VALUES (
    p_organization_id,
    auth.uid(),
    'OWNERSHIP_TRANSFERRED',
    'permissions',
    p_organization_id::text,
    jsonb_build_object('from', v_current, 'to', p_next_owner_member_id, 'reason', p_reason)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.move_department(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.assign_or_revoke_member_role(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION core.transfer_organization_ownership(UUID, UUID, TEXT) TO authenticated;

COMMIT;
