-- 가디언 연결 코드는 소비하지 않고 학원명·자녀 이름만 미리 본다.

CREATE OR REPLACE FUNCTION core.preview_guardian_link_token(
  p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_hash TEXT;
  v_org_name TEXT;
  v_student_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NULLIF(trim(COALESCE(p_token, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired link code';
  END IF;

  v_hash := encode(digest(upper(trim(p_token)), 'sha256'), 'hex');

  SELECT
    o.name,
    COALESCE(NULLIF(trim(s.display_name), ''), NULLIF(trim(glt.metadata->>'student_name'), ''))
  INTO v_org_name, v_student_name
  FROM core.guardian_link_tokens glt
  JOIN core.organizations o ON o.id = glt.organization_id
  LEFT JOIN core.students s ON s.id = glt.student_id
  WHERE glt.token_hash = v_hash
    AND glt.used_count < glt.max_uses
    AND (glt.expires_at IS NULL OR glt.expires_at > now());

  IF NOT FOUND OR v_org_name IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired link code';
  END IF;

  RETURN jsonb_build_object(
    'organization_name', v_org_name,
    'student_name', COALESCE(v_student_name, '')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.preview_guardian_link_token(TEXT) TO authenticated;
REVOKE ALL ON FUNCTION core.preview_guardian_link_token(TEXT) FROM anon;
