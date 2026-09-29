-- Parent ↔ org connect: public_code on memberships + enrollment unlink (leave≠delete)

-- ---------------------------------------------------------------------------
-- get_user_memberships: include organization_public_code for settings UI
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS core.get_user_memberships();

CREATE OR REPLACE FUNCTION core.get_user_memberships()
RETURNS TABLE (
  membership_id UUID,
  organization_id UUID,
  organization_name TEXT,
  organization_industry_type TEXT,
  organization_slug TEXT,
  organization_settings JSONB,
  organization_is_active BOOLEAN,
  organization_public_code TEXT,
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.active_membership_id
  INTO v_active_membership_id
  FROM core.profiles p
  WHERE p.id = auth.uid();

  RETURN QUERY
  SELECT
    om.id AS membership_id,
    om.organization_id,
    o.name AS organization_name,
    o.industry_type AS organization_industry_type,
    o.slug AS organization_slug,
    o.settings AS organization_settings,
    o.is_active AS organization_is_active,
    o.public_code::text AS organization_public_code,
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
    (om.id = v_active_membership_id) DESC,
    om.joined_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION core.get_user_memberships() TO authenticated;
REVOKE EXECUTE ON FUNCTION core.get_user_memberships() FROM anon;

-- ---------------------------------------------------------------------------
-- Parent: unlink from an enrollment (status → withdrawn, keep guardianship & history)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.unlink_parent_enrollment(p_enrollment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_parent_id UUID;
  v_enrollment RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_parent_id := core.get_my_parent_id();
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Parent profile not found';
  END IF;

  SELECT se.*, o.name AS organization_name, s.display_name AS student_name
  INTO v_enrollment
  FROM core.student_enrollments se
  JOIN core.organizations o ON o.id = se.organization_id
  JOIN core.students s ON s.id = se.student_id
  WHERE se.id = p_enrollment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM core.parent_student_guardians psg
    WHERE psg.parent_id = v_parent_id
      AND psg.student_id = v_enrollment.student_id
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF v_enrollment.status IN ('withdrawn', 'alumni') THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_unlinked', true,
      'enrollment_id', v_enrollment.id,
      'organization_name', v_enrollment.organization_name,
      'student_name', v_enrollment.student_name,
      'status', v_enrollment.status
    );
  END IF;

  -- 이력 보존: 행 삭제 금지. CRM customer status는 건드리지 않음.
  UPDATE core.student_enrollments
  SET status = 'withdrawn',
      left_at = COALESCE(left_at, CURRENT_DATE),
      updated_at = now()
  WHERE id = p_enrollment_id;

  RETURN jsonb_build_object(
    'success', true,
    'enrollment_id', p_enrollment_id,
    'organization_name', v_enrollment.organization_name,
    'student_name', v_enrollment.student_name,
    'status', 'withdrawn'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.unlink_parent_enrollment(UUID) TO authenticated;
REVOKE ALL ON FUNCTION core.unlink_parent_enrollment(UUID) FROM anon;

-- ---------------------------------------------------------------------------
-- Staff: same unlink for an enrollment in their org (admin)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.staff_unlink_parent_enrollment(
  p_org_id UUID,
  p_enrollment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_enrollment RECORD;
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT se.*, o.name AS organization_name, s.display_name AS student_name
  INTO v_enrollment
  FROM core.student_enrollments se
  JOIN core.organizations o ON o.id = se.organization_id
  JOIN core.students s ON s.id = se.student_id
  WHERE se.id = p_enrollment_id
    AND se.organization_id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment not found';
  END IF;

  IF v_enrollment.status IN ('withdrawn', 'alumni') THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_unlinked', true,
      'enrollment_id', v_enrollment.id,
      'status', v_enrollment.status
    );
  END IF;

  UPDATE core.student_enrollments
  SET status = 'withdrawn',
      left_at = COALESCE(left_at, CURRENT_DATE),
      updated_at = now()
  WHERE id = p_enrollment_id
    AND organization_id = p_org_id;

  RETURN jsonb_build_object(
    'success', true,
    'enrollment_id', p_enrollment_id,
    'organization_name', v_enrollment.organization_name,
    'student_name', v_enrollment.student_name,
    'status', 'withdrawn'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.staff_unlink_parent_enrollment(UUID, UUID) TO authenticated;
REVOKE ALL ON FUNCTION core.staff_unlink_parent_enrollment(UUID, UUID) FROM anon;

-- ---------------------------------------------------------------------------
-- Redeem: re-activate leave/withdrawn enrollment (based on latest reverse-sync version)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.redeem_guardian_link_token(
  p_token TEXT,
  p_shared_fields JSONB DEFAULT '["display_name","birth_date"]'::JSONB
)
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
  v_parent_customer_id UUID;
  v_relationship core.guardian_relationship := 'other';
  v_is_primary BOOLEAN := false;
  v_student_customer_id UUID;
  v_merged INT;
  v_links_synced INT;
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

  v_student_customer_id := NULLIF(v_row.metadata->>'customer_id', '')::UUID;
  v_parent_customer_id := NULLIF(v_row.metadata->>'parent_customer_id', '')::UUID;

  IF v_parent_customer_id IS NOT NULL THEN
    IF v_parent_id <> v_parent_customer_id THEN
      UPDATE core.parents
      SET user_id = NULL, updated_at = now()
      WHERE id = v_parent_id AND user_id = auth.uid();
    END IF;

    UPDATE core.customers
    SET user_id = auth.uid(), updated_at = now()
    WHERE id = v_parent_customer_id AND organization_id = v_row.organization_id;

    INSERT INTO core.parents (id, user_id, name, phone, email)
    SELECT c.id, auth.uid(), c.name, c.phone, c.email
    FROM core.customers c
    WHERE c.id = v_parent_customer_id
    ON CONFLICT (id) DO UPDATE SET
      user_id = auth.uid(),
      name = COALESCE(EXCLUDED.name, core.parents.name),
      phone = COALESCE(EXCLUDED.phone, core.parents.phone),
      email = COALESCE(EXCLUDED.email, core.parents.email),
      updated_at = now();

    IF v_parent_id <> v_parent_customer_id THEN
      UPDATE core.parent_student_guardians
      SET parent_id = v_parent_customer_id, updated_at = now()
      WHERE parent_id = v_parent_id;

      DELETE FROM core.parents p
      WHERE p.id = v_parent_id
        AND NOT EXISTS (
          SELECT 1 FROM core.parent_student_guardians psg WHERE psg.parent_id = p.id
        );

      v_parent_id := v_parent_customer_id;
    END IF;
  END IF;

  v_parent_customer_id := core.ensure_org_parent_customer(v_parent_id, v_row.organization_id);

  IF v_student_customer_id IS NOT NULL AND v_parent_customer_id IS NOT NULL THEN
    SELECT psl.relationship, psl.is_primary
    INTO v_relationship, v_is_primary
    FROM core.parent_student_links psl
    WHERE psl.organization_id = v_row.organization_id
      AND psl.parent_customer_id = v_parent_customer_id
      AND psl.student_customer_id = v_student_customer_id
    LIMIT 1;
  END IF;

  IF v_is_primary THEN
    UPDATE core.parent_student_guardians
    SET is_primary = false, updated_at = now()
    WHERE parent_id = v_parent_id AND is_primary = true;
  END IF;

  INSERT INTO core.parent_student_guardians (parent_id, student_id, relationship, is_primary)
  VALUES (v_parent_id, v_row.student_id, COALESCE(v_relationship, 'other'), COALESCE(v_is_primary, false))
  ON CONFLICT (parent_id, student_id) DO UPDATE SET
    relationship = COALESCE(EXCLUDED.relationship, core.parent_student_guardians.relationship),
    is_primary = EXCLUDED.is_primary OR core.parent_student_guardians.is_primary,
    updated_at = now();

  v_merged := core.merge_parent_created_student_if_duplicate(v_parent_id, v_row.student_id);

  INSERT INTO core.academy_data_sharing_consents (
    parent_id, student_id, organization_id, shared_fields
  )
  VALUES (
    v_parent_id,
    v_row.student_id,
    v_row.organization_id,
    COALESCE(p_shared_fields, '["display_name","birth_date"]'::JSONB)
  )
  ON CONFLICT (parent_id, student_id, organization_id) DO UPDATE SET
    shared_fields = EXCLUDED.shared_fields,
    consented_at = now();

  -- 연결 해제된 enrollment 재활성화 (행·이력 유지)
  IF v_row.enrollment_id IS NOT NULL THEN
    UPDATE core.student_enrollments
    SET status = 'active',
        left_at = NULL,
        updated_at = now()
    WHERE id = v_row.enrollment_id
      AND status IN ('leave', 'withdrawn');
  END IF;

  UPDATE core.guardian_link_tokens
  SET used_count = used_count + 1
  WHERE id = v_row.id;

  v_links_synced := core.sync_parent_student_links_for_parent_org(v_parent_id, v_row.organization_id);

  RETURN jsonb_build_object(
    'success', true,
    'student_name', v_row.student_name,
    'organization_name', v_row.org_name,
    'organization_id', v_row.organization_id,
    'student_id', v_row.student_id,
    'merged_duplicates', v_merged,
    'links_synced', v_links_synced
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.redeem_guardian_link_token(TEXT, JSONB) TO authenticated;
REVOKE ALL ON FUNCTION core.redeem_guardian_link_token(TEXT, JSONB) FROM anon;
