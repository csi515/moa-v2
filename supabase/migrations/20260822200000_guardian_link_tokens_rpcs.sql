-- Guardian link tokens: invite code / deep link for parent↔student linking
-- Legacy cleanup: deactivate organization_members(role=parent)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================
-- RPC: create invite token (admin)
-- =============================================
CREATE OR REPLACE FUNCTION core.create_guardian_link_token(
  p_org_id UUID,
  p_customer_id UUID,
  p_expires_days INT DEFAULT 7,
  p_max_uses INT DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_enrollment RECORD;
  v_token TEXT;
  v_hash TEXT;
  v_id UUID;
  v_expires TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT se.*, s.display_name AS student_name
  INTO v_enrollment
  FROM core.student_enrollments se
  JOIN core.students s ON s.id = se.student_id
  WHERE se.customer_id = p_customer_id AND se.organization_id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student enrollment not found';
  END IF;

  v_token := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_hash := encode(digest(v_token, 'sha256'), 'hex');
  v_expires := now() + make_interval(days => GREATEST(p_expires_days, 1));

  INSERT INTO core.guardian_link_tokens (
    organization_id, student_id, enrollment_id, token_hash, token_type,
    expires_at, max_uses, created_by, metadata
  )
  VALUES (
    p_org_id, v_enrollment.student_id, v_enrollment.id, v_hash, 'invite_code',
    v_expires, GREATEST(p_max_uses, 1), auth.uid(),
    jsonb_build_object('student_name', v_enrollment.student_name, 'customer_id', p_customer_id)
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'id', v_id,
    'token', v_token,
    'expires_at', v_expires,
    'student_name', v_enrollment.student_name,
    'organization_id', p_org_id
  );
END;
$$;

-- =============================================
-- RPC: list tokens (admin)
-- =============================================
CREATE OR REPLACE FUNCTION core.list_guardian_link_tokens(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(t)::JSONB ORDER BY t.created_at DESC)
    FROM (
      SELECT
        glt.id,
        glt.token_type,
        glt.expires_at,
        glt.max_uses,
        glt.used_count,
        glt.created_at,
        glt.metadata,
        s.display_name AS student_name
      FROM core.guardian_link_tokens glt
      LEFT JOIN core.students s ON s.id = glt.student_id
      WHERE glt.organization_id = p_org_id
        AND (glt.expires_at IS NULL OR glt.expires_at > now())
        AND glt.used_count < glt.max_uses
    ) t
  ), '[]'::JSONB);
END;
$$;

-- =============================================
-- RPC: revoke token (admin)
-- =============================================
CREATE OR REPLACE FUNCTION core.revoke_guardian_link_token(p_org_id UUID, p_token_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE core.guardian_link_tokens
  SET used_count = max_uses, metadata = metadata || '{"revoked":true}'::JSONB
  WHERE id = p_token_id AND organization_id = p_org_id;

  RETURN FOUND;
END;
$$;

-- =============================================
-- RPC: redeem token (authenticated parent)
-- =============================================
CREATE OR REPLACE FUNCTION core.redeem_guardian_link_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_hash TEXT;
  v_row RECORD;
  v_parent_id UUID;
  v_profile RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_hash := encode(digest(upper(trim(p_token)), 'sha256'), 'hex');

  SELECT glt.*, s.display_name AS student_name, o.name AS org_name
  INTO v_row
  FROM core.guardian_link_tokens glt
  JOIN core.students s ON s.id = glt.student_id
  JOIN core.organizations o ON o.id = glt.organization_id
  WHERE glt.token_hash = v_hash
    AND glt.used_count < glt.max_uses
    AND (glt.expires_at IS NULL OR glt.expires_at > now())
  FOR UPDATE OF glt;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired link code';
  END IF;

  v_parent_id := core.ensure_global_parent_profile();
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Could not create parent profile';
  END IF;

  SELECT * INTO v_profile FROM core.profiles WHERE id = auth.uid();

  UPDATE core.parents
  SET name = COALESCE(NULLIF(name, '학부모'), v_profile.full_name, '학부모'),
      email = COALESCE(email, v_profile.email),
      updated_at = now()
  WHERE id = v_parent_id;

  INSERT INTO core.parent_student_guardians (parent_id, student_id, relationship, is_primary)
  VALUES (v_parent_id, v_row.student_id, 'other', false)
  ON CONFLICT (parent_id, student_id) DO NOTHING;

  INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id)
  SELECT v_parent_id, v_row.organization_id, se.customer_id
  FROM core.student_enrollments se
  WHERE se.id = v_row.enrollment_id
  ON CONFLICT (customer_id) DO UPDATE SET parent_id = EXCLUDED.parent_id, updated_at = now();

  UPDATE core.guardian_link_tokens
  SET used_count = used_count + 1
  WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'success', true,
    'student_name', v_row.student_name,
    'organization_name', v_row.org_name,
    'organization_id', v_row.organization_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.create_guardian_link_token(UUID, UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.list_guardian_link_tokens(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.revoke_guardian_link_token(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.redeem_guardian_link_token(TEXT) TO authenticated;

ALTER TABLE core.guardian_link_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guardian_link_tokens_admin ON core.guardian_link_tokens;
CREATE POLICY guardian_link_tokens_admin ON core.guardian_link_tokens
  FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

DROP POLICY IF EXISTS guardian_link_tokens_member_select ON core.guardian_link_tokens;
CREATE POLICY guardian_link_tokens_member_select ON core.guardian_link_tokens
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

-- Legacy: deactivate parent organization_members (portal uses global model)
UPDATE core.organization_members
SET is_active = false, updated_at = now()
WHERE role = 'parent' AND is_active = true;
