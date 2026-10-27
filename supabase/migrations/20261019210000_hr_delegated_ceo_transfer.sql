-- =============================================================================
-- Moa v2: HR-Delegated CEO Ownership Transfer & Explicit Authorization
-- File: 20261019210000_hr_delegated_ceo_transfer.sql
-- 
-- 주요 기능:
-- 1. 권한 키 표준 네임스페이스에 'ownership:transfer' 추가 (기본값: false)
-- 2. CEO 대표자 소유권 이전 원자적 보안 RPC (core.transfer_organization_ownership) 확장:
--    - 호출자가 대표 사업자(owner)이거나,
--    - 사전에 명시적으로 'ownership:transfer' 권한을 위임받은 인사팀 관리자 실행 허용
--    - 신임 대표자(role = 'owner') 승격 & 전임 대표자(role = 'member') 전환
--    - 양측 세션 즉시 파기 (token_version + 1)
--    - 인사팀 실행자(대행자)의 user_id 및 변경 사유를 core.audit_logs에 불변 적재
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. organization_roles 테이블 permissions 기본값에 'ownership:transfer' 추가
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
    "grievances_manage": false,
    "ownership:transfer": false
  }'::jsonb;

-- -----------------------------------------------------------------------------
-- 2. CEO 대표자 소유권 이전 원자적 보안 RPC 보강
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.transfer_organization_ownership(
    p_new_owner_member_id UUID,
    p_reason TEXT DEFAULT ''
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
    v_tenant_id UUID;
    v_caller_member_id UUID;
    v_caller_role VARCHAR(32);
    v_caller_perms JSONB;
    v_current_owner_member_id UUID;
    v_current_owner_user_id UUID;
    v_target_role VARCHAR(32);
    v_target_is_active BOOLEAN;
    v_target_user_id UUID;
    v_is_owner BOOLEAN;
    v_has_transfer_perm BOOLEAN;
BEGIN
    -- 1. 호출자의 소속 테넌트, role, permissions 조회
    SELECT
      m.organization_id,
      m.id,
      m.role::text,
      COALESCE(r.permissions, '{}'::jsonb)
    INTO
      v_tenant_id,
      v_caller_member_id,
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

    -- 2. 실행 권한 검증:
    -- 대표 사업자(owner)이거나, 사전에 명시적으로 'ownership:transfer' 권한을 부여받은 인사팀 관리자만 가능
    v_is_owner := (v_caller_role = 'owner');
    v_has_transfer_perm := (
        COALESCE((v_caller_perms->>'ownership:transfer')::boolean, false) OR
        COALESCE((v_caller_perms->>'ownership_transfer')::boolean, false)
    );

    IF NOT (v_is_owner OR v_has_transfer_perm) THEN
        RAISE EXCEPTION '권한이 없습니다: 대표 사업자(owner) 또는 대표이사 변경 권한(ownership:transfer)을 위임받은 관리자만 소유권을 이전할 수 있습니다.' USING ERRCODE = '42501';
    END IF;

    -- 3. 현재 사업장의 기존 대표이사(owner) 조회
    SELECT id, user_id
    INTO v_current_owner_member_id, v_current_owner_user_id
    FROM core.organization_members
    WHERE organization_id = v_tenant_id
      AND role = 'owner'
      AND is_active = true
      AND deleted_at IS NULL
    LIMIT 1;

    -- 4. 신임 대표자(대상 직원) 조회 및 유효성 검증
    SELECT
      role::text,
      is_active,
      user_id
    INTO
      v_target_role,
      v_target_is_active,
      v_target_user_id
    FROM core.organization_members
    WHERE id = p_new_owner_member_id
      AND organization_id = v_tenant_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION '소유권을 이전할 대상 직원을 찾을 수 없습니다.' USING ERRCODE = 'P0002';
    END IF;

    IF NOT v_target_is_active THEN
        RAISE EXCEPTION '비활성화된 직원에게는 소유권을 이전할 수 없습니다.' USING ERRCODE = '42501';
    END IF;

    IF v_target_role = 'owner' THEN
        RAISE EXCEPTION '대상 직원은 이미 대표 사업자입니다.' USING ERRCODE = '42501';
    END IF;

    -- 5. 소유권 이전 트랜잭션 로컬 플래그 활성화 (트리거 가드 일시 통과)
    PERFORM set_config('moa.transfer_ownership_in_progress', 'true', true);

    -- 6. 신임 대표자 승격: role = 'owner', 직급 초기화, token_version + 1
    UPDATE core.organization_members
    SET role = 'owner',
        organization_role_id = NULL,
        custom_role_id = NULL,
        token_version = token_version + 1,
        updated_at = now()
    WHERE id = p_new_owner_member_id
      AND organization_id = v_tenant_id;

    -- 7. 전임 대표자 강등: role = 'member', token_version + 1 (이전 세션 즉시 만료)
    IF v_current_owner_member_id IS NOT NULL AND v_current_owner_member_id != p_new_owner_member_id THEN
      UPDATE core.organization_members
      SET role = 'member',
          organization_role_id = NULL,
          custom_role_id = NULL,
          token_version = token_version + 1,
          updated_at = now()
      WHERE id = v_current_owner_member_id
        AND organization_id = v_tenant_id;
    END IF;

    -- 8. 불변 감사 로그 적재
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
        CASE WHEN v_is_owner THEN 'OWNERSHIP_TRANSFERRED' ELSE 'OWNERSHIP_TRANSFERRED_BY_HR' END,
        'organization',
        v_tenant_id::text,
        jsonb_build_object(
            'actor_user_id', auth.uid(),
            'is_delegated_by_hr', NOT v_is_owner,
            'previous_owner_member_id', v_current_owner_member_id,
            'previous_owner_user_id', v_current_owner_user_id,
            'new_owner_member_id', p_new_owner_member_id,
            'new_owner_user_id', v_target_user_id,
            'reason', COALESCE(p_reason, ''),
            'transferred_at', now()
        )
    );
END;
$$;

COMMIT;
