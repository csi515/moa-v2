-- =============================================================================
-- Moa v2: Delegated RBAC Management & Instant Session Revocation
-- File: 20261019180000_delegated_rbac_management.sql
-- 
-- 주요 기능:
-- 1. 권한 키 표준 네임스페이스 규격화 (members:manage, roles:assign, seat_room 등)
-- 2. 기업 총무팀 기본 직급 템플릿(총무/시설 관리자) 시드/프리필
-- 3. 원자적 권한 부여/회수 보안 RPC (core.assign_or_revoke_member_role)
--    - 호출자 권한 검증: owner 또는 roles:assign 보유자 필수
--    - 대표 사업자(owner) 권한 수정/박탈 시도 차단
--    - 권한 상승(Privilege Escalation) 원천 방어: 위임 관리자가 본인에게 없는 권한을 타인에게 부여 불가
--    - 세션 즉시 파기: token_version 원자적 증가 (+1)
--    - 불변 감사 로그(core.audit_logs) 적재
-- 4. public schema RPC 래퍼 및 RLS 정책 보강
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. organization_roles 테이블 기본값 및 네임스페이스 보강
-- -----------------------------------------------------------------------------
ALTER TABLE core.organization_roles
  ALTER COLUMN permissions SET DEFAULT '{
    "billing_invoices": false,
    "attendance": true,
    "booking": true,
    "passes": true,
    "statistics": false,
    "members:manage": false,
    "roles:assign": false,
    "seat_room": false,
    "rental_equipment": false,
    "policies": false,
    "resources_manage": false,
    "grievances_manage": false
  }'::jsonb;

-- -----------------------------------------------------------------------------
-- 2. 기업용 총무팀 기본 직급 템플릿(Pre-fill) 시드
-- -----------------------------------------------------------------------------
INSERT INTO core.organization_roles (
  tenant_id,
  name,
  description,
  is_system,
  permissions
)
SELECT
  org.id,
  '총무/시설 관리자',
  '기업 총무팀 위임 관리자 (좌석/예약/대여 관리 및 직원 직급·권한 위임 관리)',
  false,
  '{
    "members:manage": true,
    "roles:assign": true,
    "seat_room": true,
    "booking": true,
    "rental_equipment": true,
    "billing_invoices": false,
    "attendance": true,
    "passes": true,
    "policies": false,
    "statistics": false,
    "resources_manage": true,
    "grievances_manage": false
  }'::jsonb
FROM core.organizations org
ON CONFLICT (tenant_id, name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. 원자적 권한 부여 및 회수 보안 RPC: core.assign_or_revoke_member_role
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.assign_or_revoke_member_role(
    p_target_member_id UUID,
    p_new_role_id UUID DEFAULT NULL, -- NULL이면 직급 회수(기본 직원으로 강등)
    p_reason TEXT DEFAULT ''
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
    v_caller_role VARCHAR(32);
    v_caller_perms JSONB;
    v_target_role VARCHAR(32);
    v_tenant_id UUID;
    v_new_role_perms JSONB;
    v_key TEXT;
    v_val TEXT;
BEGIN
    -- 1. 호출자의 소속 테넌트 및 권한 조회
    SELECT
      m.organization_id,
      m.role::text,
      COALESCE(r.permissions, '{}'::jsonb)
    INTO
      v_tenant_id,
      v_caller_role,
      v_caller_perms
    FROM core.organization_members m
    LEFT JOIN core.organization_roles r
      ON (r.id = m.organization_role_id OR r.id = m.custom_role_id)
    WHERE m.user_id = auth.uid()
      AND m.is_active = true
      AND m.deleted_at IS NULL
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION '호출자의 멤버십 정보를 찾을 수 없습니다.' USING ERRCODE = '42501';
    END IF;

    -- 2. 실행 권한 검증: 사업자('owner')이거나 'roles:assign' 권한 보유 필수
    IF v_caller_role != 'owner' AND NOT (
        COALESCE((v_caller_perms->>'roles:assign')::boolean, false) OR
        COALESCE((v_caller_perms->>'roles_assign')::boolean, false)
    ) THEN
        RAISE EXCEPTION '권한이 없습니다: 직급을 부여하거나 회수할 권한이 부여되지 않았습니다.' USING ERRCODE = '42501';
    END IF;

    -- 3. 대상 직원 조회 및 권한 상승/사업자 침범 방어
    SELECT role::text INTO v_target_role
    FROM core.organization_members
    WHERE id = p_target_member_id
      AND organization_id = v_tenant_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION '대상 직원을 찾을 수 없습니다.' USING ERRCODE = 'P0002';
    END IF;

    IF v_target_role = 'owner' THEN
        RAISE EXCEPTION '대표 사업자의 권한은 수정하거나 회수할 수 없습니다.' USING ERRCODE = '42501';
    END IF;

    -- 3.5. 권한 상승(Privilege Escalation) 원천 방어:
    -- 총무팀 위임 관리자는 본인이 보유하지 않은 권한이 포함된 직급을 타인에게 부여할 수 없음
    IF v_caller_role != 'owner' AND p_new_role_id IS NOT NULL THEN
        SELECT permissions INTO v_new_role_perms
        FROM core.organization_roles
        WHERE id = p_new_role_id
          AND tenant_id = v_tenant_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION '부여하려는 직급을 찾을 수 없습니다.' USING ERRCODE = 'P0002';
        END IF;

        FOR v_key, v_val IN
            SELECT key, value::text
            FROM jsonb_each(v_new_role_perms)
            WHERE value::text = 'true'
        LOOP
            IF NOT COALESCE((v_caller_perms->>v_key)::boolean, false) THEN
                RAISE EXCEPTION '권한 상승 방지: 본인이 보유하지 않은 권한(%)을 포함한 직급은 부여할 수 없습니다.', v_key USING ERRCODE = '42501';
            END IF;
        END LOOP;
    END IF;

    -- 4. 직급 부여/회수 및 세션 즉시 파기(token_version 증가)
    UPDATE core.organization_members
    SET organization_role_id = p_new_role_id,
        custom_role_id = p_new_role_id,
        token_version = token_version + 1,
        updated_at = now()
    WHERE id = p_target_member_id
      AND organization_id = v_tenant_id;

    -- 5. 불변 감사 로그 적재
    INSERT INTO core.audit_logs (
        organization_id,
        actor_user_id,
        action,
        entity_type,
        entity_id,
        after_data
    )
    VALUES (
        v_tenant_id,
        auth.uid(),
        CASE WHEN p_new_role_id IS NULL THEN 'ROLE_REVOKED' ELSE 'ROLE_ASSIGNED' END,
        'permissions',
        p_target_member_id::text,
        jsonb_build_object(
            'target_member_id', p_target_member_id,
            'assigned_role_id', p_new_role_id,
            'reason', COALESCE(p_reason, ''),
            'assigned_at', now()
        )
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. public schema RPC 래퍼 등록 및 권한 부여
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_or_revoke_member_role(
    p_target_member_id UUID,
    p_new_role_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT ''
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
BEGIN
    PERFORM core.assign_or_revoke_member_role(p_target_member_id, p_new_role_id, p_reason);
END;
$$;

GRANT EXECUTE ON FUNCTION core.assign_or_revoke_member_role(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_or_revoke_member_role(UUID, UUID, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. RLS 정책 보강: organization_members UPDATE 잠금 및 권한 통제
-- -----------------------------------------------------------------------------
-- 직접 UPDATE로 직급을 우회 변경하지 못하도록 트리거 가드 추가
CREATE OR REPLACE FUNCTION core.prevent_unauthorized_member_role_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_caller_role VARCHAR(32);
  v_caller_perms JSONB;
BEGIN
  -- role, organization_role_id, custom_role_id가 변경되는 경우
  IF (OLD.role IS DISTINCT FROM NEW.role)
     OR (OLD.organization_role_id IS DISTINCT FROM NEW.organization_role_id)
     OR (OLD.custom_role_id IS DISTINCT FROM NEW.custom_role_id) THEN

    -- 대상이 owner인 경우 임의 수정 절대 불가
    IF OLD.role = 'owner' AND (NEW.role IS DISTINCT FROM 'owner' OR NEW.organization_role_id IS NOT NULL) THEN
      RAISE EXCEPTION '대표 사업자의 권한은 수정하거나 회수할 수 없습니다.' USING ERRCODE = '42501';
    END IF;

    -- 직급 변경 시 token_version 자동 증가
    IF (OLD.organization_role_id IS DISTINCT FROM NEW.organization_role_id)
       OR (OLD.custom_role_id IS DISTINCT FROM NEW.custom_role_id) THEN
      NEW.token_version := COALESCE(OLD.token_version, 1) + 1;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_unauthorized_member_role_update ON core.organization_members;
CREATE TRIGGER trg_prevent_unauthorized_member_role_update
  BEFORE UPDATE ON core.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION core.prevent_unauthorized_member_role_update();

-- organization_members UPDATE RLS 정책 업데이트 (위임 관리자 roles:assign 및 members:manage 포함)
DROP POLICY IF EXISTS organization_members_update ON core.organization_members;
CREATE POLICY organization_members_update ON core.organization_members
  FOR UPDATE TO authenticated
  USING (
    core.is_org_owner_or_admin(organization_id)
    OR core.member_has_org_permission(organization_id, 'roles:assign')
    OR core.member_has_org_permission(organization_id, 'members:manage')
  )
  WITH CHECK (
    core.is_org_owner_or_admin(organization_id)
    OR core.member_has_org_permission(organization_id, 'roles:assign')
    OR core.member_has_org_permission(organization_id, 'members:manage')
  );

COMMIT;
