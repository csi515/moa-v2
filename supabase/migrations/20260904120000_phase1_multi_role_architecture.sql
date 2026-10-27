-- Phase 1: Multi-Role Architecture
-- 1인 N조직 N역할 지원 + 컨텍스트 스위처 기반 마련
-- 
-- Changes:
-- 1. Remove UNIQUE(organization_id, user_id) constraint
-- 2. Add UNIQUE(organization_id, user_id, role) constraint
-- 3. Extend member_role enum with new roles
-- 4. Add active_membership_id to profiles for context persistence
-- 5. Create RPC to fetch all user memberships
-- 6. Update RLS policies to support multiple memberships

BEGIN;

-- ============================================================================
-- 1. Modify organization_members constraints for multi-role support
-- ============================================================================

-- Remove old UNIQUE constraint (1 user → 1 org)
ALTER TABLE core.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_organization_id_user_id_key;

-- Add new UNIQUE constraint (1 user → 1 org → 1 role, but can have multiple roles in same org)
ALTER TABLE core.organization_members
  ADD CONSTRAINT organization_members_org_user_role_unique
  UNIQUE (organization_id, user_id, role);

-- ============================================================================
-- 2. Extend member_role enum
-- ============================================================================

-- Add new role values to support expanded architecture
-- instructor: 강사 (업체에 소속된 강사, staff와 구분)
-- member: 일반 회원 (customer와 유사하지만 OrganizationMembership 기반)
-- customer: 고객 (회원가입한 고객, 자가 예약 등)
-- guardian: 보호자 (기존 parent를 대체할 글로벌 역할)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'instructor' AND enumtypid = 'core.member_role'::regtype) THEN
    ALTER TYPE core.member_role ADD VALUE 'instructor';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'member' AND enumtypid = 'core.member_role'::regtype) THEN
    ALTER TYPE core.member_role ADD VALUE 'member';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'customer' AND enumtypid = 'core.member_role'::regtype) THEN
    ALTER TYPE core.member_role ADD VALUE 'customer';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'guardian' AND enumtypid = 'core.member_role'::regtype) THEN
    ALTER TYPE core.member_role ADD VALUE 'guardian';
  END IF;
END$$;

-- ============================================================================
-- 3. Add active membership tracking to profiles
-- ============================================================================

-- Store the user's currently selected membership context
ALTER TABLE core.profiles
  ADD COLUMN IF NOT EXISTS active_membership_id UUID REFERENCES core.organization_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_active_membership
  ON core.profiles(active_membership_id);

COMMENT ON COLUMN core.profiles.active_membership_id IS 
  '사용자가 현재 활성화한 조직·역할 컨텍스트 (OrganizationMembership ID)';

-- ============================================================================
-- 4. Create RPC to fetch user memberships with active context
-- ============================================================================

CREATE OR REPLACE FUNCTION core.get_user_memberships()
RETURNS TABLE (
  membership_id UUID,
  organization_id UUID,
  organization_name TEXT,
  organization_industry_type TEXT,
  organization_slug TEXT,
  organization_settings JSONB,
  organization_is_active BOOLEAN,
  role core.member_role,
  staff_id UUID,
  parent_customer_id UUID,
  is_active BOOLEAN,
  joined_at TIMESTAMPTZ,
  is_current_context BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
DECLARE
  v_active_membership_id UUID;
BEGIN
  -- 인증 확인
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 현재 활성화된 membership 가져오기
  SELECT p.active_membership_id
  INTO v_active_membership_id
  FROM core.profiles p
  WHERE p.id = auth.uid();

  -- 모든 멤버십 반환
  RETURN QUERY
  SELECT
    om.id AS membership_id,
    om.organization_id,
    o.name AS organization_name,
    o.industry_type AS organization_industry_type,
    o.slug AS organization_slug,
    o.settings AS organization_settings,
    o.is_active AS organization_is_active,
    om.role,
    om.staff_id,
    om.parent_customer_id,
    om.is_active,
    om.joined_at,
    (om.id = v_active_membership_id) AS is_current_context
  FROM core.organization_members om
  INNER JOIN core.organizations o ON o.id = om.organization_id
  WHERE om.user_id = auth.uid()
    AND om.is_active = true
    AND o.is_active = true
  ORDER BY
    (om.id = v_active_membership_id) DESC,  -- Active context first
    om.joined_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION core.get_user_memberships() TO authenticated;
REVOKE EXECUTE ON FUNCTION core.get_user_memberships() FROM anon;

COMMENT ON FUNCTION core.get_user_memberships IS
  '현재 사용자의 모든 조직 멤버십을 조회하고, 활성 컨텍스트를 표시';

-- ============================================================================
-- 5. Create RPC to set active membership context
-- ============================================================================

CREATE OR REPLACE FUNCTION core.set_active_membership(
  p_membership_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_membership_user_id UUID;
BEGIN
  -- 인증 확인
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 멤버십이 현재 사용자의 것인지 확인
  SELECT user_id
  INTO v_membership_user_id
  FROM core.organization_members
  WHERE id = p_membership_id
    AND is_active = true;

  IF v_membership_user_id IS NULL THEN
    RAISE EXCEPTION 'Membership not found or inactive';
  END IF;

  IF v_membership_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only set your own memberships as active';
  END IF;

  -- 활성 멤버십 업데이트
  UPDATE core.profiles
  SET active_membership_id = p_membership_id,
      updated_at = now()
  WHERE id = auth.uid();

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION core.set_active_membership(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION core.set_active_membership(UUID) FROM anon;

COMMENT ON FUNCTION core.set_active_membership IS
  '현재 사용자의 활성 조직·역할 컨텍스트를 설정 (로그아웃 없이 전환)';

-- ============================================================================
-- 6. Create helper function to clear active membership
-- ============================================================================

CREATE OR REPLACE FUNCTION core.clear_active_membership()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  -- 인증 확인
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 활성 멤버십 클리어
  UPDATE core.profiles
  SET active_membership_id = NULL,
      updated_at = now()
  WHERE id = auth.uid();

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION core.clear_active_membership() TO authenticated;
REVOKE EXECUTE ON FUNCTION core.clear_active_membership() FROM anon;

COMMENT ON FUNCTION core.clear_active_membership IS
  '현재 사용자의 활성 컨텍스트를 초기화 (조직 선택 화면으로 돌아갈 때)';

-- ============================================================================
-- 7. Update existing RLS policies to handle multiple memberships
-- ============================================================================

-- RLS policies는 이미 organization_members 테이블의 존재 여부로 체크하므로
-- 다중 멤버십도 자동으로 지원됨. 
-- 다만, 일부 SECURITY DEFINER RPC에서 단일 role을 가정하는 경우가 있을 수 있으므로
-- 해당 함수들은 필요 시 수정 필요.

-- 기존 is_org_member, get_org_role 등의 RPC는 특정 조직에 대한 멤버십 존재 여부를 확인하므로
-- 다중 멤버십 상황에서도 동작함. 
-- 다만, get_org_role은 단일 role을 반환하는데, 1 user가 1 org에 여러 role을 가질 수 있으므로
-- 필요 시 첫 번째 role을 반환하거나, 배열로 반환하도록 수정 가능.
-- Phase 1에서는 기존 동작을 유지하되, 주석으로 알림.

COMMENT ON FUNCTION core.get_org_role IS 
  '(Phase 1 Note) Returns the first role found for the user in the organization. 
   If a user has multiple roles, this returns one of them. 
   Consider using organization context from get_user_memberships() instead.';

COMMIT;
