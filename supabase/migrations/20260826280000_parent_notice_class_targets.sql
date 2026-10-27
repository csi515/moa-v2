-- Parent notice RLS: allow class-targeted notices (target_type = 'class:{service_id}')

CREATE OR REPLACE FUNCTION core.parent_child_in_service(org_id UUID, service_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public, piano
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.student_enrollments se
    JOIN core.parent_student_guardians psg ON psg.student_id = se.student_id
    WHERE psg.parent_id = core.get_my_parent_id()
      AND se.organization_id = org_id
      AND se.status IN ('active', 'leave', 'withdrawn', 'alumni')
      AND (
        EXISTS (
          SELECT 1 FROM piano.class_members cm
          WHERE cm.organization_id = org_id
            AND cm.customer_id = se.customer_id
            AND cm.service_id = service_id
        )
        OR EXISTS (
          SELECT 1 FROM core.customers c
          WHERE c.id = se.customer_id
            AND COALESCE(c.metadata->'classIds', '[]'::jsonb) ? service_id::text
        )
      )
  )
  OR EXISTS (
    SELECT 1
    FROM core.parent_student_links psl
    JOIN core.customers c ON c.id = psl.student_customer_id
    WHERE psl.organization_id = org_id
      AND psl.parent_customer_id = core.get_my_parent_customer_id(org_id)
      AND (
        EXISTS (
          SELECT 1 FROM piano.class_members cm
          WHERE cm.organization_id = org_id
            AND cm.customer_id = psl.student_customer_id
            AND cm.service_id = service_id
        )
        OR COALESCE(c.metadata->'classIds', '[]'::jsonb) ? service_id::text
      )
  );
$$;

GRANT EXECUTE ON FUNCTION core.parent_child_in_service(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS notifications_select ON core.notifications;

CREATE POLICY notifications_select ON core.notifications
  FOR SELECT TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR (
      status = 'sent'
      AND (
        (
          type = 'attendance'
          AND target_id IS NOT NULL
          AND core.parent_owns_student(organization_id, target_id)
        )
        OR (
          type IN ('notice', 'announcement')
          AND target_id IS NOT NULL
          AND core.parent_owns_student(organization_id, target_id)
        )
        OR (
          type IN ('notice', 'announcement')
          AND (target_type = 'all' OR target_type IS NULL)
          AND EXISTS (
            SELECT 1
            FROM core.student_enrollments se
            JOIN core.parent_student_guardians psg ON psg.student_id = se.student_id
            JOIN core.parents p ON p.id = psg.parent_id
            WHERE se.organization_id = notifications.organization_id
              AND p.user_id = auth.uid()
          )
        )
        OR (
          type IN ('notice', 'announcement')
          AND target_type LIKE 'class:%'
          AND core.parent_child_in_service(
            organization_id,
            (substring(target_type from 7))::uuid
          )
        )
      )
    )
  );
