-- 사내 스위트: 동적 자원 카탈로그, 특허 persist, RBAC permission alias 보강
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. 동적 자원 종류 마스터 (bookable_resources.kind 와 kind_slug 로 연결)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.resource_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name VARCHAR(64) NOT NULL,
  category VARCHAR(32) NOT NULL,
  kind_slug VARCHAR(64) NOT NULL,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  spec_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT resource_types_category_check CHECK (category IN ('EQUIPMENT', 'SPACE')),
  CONSTRAINT resource_types_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT resource_types_kind_slug_format CHECK (kind_slug ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT uq_resource_types_org_kind UNIQUE (organization_id, kind_slug)
);

CREATE INDEX IF NOT EXISTS idx_resource_types_org
  ON core.resource_types (organization_id, category);

COMMENT ON TABLE core.resource_types IS
  '총무팀 정의 공용자원 종류 카탈로그. kind_slug는 core.bookable_resources.kind 와 매칭.';

ALTER TABLE core.resource_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resource_types_member_select ON core.resource_types;
CREATE POLICY resource_types_member_select ON core.resource_types
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

DROP POLICY IF EXISTS resource_types_manage_write ON core.resource_types;
CREATE POLICY resource_types_manage_write ON core.resource_types
  FOR ALL TO authenticated
  USING (
    core.is_org_owner_or_admin(organization_id)
    OR core.member_has_org_permission(organization_id, 'resources_manage')
    OR core.member_has_org_permission(organization_id, 'resources:manage')
  )
  WITH CHECK (
    core.is_org_owner_or_admin(organization_id)
    OR core.member_has_org_permission(organization_id, 'resources_manage')
    OR core.member_has_org_permission(organization_id, 'resources:manage')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON core.resource_types TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. 연구소 특허 (patent_ip_asset capability persist)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.patents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  application_no VARCHAR(64) NOT NULL DEFAULT '',
  title VARCHAR(128) NOT NULL,
  summary TEXT,
  tech_field VARCHAR(64),
  inventor_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  filing_date DATE,
  document_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT patents_title_not_blank CHECK (length(btrim(title)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_patents_org_status
  ON core.patents (organization_id, status, created_at DESC);

ALTER TABLE core.patents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS patents_member_all ON core.patents;
CREATE POLICY patents_member_all ON core.patents
  FOR ALL TO authenticated
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON core.patents TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. member_has_org_permission: custom_role_id + permission alias
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.member_has_org_permission(p_org uuid, p_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.organization_members m
    LEFT JOIN core.organization_roles r_org ON r_org.id = m.organization_role_id
    LEFT JOIN core.organization_roles r_custom ON r_custom.id = m.custom_role_id
    WHERE m.organization_id = p_org
      AND m.user_id = auth.uid()
      AND m.is_active = true
      AND (
        m.role = 'owner'
        OR COALESCE((r_org.permissions->>p_key)::boolean, false)
        OR COALESCE((r_custom.permissions->>p_key)::boolean, false)
        OR (
          p_key = 'grievances_manage'
          AND (
            COALESCE((r_org.permissions->>'feedbacks:read_all')::boolean, false)
            OR COALESCE((r_custom.permissions->>'feedbacks:read_all')::boolean, false)
          )
        )
        OR (
          p_key = 'resources_manage'
          AND (
            COALESCE((r_org.permissions->>'resources:manage')::boolean, false)
            OR COALESCE((r_custom.permissions->>'resources:manage')::boolean, false)
          )
        )
        OR (
          p_key = 'resources:manage'
          AND (
            COALESCE((r_org.permissions->>'resources_manage')::boolean, false)
            OR COALESCE((r_custom.permissions->>'resources_manage')::boolean, false)
          )
        )
        OR (
          p_key = 'feedbacks:read_all'
          AND (
            COALESCE((r_org.permissions->>'grievances_manage')::boolean, false)
            OR COALESCE((r_custom.permissions->>'grievances_manage')::boolean, false)
          )
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. 부서 스코프 + 직급 배정 원자 RPC (department_members)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.assign_department_member_role(
  p_target_member_id UUID,
  p_department_id UUID,
  p_role_id UUID,
  p_scope_type VARCHAR(16) DEFAULT 'SELF_ONLY'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
DECLARE
  v_org UUID;
  v_scope TEXT;
BEGIN
  v_scope := upper(btrim(COALESCE(p_scope_type, 'SELF_ONLY')));
  IF v_scope NOT IN ('GLOBAL', 'DESCENDANTS', 'SELF_ONLY') THEN
    RAISE EXCEPTION 'invalid scope' USING ERRCODE = '22023';
  END IF;

  SELECT organization_id INTO v_org
  FROM core.organization_members
  WHERE id = p_target_member_id AND is_active = true
  FOR UPDATE;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'member missing' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    core.is_org_owner_or_admin(v_org)
    OR core.member_has_org_permission(v_org, 'roles:assign')
    OR core.member_has_org_permission(v_org, 'members_manage')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM core.departments d
    WHERE d.id = p_department_id AND d.organization_id = v_org
  ) THEN
    RAISE EXCEPTION 'department missing' USING ERRCODE = '42501';
  END IF;

  INSERT INTO core.department_members (
    organization_id, department_id, member_id, custom_role_id, scope_type
  ) VALUES (
    v_org, p_department_id, p_target_member_id, p_role_id, v_scope
  )
  ON CONFLICT (department_id, member_id) DO UPDATE
    SET custom_role_id = EXCLUDED.custom_role_id,
        scope_type = EXCLUDED.scope_type;

  UPDATE core.organization_members
  SET organization_role_id = COALESCE(p_role_id, organization_role_id),
      custom_role_id = COALESCE(p_role_id, custom_role_id),
      token_version = token_version + 1,
      updated_at = now()
  WHERE id = p_target_member_id;

  INSERT INTO core.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, after_data)
  VALUES (
    v_org,
    auth.uid(),
    'DEPARTMENT_ROLE_ASSIGNED',
    'staff',
    p_target_member_id::text,
    jsonb_build_object(
      'department_id', p_department_id,
      'role_id', p_role_id,
      'scope_type', v_scope
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.assign_department_member_role(UUID, UUID, UUID, VARCHAR) TO authenticated;

COMMIT;
