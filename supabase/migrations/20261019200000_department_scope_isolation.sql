-- =============================================================================
-- Moa v2: Department Scope Isolation & Multi-Unit Workplace Partitioning
-- File: 20261019200000_department_scope_isolation.sql
-- 
-- 주요 기능:
-- 1. 부서(Department) 테이블 규격 보강 (code 식별자 추가)
-- 2. organization_members에 department_id 외래키 연결
-- 3. 주요 자원 테이블(schedules, practice_rooms, handover_notes)에 department_id 부여
-- 4. 부서 스코프 격리 RLS 헬퍼 함수 및 정책 보강:
--    - 소상공인/1인 매장: department_id = NULL (전사 단일 스코프 자동 유지, 복잡도 0원)
--    - 기업/제조업: 소속 부서가 지정된 직원은 해당 부서의 자원만 CUD 접근 허용
--    - 대표/관리자 및 부서 미지정자: 전사 자원 관리 권한 유지
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. core.departments 테이블 규격 보강
-- -----------------------------------------------------------------------------
ALTER TABLE core.departments
  ADD COLUMN IF NOT EXISTS code VARCHAR(32);

-- -----------------------------------------------------------------------------
-- 2. core.organization_members 테이블에 department_id 추가
-- -----------------------------------------------------------------------------
ALTER TABLE core.organization_members
  ADD COLUMN IF NOT EXISTS department_id UUID;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_members_department_id_fkey'
  ) THEN
    ALTER TABLE core.organization_members
      ADD CONSTRAINT organization_members_department_id_fkey
      FOREIGN KEY (department_id) REFERENCES core.departments(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_org_members_department
  ON core.organization_members (department_id);

-- -----------------------------------------------------------------------------
-- 3. 주요 자원 테이블에 department_id 추가 (스케줄, 연습실/회의실, 인수인계장)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  -- 3.1 schedules
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'core' AND tablename = 'schedules') THEN
    ALTER TABLE core.schedules ADD COLUMN IF NOT EXISTS department_id UUID;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedules_department_id_fkey') THEN
      ALTER TABLE core.schedules
        ADD CONSTRAINT schedules_department_id_fkey
        FOREIGN KEY (department_id) REFERENCES core.departments(id) ON DELETE SET NULL;
    END IF;
    CREATE INDEX IF NOT EXISTS idx_schedules_department ON core.schedules (department_id);
  END IF;

  -- 3.2 practice_rooms
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'core' AND tablename = 'practice_rooms') THEN
    ALTER TABLE core.practice_rooms ADD COLUMN IF NOT EXISTS department_id UUID;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'practice_rooms_department_id_fkey') THEN
      ALTER TABLE core.practice_rooms
        ADD CONSTRAINT practice_rooms_department_id_fkey
        FOREIGN KEY (department_id) REFERENCES core.departments(id) ON DELETE SET NULL;
    END IF;
    CREATE INDEX IF NOT EXISTS idx_practice_rooms_department ON core.practice_rooms (department_id);
  END IF;

  -- 3.3 handover_notes
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'core' AND tablename = 'handover_notes') THEN
    ALTER TABLE core.handover_notes ADD COLUMN IF NOT EXISTS department_id UUID;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'handover_notes_department_id_fkey') THEN
      ALTER TABLE core.handover_notes
        ADD CONSTRAINT handover_notes_department_id_fkey
        FOREIGN KEY (department_id) REFERENCES core.departments(id) ON DELETE SET NULL;
    END IF;
    CREATE INDEX IF NOT EXISTS idx_handover_notes_department ON core.handover_notes (department_id);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. 부서 스코프 RLS 헬퍼 함수
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.current_member_department_id(p_org_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
  SELECT department_id
  FROM core.organization_members
  WHERE user_id = auth.uid()
    AND organization_id = p_org_id
    AND is_active = true
    AND deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION core.can_access_department_resource(
    p_org_id UUID,
    p_resource_department_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_role VARCHAR(32);
  v_member_dept_id UUID;
BEGIN
  -- 1. 사업주/관리자는 전사 모든 부서 자원에 무제한 접근 가능
  IF core.is_org_owner_or_admin(p_org_id) THEN
    RETURN true;
  END IF;

  -- 2. 호출자의 멤버십 및 부서 조회
  SELECT role::text, department_id
  INTO v_role, v_member_dept_id
  FROM core.organization_members
  WHERE user_id = auth.uid()
    AND organization_id = p_org_id
    AND is_active = true
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  -- 3. 사용자의 소속 부서가 NULL인 경우 (전사 직원/소상공인 매장) -> 전사 자원 접근 허용
  IF v_member_dept_id IS NULL THEN
    RETURN true;
  END IF;

  -- 4. 자원에 부서가 지정되지 않았거나(공용 자원), 소속 부서와 일치하는 경우 허용
  IF p_resource_department_id IS NULL OR p_resource_department_id = v_member_dept_id THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION core.current_member_department_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.can_access_department_resource(UUID, UUID) TO authenticated;

COMMIT;
