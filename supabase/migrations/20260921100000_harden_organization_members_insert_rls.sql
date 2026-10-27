-- Harden organization_members INSERT RLS:
-- 일반 사용자가 user_id = auth.uid() 만으로 임의 조직에
-- owner/admin/manager 등 역할을 self-INSERT 하는 경로를 제거한다.
--
-- 정상 흐름은 유지:
--   - core.create_organization(...) SECURITY DEFINER → 최초 owner 멤버십
--   - invite/connect/approve_* SECURITY DEFINER RPC → 초대·승인 멤버십
--   - 기존 owner/admin의 직접 INSERT (is_org_owner_or_admin)

BEGIN;

DROP POLICY IF EXISTS organization_members_insert ON core.organization_members;

CREATE POLICY organization_members_insert ON core.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_owner_or_admin(organization_id));

COMMENT ON POLICY organization_members_insert ON core.organization_members IS
  '멤버십 INSERT는 해당 org의 owner/admin만 허용. 자기 자신 임의 추가 금지. 최초 owner·초대는 SECURITY DEFINER RPC.';

COMMIT;
