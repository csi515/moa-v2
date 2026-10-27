-- Update parent portal tree to include enrollment requests

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
                'left_at', se.left_at
              ) ORDER BY se.status = 'active' DESC, se.enrolled_at DESC
            )
            FROM core.student_enrollments se
            JOIN core.organizations o ON o.id = se.organization_id
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
REVOKE ALL ON FUNCTION core.get_my_parent_portal_tree() FROM anon;
