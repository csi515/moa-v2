-- 학원 승인 화면이 동의된 프로필을 보고, 승인 시 체크된 항목만 복사한다.

DROP FUNCTION IF EXISTS core.get_org_enrollment_requests(UUID, core.enrollment_request_status);

CREATE OR REPLACE FUNCTION core.get_org_enrollment_requests(
  p_org_id UUID,
  p_status core.enrollment_request_status DEFAULT 'pending'
)
RETURNS TABLE (
  id UUID,
  parent_id UUID,
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  student_id UUID,
  student_name TEXT,
  birth_date DATE,
  gender TEXT,
  school TEXT,
  grade TEXT,
  consent_fields JSONB,
  relationship core.guardian_relationship,
  status core.enrollment_request_status,
  requested_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by_name TEXT,
  rejection_reason TEXT,
  notes TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT
    ger.id,
    ger.parent_id,
    p.name AS parent_name,
    p.phone AS parent_phone,
    p.email AS parent_email,
    ger.student_id,
    s.display_name AS student_name,
    s.birth_date,
    s.gender,
    s.school,
    s.grade,
    COALESCE(ger.consent_fields, '[]'::JSONB) AS consent_fields,
    psg.relationship,
    ger.status,
    ger.requested_at,
    ger.reviewed_at,
    prof.full_name AS reviewed_by_name,
    ger.rejection_reason,
    ger.notes
  FROM core.guardian_enrollment_requests ger
  JOIN core.parents p ON p.id = ger.parent_id
  JOIN core.students s ON s.id = ger.student_id
  JOIN core.parent_student_guardians psg
    ON psg.parent_id = ger.parent_id AND psg.student_id = ger.student_id
  LEFT JOIN core.profiles prof ON prof.id = ger.reviewed_by
  WHERE ger.organization_id = p_org_id
    AND (p_status IS NULL OR ger.status = p_status)
    AND (core.is_org_admin(p_org_id) OR core.is_org_member(p_org_id))
  ORDER BY
    CASE WHEN ger.status = 'pending' THEN 0 ELSE 1 END,
    ger.requested_at DESC;
$$;

GRANT EXECUTE ON FUNCTION core.get_org_enrollment_requests(UUID, core.enrollment_request_status) TO authenticated;
REVOKE ALL ON FUNCTION core.get_org_enrollment_requests(UUID, core.enrollment_request_status) FROM anon;

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
  v_consent JSONB;
  v_share_birth BOOLEAN;
  v_share_school BOOLEAN;
  v_share_grade BOOLEAN;
  v_gender TEXT;
  v_school TEXT;
  v_grade TEXT;
  v_birth DATE;
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

  v_consent := COALESCE(v_request.consent_fields, '[]'::JSONB);
  v_share_birth := v_consent @> '"birth_date"'::JSONB;
  v_share_school := v_consent @> '"school"'::JSONB;
  v_share_grade := v_consent @> '"grade"'::JSONB;

  v_birth := CASE WHEN v_share_birth THEN v_student.birth_date ELSE NULL END;
  v_school := CASE
    WHEN v_share_school THEN NULLIF(trim(COALESCE(v_student.school, '')), '')
    ELSE NULL
  END;
  v_grade := CASE
    WHEN v_share_grade THEN NULLIF(trim(COALESCE(v_student.grade, '')), '')
    ELSE NULL
  END;

  -- 성별은 동의하고 M/F일 때만 복사한다. 빈 문자열은 piano NOT NULL 기본값을 덮지 않는다.
  v_gender := NULL;
  IF v_consent @> '"gender"'::JSONB THEN
    v_gender := NULLIF(trim(COALESCE(v_student.gender, '')), '');
    IF v_gender NOT IN ('M', 'F') THEN
      v_gender := NULL;
    END IF;
  END IF;

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
    jsonb_strip_nulls(jsonb_build_object(
      'birthDate', v_birth,
      'gender', v_gender,
      'school', v_school,
      'grade', v_grade
    )) || jsonb_build_object(
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
      COALESCE(v_gender, 'M'),
      v_birth,
      v_school,
      v_grade,
      CURRENT_DATE
    )
    ON CONFLICT (customer_id) DO UPDATE SET
      gender = COALESCE(v_gender, piano.customers.gender),
      birth_date = CASE WHEN v_share_birth THEN EXCLUDED.birth_date ELSE piano.customers.birth_date END,
      school = CASE WHEN v_share_school THEN EXCLUDED.school ELSE piano.customers.school END,
      grade = CASE WHEN v_share_grade THEN EXCLUDED.grade ELSE piano.customers.grade END,
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
