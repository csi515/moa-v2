-- Adult student self-link: students.user_id + join approve binds customer/enrollment
-- Role: reuse core.member_role customer|member (no new STUDENT_SELF enum — maps to self-enrolled customer)

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Global student ↔ auth user (adult self)
-- ---------------------------------------------------------------------------
ALTER TABLE core.students
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES core.profiles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_core_students_user_unique
  ON core.students(user_id)
  WHERE user_id IS NOT NULL;

COMMENT ON COLUMN core.students.user_id IS
  '성인 수강생 본인 계정. 보호자 없이 auth.users(=profiles)와 1:1 연결.';

-- Optional self relationship for guardian table (compat / future)
DO $$ BEGIN
  ALTER TYPE core.guardian_relationship ADD VALUE IF NOT EXISTS 'self';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- Ensure customers.user_id exists (parent portal migration may already have it)
DO $$ BEGIN
  ALTER TABLE core.customers
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES core.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_core_customers_user
  ON core.customers(organization_id, user_id)
  WHERE user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.is_my_customer(org_id UUID, customer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM core.customers c
    WHERE c.id = customer_id
      AND c.organization_id = org_id
      AND c.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION core.is_my_student(student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM core.students s
    WHERE s.id = student_id
      AND s.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION core.get_my_student_customer_id(org_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT c.id
  FROM core.customers c
  WHERE c.organization_id = org_id
    AND c.user_id = auth.uid()
    AND COALESCE(c.metadata->>'entityType', '') IS DISTINCT FROM 'parent'
  ORDER BY c.updated_at DESC NULLS LAST
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION core.is_my_customer(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.is_my_student(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.get_my_student_customer_id(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. approve_customer_join_request — bind user + student + enrollment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.approve_customer_join_request(
  p_request_id UUID,
  p_role TEXT DEFAULT 'customer'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_req RECORD;
  v_customer_id UUID;
  v_membership_id UUID;
  v_existing_customer_id UUID;
  v_student_id UUID;
  v_enrollment_id UUID;
BEGIN
  SELECT * INTO v_req
  FROM core.customer_join_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_req.status != 'pending' THEN
    RAISE EXCEPTION 'Request already processed';
  END IF;

  IF NOT core.is_org_owner_or_admin(v_req.organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_role NOT IN ('customer', 'member') THEN
    RAISE EXCEPTION 'Invalid role. Must be customer or member';
  END IF;

  IF v_req.applicant_user_id IS NULL THEN
    RAISE EXCEPTION 'Applicant user is required for adult self enrollment';
  END IF;

  -- Prefer customer already linked to this user in org
  SELECT c.id INTO v_existing_customer_id
  FROM core.customers c
  WHERE c.organization_id = v_req.organization_id
    AND c.user_id = v_req.applicant_user_id
  LIMIT 1;

  IF v_existing_customer_id IS NULL THEN
    SELECT c.id INTO v_existing_customer_id
    FROM core.customers c
    INNER JOIN core.organization_members om
      ON om.organization_id = c.organization_id
     AND om.user_id = v_req.applicant_user_id
    WHERE c.organization_id = v_req.organization_id
      AND c.name = v_req.applicant_name
    LIMIT 1;
  END IF;

  IF v_existing_customer_id IS NOT NULL THEN
    v_customer_id := v_existing_customer_id;
    UPDATE core.customers
    SET
      phone = COALESCE(NULLIF(v_req.applicant_phone, ''), phone),
      email = COALESCE(NULLIF(v_req.applicant_email, ''), email),
      user_id = COALESCE(user_id, v_req.applicant_user_id),
      status = 'active',
      metadata = COALESCE(metadata, '{}'::JSONB) || jsonb_build_object(
        'entityType', 'student',
        'selfEnrolled', true
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
      user_id,
      metadata
    ) VALUES (
      v_req.organization_id,
      v_req.applicant_name,
      COALESCE(v_req.applicant_phone, ''),
      COALESCE(v_req.applicant_email, ''),
      'active',
      v_req.applicant_user_id,
      COALESCE(v_req.customer_metadata, '{}'::JSONB) || jsonb_build_object(
        'entityType', 'student',
        'selfEnrolled', true
      )
    )
    RETURNING id INTO v_customer_id;
  END IF;

  -- Global student self-link
  SELECT s.id INTO v_student_id
  FROM core.students s
  WHERE s.user_id = v_req.applicant_user_id
  LIMIT 1;

  IF v_student_id IS NULL THEN
    INSERT INTO core.students (display_name, user_id)
    VALUES (v_req.applicant_name, v_req.applicant_user_id)
    RETURNING id INTO v_student_id;
  ELSE
    UPDATE core.students
    SET display_name = COALESCE(NULLIF(v_req.applicant_name, ''), display_name),
        updated_at = now()
    WHERE id = v_student_id;
  END IF;

  -- Enrollment
  SELECT id INTO v_enrollment_id
  FROM core.student_enrollments
  WHERE organization_id = v_req.organization_id
    AND student_id = v_student_id
  LIMIT 1;

  IF v_enrollment_id IS NULL THEN
    -- customer_id is UNIQUE on enrollments — reuse if already enrolled under this customer
    SELECT id INTO v_enrollment_id
    FROM core.student_enrollments
    WHERE customer_id = v_customer_id
    LIMIT 1;

    IF v_enrollment_id IS NULL THEN
      INSERT INTO core.student_enrollments (
        student_id,
        organization_id,
        customer_id,
        status,
        enrolled_at
      ) VALUES (
        v_student_id,
        v_req.organization_id,
        v_customer_id,
        'active',
        CURRENT_DATE
      )
      RETURNING id INTO v_enrollment_id;
    END IF;
  ELSE
    UPDATE core.student_enrollments
    SET status = 'active',
        customer_id = v_customer_id,
        left_at = NULL,
        updated_at = now()
    WHERE id = v_enrollment_id;
  END IF;

  SELECT id INTO v_membership_id
  FROM core.organization_members
  WHERE organization_id = v_req.organization_id
    AND user_id = v_req.applicant_user_id
    AND role = p_role::core.member_role
  LIMIT 1;

  IF v_membership_id IS NULL THEN
    INSERT INTO core.organization_members (
      organization_id,
      user_id,
      role,
      is_active
    ) VALUES (
      v_req.organization_id,
      v_req.applicant_user_id,
      p_role::core.member_role,
      true
    )
    RETURNING id INTO v_membership_id;
  ELSE
    UPDATE core.organization_members
    SET is_active = true, updated_at = now()
    WHERE id = v_membership_id;
  END IF;

  UPDATE core.customer_join_requests
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_request_id;

  RETURN json_build_object(
    'customer_id', v_customer_id,
    'membership_id', v_membership_id,
    'student_id', v_student_id,
    'enrollment_id', v_enrollment_id,
    'was_existing_customer', (v_existing_customer_id IS NOT NULL),
    'success', true
  );
END;
$$;

COMMENT ON FUNCTION core.approve_customer_join_request IS
  '성인 수강생 가입 승인: customers.user_id + students.user_id + student_enrollments + membership';

-- ---------------------------------------------------------------------------
-- 4. RLS — customer can read own CRM row
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS customers_select_self ON core.customers;
CREATE POLICY customers_select_self ON core.customers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS students_select_self ON core.students;
CREATE POLICY students_select_self ON core.students
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS student_enrollments_select_self ON core.student_enrollments;
CREATE POLICY student_enrollments_select_self ON core.student_enrollments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM core.students s
      WHERE s.id = student_id AND s.user_id = auth.uid()
    )
  );

-- Portal tree for adult (self enrollments)
CREATE OR REPLACE FUNCTION core.get_my_student_portal_context()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_student RECORD;
  v_enrollments JSON;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, display_name, birth_date, user_id
  INTO v_student
  FROM core.students
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('student', NULL, 'enrollments', '[]'::JSON);
  END IF;

  SELECT COALESCE(json_agg(row_to_json(x) ORDER BY x.organization_name), '[]'::JSON)
  INTO v_enrollments
  FROM (
    SELECT
      se.id AS enrollment_id,
      se.organization_id,
      o.name AS organization_name,
      o.industry_type::TEXT AS industry_type,
      se.customer_id,
      se.status::TEXT AS status,
      se.enrolled_at,
      se.left_at
    FROM core.student_enrollments se
    JOIN core.organizations o ON o.id = se.organization_id
    WHERE se.student_id = v_student.id
      AND se.status IN ('active', 'leave')
  ) x;

  RETURN json_build_object(
    'student', json_build_object(
      'studentId', v_student.id,
      'displayName', v_student.display_name,
      'birthDate', v_student.birth_date,
      'userId', v_student.user_id
    ),
    'enrollments', v_enrollments
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.get_my_student_portal_context() TO authenticated;

COMMIT;
