-- RPC: delete_organization
-- 조직 소유자만 조직을 안전하게 삭제할 수 있음
-- CASCADE를 통해 관련 데이터 모두 삭제 (organization ON DELETE CASCADE 설정 활용)

CREATE OR REPLACE FUNCTION core.delete_organization(
  p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_caller_role core.member_role;
BEGIN
  -- 인증 확인
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 호출자가 해당 조직의 멤버인지, 역할이 무엇인지 확인
  SELECT role INTO v_caller_role
  FROM core.organization_members
  WHERE organization_id = p_organization_id
    AND user_id = auth.uid()
    AND is_active = true;

  -- 멤버가 아니거나 owner가 아니면 삭제 권한 없음
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this organization';
  END IF;

  IF v_caller_role <> 'owner' THEN
    RAISE EXCEPTION 'Only organization owners can delete organizations';
  END IF;

  -- 조직 삭제 (CASCADE를 통해 관련 테이블의 데이터 자동 삭제)
  DELETE FROM core.organizations
  WHERE id = p_organization_id;

  RETURN true;
END;
$$;

-- authenticated 사용자에게만 실행 권한 부여
GRANT EXECUTE ON FUNCTION core.delete_organization(UUID) TO authenticated;

-- anon은 실행 불가 (보안)
REVOKE EXECUTE ON FUNCTION core.delete_organization(UUID) FROM anon;

COMMENT ON FUNCTION core.delete_organization IS '조직 소유자만 조직 및 관련 데이터를 완전히 삭제할 수 있음. 되돌릴 수 없는 작업.';
