-- Guardian approve: do not invent gender 'M' when consent omitted.

ALTER TABLE piano.customers
  ALTER COLUMN gender DROP NOT NULL;

ALTER TABLE piano.customers
  ALTER COLUMN gender SET DEFAULT NULL;

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
  v_student RECORD;
  v_customer_id UUID;
  v_parent_customer_id UUID;
  v_enrollment_id UUID;
  v_existing_enrollment RECORD;
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
  v_reused_customer BOOLEAN := false;
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

  SELECT * INTO v_student FROM core.students WHERE id = v_request.student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

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

  v_gender := NULL;
  IF v_consent @> '"gender"'::JSONB THEN
    v_gender := NULLIF(trim(COALESCE(v_student.gender, '')), '');
    IF v_gender NOT IN ('M', 'F') THEN
      v_gender := NULL;
    END IF;
  END IF;

  SELECT se.*
  INTO v_existing_enrollment
  FROM core.student_enrollments se
  WHERE se.student_id = v_request.student_id
    AND se.organization_id = v_request.organization_id
  LIMIT 1;

  IF FOUND THEN
    IF v_existing_enrollment.status IN ('active', 'leave') THEN
      RAISE EXCEPTION 'Child is already enrolled';
    END IF;

    IF v_existing_enrollment.customer_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM core.customers c
         WHERE c.id = v_existing_enrollment.customer_id
           AND c.organization_id = v_request.organization_id
       )
    THEN
      v_customer_id := v_existing_enrollment.customer_id;
      v_reused_customer := true;

      UPDATE core.customers
      SET
        name = v_student.display_name,
        status = 'active',
        metadata = COALESCE(metadata, '{}'::JSONB)
          || jsonb_strip_nulls(jsonb_build_object(
            'birthDate', v_birth,
            'gender', v_gender,
            'school', v_school,
            'grade', v_grade
          ))
          || jsonb_build_object(
            'enrolledViaGuardianRequest', true,
            'guardianRequestId', v_request.id,
            'globalStudentId', v_request.student_id
          ),
        updated_at = now()
      WHERE id = v_customer_id;
    ELSE
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
          'guardianRequestId', v_request.id,
          'globalStudentId', v_request.student_id
        ),
        NULL
      )
      RETURNING id INTO v_customer_id;
    END IF;

    UPDATE core.student_enrollments
    SET
      customer_id = v_customer_id,
      status = 'active',
      enrolled_at = COALESCE(enrolled_at, CURRENT_DATE),
      left_at = NULL,
      updated_at = now()
    WHERE id = v_existing_enrollment.id
    RETURNING id INTO v_enrollment_id;
  ELSE
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
        'guardianRequestId', v_request.id,
        'globalStudentId', v_request.student_id
      ),
      NULL
    )
    RETURNING id INTO v_customer_id;

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
    ON CONFLICT (customer_id) DO UPDATE SET
      student_id = EXCLUDED.student_id,
      status = 'active',
      enrolled_at = COALESCE(core.student_enrollments.enrolled_at, EXCLUDED.enrolled_at),
      left_at = NULL,
      updated_at = now()
    RETURNING id INTO v_enrollment_id;
  END IF;

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
      v_gender,
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
    'organization_name', v_org_name,
    'reused_customer', v_reused_customer
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.approve_guardian_enrollment(UUID) TO authenticated;
REVOKE ALL ON FUNCTION core.approve_guardian_enrollment(UUID) FROM anon;
