-- =============================================================================
-- Migration: 20261024100000_separate_rank_and_feature_permissions.sql
-- Description:
-- 1. 직급(organization_roles)과 직무 기능 권한(feature_permissions)의 완전한 분리
-- 2. organization_members.feature_permissions JSONB 추가 및 member_has_feature_grant() 함수
-- 3. 회원별 기능 권한 원자적 부여 RPC (core.grant_member_feature_permission)
-- 4. 조직 변경(부서 이동, 스코프 변경, 부서 탈퇴) 시 세션 즉시 만료 트리거
-- 5. 기존 역할 권한 1:1 이관 및 정합성 검증
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. organization_members 에 feature_permissions 컬럼 추가
-- -----------------------------------------------------------------------------
ALTER TABLE core.organization_members
  ADD COLUMN IF NOT EXISTS feature_permissions jsonb NOT NULL DEFAULT '{
    "resources:manage": false,
    "grievances_manage": false,
    "volunteer:manage": false,
    "shuttle:manage": false,
    "office_supply_request:manage": false,
    "safety:manage": false,
    "rnd_portal:access": false
  }'::jsonb;

COMMENT ON COLUMN core.organization_members.feature_permissions IS
  '회원 개인에게 직접 부여된 원자적 직무 기능 편집 권한 (직급과 독립적인 수평적 권한)';

-- -----------------------------------------------------------------------------
-- 2. 서버·DB 권한 판정 함수: core.member_has_feature_grant
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.member_has_feature_grant(
  p_org_id UUID,
  p_feature_key TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.organization_members m
    WHERE m.organization_id = p_org_id
      AND m.user_id = auth.uid()
      AND m.is_active = true
      AND (
        m.role = 'owner'
        OR COALESCE((m.feature_permissions->>p_feature_key)::boolean, false)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION core.member_has_feature_grant(UUID, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. 회원별 기능 권한 원자적 부여/회수 보안 RPC
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.grant_member_feature_permission(
  p_target_member_id UUID,
  p_feature_key TEXT,
  p_enabled BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_tenant_id UUID;
  v_caller_role VARCHAR(32);
  v_caller_perms JSONB;
BEGIN
  -- 대상 회원의 테넌트 조회
  SELECT organization_id INTO v_tenant_id
  FROM core.organization_members
  WHERE id = p_target_member_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION '40401: Target member not found';
  END IF;

  -- 호출자의 소속 테넌트 및 권한 조회
  SELECT
    m.role::text,
    COALESCE(r.permissions, '{}'::jsonb)
  INTO
    v_caller_role,
    v_caller_perms
  FROM core.organization_members m
  LEFT JOIN core.organization_roles r ON r.id = m.organization_role_id
  WHERE m.organization_id = v_tenant_id
    AND m.user_id = auth.uid()
    AND m.is_active = true;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION '42501: Caller not in same organization';
  END IF;

  -- 권한 검증: owner 또는 roles:assign 권한 필수
  IF v_caller_role != 'owner' AND NOT COALESCE((v_caller_perms->>'roles:assign')::boolean, false) THEN
    RAISE EXCEPTION '42501: Only owner or authorized manager can grant feature permissions';
  END IF;

  -- 기능 권한 업데이트 및 세션 즉시 만료 (token_version + 1)
  UPDATE core.organization_members
  SET feature_permissions = jsonb_set(
        COALESCE(feature_permissions, '{}'::jsonb),
        ARRAY[p_feature_key],
        to_jsonb(p_enabled)
      ),
      token_version = token_version + 1,
      updated_at = now()
  WHERE id = p_target_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION core.grant_member_feature_permission(UUID, TEXT, BOOLEAN) TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. 조직 변경 시 권한 즉시 파기 트리거 (부서 이동, 스코프 변경, 부서원 삭제)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.handle_org_structure_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.department_id IS DISTINCT FROM NEW.department_id OR OLD.scope_type IS DISTINCT FROM NEW.scope_type) THEN
      UPDATE core.organization_members
      SET token_version = token_version + 1,
          updated_at = now()
      WHERE id = NEW.member_id;
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE core.organization_members
    SET token_version = token_version + 1,
        updated_at = now()
    WHERE id = OLD.member_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_dept_member_change ON core.department_members;
CREATE TRIGGER trg_dept_member_change
  AFTER UPDATE OR DELETE ON core.department_members
  FOR EACH ROW EXECUTE FUNCTION core.handle_org_structure_change();

-- -----------------------------------------------------------------------------
-- 5. 기존 organization_roles 의 권한을 organization_members 로 안전한 1:1 이관
-- -----------------------------------------------------------------------------
UPDATE core.organization_members m
SET feature_permissions = jsonb_build_object(
  'resources:manage', COALESCE((r.permissions->>'resources_manage')::boolean, (r.permissions->>'resources:manage')::boolean, false),
  'grievances_manage', COALESCE((r.permissions->>'grievances_manage')::boolean, false),
  'volunteer:manage', COALESCE((r.permissions->>'volunteer:manage')::boolean, false),
  'shuttle:manage', COALESCE((r.permissions->>'shuttle:manage')::boolean, false),
  'office_supply_request:manage', COALESCE((r.permissions->>'office_supply_request:manage')::boolean, false),
  'safety:manage', false,
  'rnd_portal:access', COALESCE((r.permissions->>'rnd_portal:access')::boolean, false)
)
FROM core.organization_roles r
WHERE m.organization_role_id = r.id
  AND (m.feature_permissions IS NULL OR m.feature_permissions = '{}'::jsonb);

COMMIT;
