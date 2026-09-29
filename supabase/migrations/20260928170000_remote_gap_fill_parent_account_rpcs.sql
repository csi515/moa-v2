-- =============================================================================
-- 원격 갭 채우기: 학부모 계정 상태/초대 취소 RPC + parent_invitations 이메일 인덱스
--
-- 원격 DB 는 20260822150000_parent_portal_and_education 의 다른 변형이 적용되어
-- 아래 객체가 없다 (앱: src/core/parent/services/parentAccountService.ts 가 호출).
-- 20260822150000 은 재실행 불가(CREATE TABLE, IF NOT EXISTS 없음)하므로
-- 해당 파일의 정의를 그대로 옮겨 온다.
--
-- 멱등: CREATE INDEX IF NOT EXISTS / CREATE OR REPLACE / REVOKE·GRANT.
-- 새 로컬 replay 에서는 20260822150000 과 동일 본문을 다시 쓰므로 본문 변화 없음.
-- 단, 원본은 PUBLIC EXECUTE 가 남아 있었으므로 여기서 PUBLIC/anon 을 회수하고 authenticated 만 허용
-- (두 함수 모두 auth.uid() 필수라 anon 호출은 원래도 실패).
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_parent_invitations_email ON core.parent_invitations (lower(email), status);

CREATE OR REPLACE FUNCTION core.revoke_parent_invitation(p_org_id UUID, p_parent_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  UPDATE core.parent_invitations SET status = 'revoked'
  WHERE organization_id = p_org_id AND parent_customer_id = p_parent_customer_id AND status = 'pending';
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION core.get_parent_account_statuses(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER STABLE
SET search_path = core, public
AS $$
DECLARE v_result JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(t)::JSONB), '[]'::JSONB) INTO v_result
  FROM (
    SELECT c.id AS parent_customer_id,
      CASE WHEN c.user_id IS NOT NULL THEN 'connected'
           WHEN pi.status = 'pending' THEN 'invited' ELSE 'none' END AS status,
      c.email, pi.created_at AS invited_at
    FROM core.customers c
    LEFT JOIN core.parent_invitations pi ON pi.parent_customer_id = c.id AND pi.organization_id = c.organization_id AND pi.status = 'pending'
    WHERE c.organization_id = p_org_id AND c.metadata->>'entityType' = 'parent'
  ) t;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION core.revoke_parent_invitation(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION core.get_parent_account_statuses(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.revoke_parent_invitation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.get_parent_account_statuses(UUID) TO authenticated;
