-- 학부모 자녀 프로필: 성별·학교·학년, 수정 RPC, 승인 시 원생 복사

ALTER TABLE core.students
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS school TEXT,
  ADD COLUMN IF NOT EXISTS grade TEXT;

DROP FUNCTION IF EXISTS core.parent_register_child(TEXT, DATE, core.guardian_relationship, BOOLEAN);

CREATE OR REPLACE FUNCTION core.parent_register_child(
  p_display_name TEXT,
  p_birth_date DATE DEFAULT NULL,
  p_relationship core.guardian_relationship DEFAULT 'other',
  p_is_primary BOOLEAN DEFAULT true,
  p_gender TEXT DEFAULT NULL,
  p_school TEXT DEFAULT NULL,
  p_grade TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_parent_id UUID;
  v_name TEXT;
  v_student_id UUID;
  v_gender TEXT;
  v_school TEXT;
  v_grade TEXT;
  v_existing RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_name := trim(p_display_name);
  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'Child name is required';
  END IF;

  v_gender := NULLIF(trim(COALESCE(p_gender, '')), '');
  v_school := NULLIF(trim(COALESCE(p_school, '')), '');
  v_grade := NULLIF(trim(COALESCE(p_grade, '')), '');

  v_parent_id := core.ensure_global_parent_profile();
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Could not create parent profile';
  END IF;

  SELECT s.id, s.display_name, s.birth_date, s.gender, s.school, s.grade
  INTO v_existing
  FROM core.students s
  JOIN core.parent_student_guardians psg ON psg.student_id = s.id
  WHERE psg.parent_id = v_parent_id
    AND lower(trim(s.display_name)) = lower(v_name)
    AND s.birth_date IS NOT DISTINCT FROM p_birth_date
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'existing',
      'student_id', v_existing.id,
      'display_name', v_existing.display_name,
      'birth_date', v_existing.birth_date,
      'gender', v_existing.gender,
      'school', v_existing.school,
      'grade', v_existing.grade
    );
  END IF;

  INSERT INTO core.students (display_name, birth_date, gender, school, grade)
  VALUES (v_name, p_birth_date, v_gender, v_school, v_grade)
  RETURNING id INTO v_student_id;

  IF p_is_primary THEN
    UPDATE core.parent_student_guardians
    SET is_primary = false, updated_at = now()
    WHERE parent_id = v_parent_id AND is_primary = true;
  END IF;

  INSERT INTO core.parent_student_guardians (
    parent_id, student_id, relationship, is_primary
  )
  VALUES (v_parent_id, v_student_id, p_relationship, COALESCE(p_is_primary, false))
  ON CONFLICT (parent_id, student_id) DO UPDATE SET
    relationship = EXCLUDED.relationship,
    is_primary = EXCLUDED.is_primary,
    updated_at = now();

  RETURN jsonb_build_object(
    'status', 'created',
    'student_id', v_student_id,
    'display_name', v_name,
    'birth_date', p_birth_date,
    'gender', v_gender,
    'school', v_school,
    'grade', v_grade
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.parent_register_child(
  TEXT, DATE, core.guardian_relationship, BOOLEAN, TEXT, TEXT, TEXT
) TO authenticated;

CREATE OR REPLACE FUNCTION core.parent_update_child(
  p_student_id UUID,
  p_display_name TEXT,
  p_birth_date DATE DEFAULT NULL,
  p_relationship core.guardian_relationship DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_school TEXT DEFAULT NULL,
  p_grade TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_parent_id UUID;
  v_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_parent_id := core.get_my_parent_id();
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Parent profile not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM core.parent_student_guardians
    WHERE parent_id = v_parent_id AND student_id = p_student_id
  ) THEN
    RAISE EXCEPTION 'Child not found';
  END IF;

  v_name := trim(p_display_name);
  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'Child name is required';
  END IF;

  UPDATE core.students
  SET
    display_name = v_name,
    birth_date = p_birth_date,
    gender = NULLIF(trim(COALESCE(p_gender, '')), ''),
    school = NULLIF(trim(COALESCE(p_school, '')), ''),
    grade = NULLIF(trim(COALESCE(p_grade, '')), ''),
    updated_at = now()
  WHERE id = p_student_id;

  IF p_relationship IS NOT NULL THEN
    UPDATE core.parent_student_guardians
    SET relationship = p_relationship, updated_at = now()
    WHERE parent_id = v_parent_id AND student_id = p_student_id;
  END IF;

  RETURN jsonb_build_object('status', 'updated', 'student_id', p_student_id);
END;
$$;

GRANT EXECUTE ON FUNCTION core.parent_update_child(
  UUID, TEXT, DATE, core.guardian_relationship, TEXT, TEXT, TEXT
) TO authenticated;

CREATE OR REPLACE FUNCTION core.get_my_parent_portal_tree()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
DECLARE
  v_parent_id UUID;
  v_result JSONB;
BEGIN
  v_parent_id := core.get_my_parent_id();
  IF v_parent_id IS NULL THEN
    RETURN jsonb_build_object(
      'parent', null,
      'children', '[]'::JSONB,
      'enrollment_requests', '[]'::JSONB
    );
  END IF;

  SELECT jsonb_build_object(
    'parent', jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'phone', p.phone,
      'email', p.email
    ),
    'children', COALESCE((
      SELECT jsonb_agg(child ORDER BY (child->>'display_name'))
      FROM (
        SELECT jsonb_build_object(
          'student_id', s.id,
          'display_name', s.display_name,
          'birth_date', s.birth_date,
          'gender', s.gender,
          'school', s.school,
          'grade', s.grade,
          'relationship', psg.relationship,
          'is_primary', psg.is_primary,
          'enrollments', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'enrollment_id', se.id,
                'organization_id', se.organization_id,
                'organization_name', o.name,
                'industry_type', o.industry_type,
                'customer_id', se.customer_id,
                'status', se.status,
                'enrolled_at', se.enrolled_at,
                'left_at', se.left_at,
                'check_in_pin_set', (c.check_in_pin_hash IS NOT NULL)
              ) ORDER BY se.status = 'active' DESC, se.enrolled_at DESC
            )
            FROM core.student_enrollments se
            JOIN core.organizations o ON o.id = se.organization_id
            JOIN core.customers c ON c.id = se.customer_id
            WHERE se.student_id = s.id
          ), '[]'::JSONB)
        ) AS child
        FROM core.parent_student_guardians psg
        JOIN core.students s ON s.id = psg.student_id
        WHERE psg.parent_id = v_parent_id
      ) sub
    ), '[]'::JSONB),
    'enrollment_requests', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', ger.id,
          'student_id', ger.student_id,
          'student_name', s.display_name,
          'organization_id', ger.organization_id,
          'organization_name', o.name,
          'industry_type', o.industry_type,
          'status', ger.status,
          'requested_at', ger.requested_at,
          'reviewed_at', ger.reviewed_at,
          'rejection_reason', ger.rejection_reason
        ) ORDER BY ger.requested_at DESC
      )
      FROM core.guardian_enrollment_requests ger
      JOIN core.students s ON s.id = ger.student_id
      JOIN core.organizations o ON o.id = ger.organization_id
      WHERE ger.parent_id = v_parent_id
    ), '[]'::JSONB)
  ) INTO v_result
  FROM core.parents p
  WHERE p.id = v_parent_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION core.get_my_parent_portal_tree() TO authenticated;

CREATE OR REPLACE FUNCTION core.approve_guardian_enrollment(
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, piano
AS $$
DECLARE
  v_request RECORD;
  v_parent RECORD;
  v_student RECORD;
  v_customer_id UUID;
  v_parent_customer_id UUID;
  v_enrollment_id UUID;
  v_org_name TEXT;
  v_industry TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_request
  FROM core.guardian_enrollment_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment request not found';
  END IF;

  IF NOT core.is_org_admin(v_request.organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Request is not pending (status: %)', v_request.status;
  END IF;

  IF EXISTS (
    SELECT 1 FROM core.student_enrollments
    WHERE student_id = v_request.student_id
      AND organization_id = v_request.organization_id
      AND status IN ('active', 'leave')
  ) THEN
    RAISE EXCEPTION 'Child is already enrolled';
  END IF;

  SELECT * INTO v_parent FROM core.parents WHERE id = v_request.parent_id;
  SELECT * INTO v_student FROM core.students WHERE id = v_request.student_id;
  SELECT name, industry_type::TEXT INTO v_org_name, v_industry
  FROM core.organizations WHERE id = v_request.organization_id;

  INSERT INTO core.customers (
    organization_id,
    name,
    phone,
    email,
    status,
    metadata,
    user_id
  )
  VALUES (
    v_request.organization_id,
    v_student.display_name,
    NULL,
    NULL,
    'active',
    jsonb_build_object(
      'birthDate', v_student.birth_date,
      'gender', v_student.gender,
      'school', v_student.school,
      'grade', v_student.grade,
      'enrolledViaGuardianRequest', true,
      'guardianRequestId', v_request.id
    ),
    NULL
  )
  RETURNING id INTO v_customer_id;

  IF v_industry = 'piano' THEN
    INSERT INTO piano.customers (
      customer_id,
      organization_id,
      student_number,
      gender,
      birth_date,
      school,
      grade,
      join_date
    )
    VALUES (
      v_customer_id,
      v_request.organization_id,
      '',
      COALESCE(NULLIF(trim(COALESCE(v_student.gender, '')), ''), ''),
      v_student.birth_date,
      v_student.school,
      v_student.grade,
      CURRENT_DATE
    )
    ON CONFLICT (customer_id) DO UPDATE SET
      gender = EXCLUDED.gender,
      birth_date = EXCLUDED.birth_date,
      school = EXCLUDED.school,
      grade = EXCLUDED.grade,
      updated_at = now();
  END IF;

  INSERT INTO core.student_enrollments (
    student_id,
    organization_id,
    customer_id,
    status,
    enrolled_at
  )
  VALUES (
    v_request.student_id,
    v_request.organization_id,
    v_customer_id,
    'active',
    CURRENT_DATE
  )
  RETURNING id INTO v_enrollment_id;

  v_parent_customer_id := core.ensure_org_parent_customer(
    v_request.parent_id,
    v_request.organization_id
  );

  IF v_parent_customer_id IS NOT NULL AND v_customer_id IS NOT NULL THEN
    INSERT INTO core.parent_student_links (
      organization_id,
      parent_customer_id,
      student_customer_id,
      relationship,
      is_primary
    )
    SELECT
      v_request.organization_id,
      v_parent_customer_id,
      v_customer_id,
      psg.relationship,
      psg.is_primary
    FROM core.parent_student_guardians psg
    WHERE psg.parent_id = v_request.parent_id
      AND psg.student_id = v_request.student_id
    ON CONFLICT (organization_id, parent_customer_id, student_customer_id) DO UPDATE SET
      relationship = EXCLUDED.relationship,
      is_primary = EXCLUDED.is_primary,
      updated_at = now();
  END IF;

  UPDATE core.guardian_enrollment_requests
  SET
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'enrollment_id', v_enrollment_id,
    'customer_id', v_customer_id,
    'student_name', v_student.display_name,
    'organization_name', v_org_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.approve_guardian_enrollment(UUID) TO authenticated;
