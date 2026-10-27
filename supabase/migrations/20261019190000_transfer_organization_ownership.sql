-- =============================================================================
-- Moa v2: Organization Ownership Transfer & Immediate Session Revocation
-- File: 20261019190000_transfer_organization_ownership.sql
-- 
-- 주요 기능:
-- 1. CEO 대표자 소유권 이전 원자적 보안 RPC (core.transfer_organization_ownership)
--    - 호출자가 현재 테넌트의 유효한 대표 사업자(role = 'owner')인지 검증 (미충족 시 42501 예외)
--    - 신임 대표자(p_new_owner_member_id) 유효성 검증 및 role = 'owner' 승격
--    - 전임 대표자(호출자) role = 'member' 전환
--    - 양측 모두 token_version + 1 처리하여 기존 발급 JWT 세션 즉시 파기 (Instant Revocation)
--    - 불변 감사 로그(core.audit_logs)에 'OWNERSHIP_TRANSFERRED' 이벤트 및 사유 적재
-- 2. role 변경 방어 트리거 보강:
--    - 트랜잭션 로컬 플래그(moa.transfer_ownership_in_progress)를 확인하여 소유권 이전 시 대표자 전환 허용
-- 3. public schema RPC 래퍼 및 권한 부여
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. role 변경 방어 트리거 보강 (소유권 이전 트랜잭션 허용 플래그 지원)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.prevent_unauthorized_member_role_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_in_transfer TEXT;
BEGIN
  -- 소유권 이전 RPC 트랜잭션 내부인지 확인
  BEGIN
    v_in_transfer := current_setting('moa.transfer_ownership_in_progress', true);
  EXCEPTION WHEN OTHERS THEN
    v_in_transfer := 'false';
  END;

  -- role, organization_role_id, custom_role_id가 변경되는 경우
  IF (OLD.role IS DISTINCT FROM NEW.role)
     OR (OLD.organization_role_id IS DISTINCT FROM NEW.organization_role_id)
     OR (OLD.custom_role_id IS DISTINCT FROM NEW.custom_role_id) THEN

    -- 소유권 이전 프로세스가 아닌 일반적인 UPDATE에서 대표자 박탈/수정 시도 시 차단
    IF v_in_transfer IS DISTINCT FROM 'true' THEN
      IF OLD.role = 'owner' AND (NEW.role IS DISTINCT FROM 'owner' OR NEW.organization_role_id IS NOT NULL) THEN
        RAISE EXCEPTION '대표 사업자의 권한은 수정하거나 회수할 수 없습니다.' USING ERRCODE = '42501';
      END IF;
    END IF;

    -- 직급/역할 변경 시 token_version 자동 증가 (세션 즉시 파기)
    IF (OLD.role IS DISTINCT FROM NEW.role)
       OR (OLD.organization_role_id IS DISTINCT FROM NEW.organization_role_id)
       OR (OLD.custom_role_id IS DISTINCT FROM NEW.custom_role_id) THEN
      NEW.token_version := COALESCE(OLD.token_version, 1) + 1;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. CEO 대표자 소유권 원자적 이전 RPC: core.transfer_organization_ownership
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
    v_target_role VARCHAR(32);
    v_target_is_active BOOLEAN;
    v_target_user_id UUID;
BEGIN
    -- 1. 호출자의 소속 테넌트 및 role 조회
    SELECT
      m.organization_id,
      m.id,
      m.role::text
    INTO
      v_tenant_id,
      v_caller_member_id,
      v_caller_role
    FROM core.organization_members m
    WHERE m.user_id = auth.uid()
      AND m.is_active = true
      AND m.deleted_at IS NULL
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION '호출자의 멤버십 정보를 찾을 수 없습니다.' USING ERRCODE = '42501';
    END IF;

    -- 2. 호출자가 유효한 대표 사업자(owner)인지 검증 (미충족 시 42501 예외)
    IF v_caller_role != 'owner' THEN
        RAISE EXCEPTION '권한이 없습니다: 대표 사업자(owner)만 소유권을 이전할 수 있습니다.' USING ERRCODE = '42501';
    END IF;

    -- 3. 신임 대표자(대상 직원) 조회 및 검증
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

    IF v_caller_member_id = p_new_owner_member_id THEN
        RAISE EXCEPTION '본인에게는 소유권을 이전할 수 없습니다.' USING ERRCODE = '42501';
    END IF;

    IF v_target_role = 'owner' THEN
        RAISE EXCEPTION '대상 직원은 이미 대표 사업자입니다.' USING ERRCODE = '42501';
    END IF;

    -- 4. 소유권 이전 트랜잭션 플래그 활성화 (트리거 가드 일시 통과)
    PERFORM set_config('moa.transfer_ownership_in_progress', 'true', true);

    -- 5. 신임 대표자 승격: role = 'owner', 직급/커스텀 직급 초기화, token_version + 1
    UPDATE core.organization_members
    SET role = 'owner',
        organization_role_id = NULL,
        custom_role_id = NULL,
        token_version = token_version + 1,
        updated_at = now()
    WHERE id = p_new_owner_member_id
      AND organization_id = v_tenant_id;

    -- 6. 전임 대표자(호출자) 강등: role = 'member', token_version + 1 (이전 세션 즉시 만료)
    UPDATE core.organization_members
    SET role = 'member',
        organization_role_id = NULL,
        custom_role_id = NULL,
        token_version = token_version + 1,
        updated_at = now()
    WHERE id = v_caller_member_id
      AND organization_id = v_tenant_id;

    -- 7. 불변 감사 로그 적재
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
        'OWNERSHIP_TRANSFERRED',
        'organization',
        v_tenant_id::text,
        jsonb_build_object(
            'previous_owner_member_id', v_caller_member_id,
            'previous_owner_user_id', auth.uid(),
            'new_owner_member_id', p_new_owner_member_id,
            'new_owner_user_id', v_target_user_id,
            'reason', COALESCE(p_reason, ''),
            'transferred_at', now()
        )
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. public schema RPC 래퍼 등록 및 권한 부여
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_organization_ownership(
    p_new_owner_member_id UUID,
    p_reason TEXT DEFAULT ''
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
BEGIN
    PERFORM core.transfer_organization_ownership(p_new_owner_member_id, p_reason);
END;
$$;

GRANT EXECUTE ON FUNCTION core.transfer_organization_ownership(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_organization_ownership(UUID, TEXT) TO authenticated;

COMMIT;
