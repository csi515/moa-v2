-- Account self-deletion for App Store / Play Store compliance (Guideline 5.1.1)

CREATE OR REPLACE FUNCTION core.delete_my_account()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_uid UUID;
  v_owner_orgs INT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COUNT(*)::INT INTO v_owner_orgs
  FROM core.organization_members
  WHERE user_id = v_uid
    AND role = 'owner'
    AND is_active = true;

  IF v_owner_orgs > 0 THEN
    RAISE EXCEPTION '원장(owner) 계정은 학원 소유권 이전 또는 학원 삭제 후 탈퇴할 수 있습니다. 고객센터에 문의해 주세요.';
  END IF;

  UPDATE core.staff SET user_id = NULL, updated_at = now() WHERE user_id = v_uid;
  UPDATE core.customers SET user_id = NULL, updated_at = now() WHERE user_id = v_uid;

  UPDATE core.parents SET user_id = NULL, updated_at = now() WHERE user_id = v_uid;

  DELETE FROM core.organization_members WHERE user_id = v_uid;

  DELETE FROM auth.users WHERE id = v_uid;

  RETURN jsonb_build_object('deleted', true, 'user_id', v_uid);
END;
$$;

GRANT EXECUTE ON FUNCTION core.delete_my_account() TO authenticated;
