-- Fix: students ↔ student_enrollments RLS infinite recursion (42P17)
-- student_enrollments_select_self reads students (RLS),
-- students_guardian_select reads student_enrollments (RLS) → cycle.

CREATE OR REPLACE FUNCTION core.is_student_owner(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.students s
    WHERE s.id = p_student_id
      AND s.user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION core.is_student_owner(UUID) IS
  'RLS 안전: students.user_id = auth.uid() 여부 (SECURITY DEFINER)';

CREATE OR REPLACE FUNCTION core.is_student_org_admin(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.student_enrollments se
    WHERE se.student_id = p_student_id
      AND core.is_org_admin(se.organization_id)
  );
$$;

COMMENT ON FUNCTION core.is_student_org_admin(UUID) IS
  'RLS 안전: 학생 enrollment org의 admin 여부 (SECURITY DEFINER)';

GRANT EXECUTE ON FUNCTION core.is_student_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.is_student_org_admin(UUID) TO authenticated;

DROP POLICY IF EXISTS student_enrollments_select_self ON core.student_enrollments;
CREATE POLICY student_enrollments_select_self ON core.student_enrollments
  FOR SELECT TO authenticated
  USING (core.is_student_owner(student_id));

DROP POLICY IF EXISTS students_guardian_select ON core.students;
CREATE POLICY students_guardian_select ON core.students
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM core.parent_student_guardians psg
      WHERE psg.student_id = students.id
        AND psg.parent_id = core.get_my_parent_id()
    )
    OR core.is_student_org_admin(students.id)
  );
