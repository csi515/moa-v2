-- 학부모 본인 연락처만 갱신한다. 승인 카드의 보호자 번호로 쓰인다.

CREATE OR REPLACE FUNCTION core.update_my_parent_phone(
  p_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_parent_id UUID;
  v_phone TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_parent_id := core.ensure_global_parent_profile();
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Could not create parent profile';
  END IF;

  v_phone := NULLIF(trim(COALESCE(p_phone, '')), '');

  UPDATE core.parents
  SET phone = v_phone, updated_at = now()
  WHERE id = v_parent_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN jsonb_build_object(
    'parent_id', v_parent_id,
    'phone', v_phone
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.update_my_parent_phone(TEXT) TO authenticated;
REVOKE ALL ON FUNCTION core.update_my_parent_phone(TEXT) FROM anon;
