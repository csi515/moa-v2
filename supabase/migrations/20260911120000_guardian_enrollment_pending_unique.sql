-- Guardian enrollment: allow re-approve/re-reject after terminal status
-- Replace UNIQUE (parent, student, org, status) with pending-only partial unique

ALTER TABLE core.guardian_enrollment_requests
  DROP CONSTRAINT IF EXISTS guardian_enrollment_requests_parent_id_student_id_organization_id_status_key;

-- Some environments may have auto-named constraints; drop by matching columns if needed
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'core.guardian_enrollment_requests'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) ILIKE '%parent_id%student_id%organization_id%status%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE core.guardian_enrollment_requests DROP CONSTRAINT %I', cname);
  END IF;
END $$;

DROP INDEX IF EXISTS core.guardian_enrollment_requests_pending_unique;

CREATE UNIQUE INDEX guardian_enrollment_requests_pending_unique
  ON core.guardian_enrollment_requests (parent_id, student_id, organization_id)
  WHERE status = 'pending';
