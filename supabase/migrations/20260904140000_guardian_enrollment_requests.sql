-- Phase 3: Guardian-initiated enrollment request flow
-- Guardian searches org → requests child enrollment with consent → owner approves

-- =============================================
-- Enrollment request status
-- =============================================
DO $$ BEGIN
  CREATE TYPE core.enrollment_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- Guardian enrollment requests
-- =============================================
CREATE TABLE IF NOT EXISTS core.guardian_enrollment_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id         UUID NOT NULL REFERENCES core.parents(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES core.students(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  status            core.enrollment_request_status NOT NULL DEFAULT 'pending',
  requested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
  rejection_reason  TEXT,
  consent_fields    JSONB NOT NULL DEFAULT '["display_name","birth_date"]'::JSONB,
  notes             TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_id, student_id, organization_id, status)
);

CREATE INDEX IF NOT EXISTS idx_guardian_enrollment_requests_org
  ON core.guardian_enrollment_requests(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_guardian_enrollment_requests_parent
  ON core.guardian_enrollment_requests(parent_id);

-- =============================================
-- RLS
-- =============================================
ALTER TABLE core.guardian_enrollment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guardian_enrollment_requests_parent_select ON core.guardian_enrollment_requests;
CREATE POLICY guardian_enrollment_requests_parent_select ON core.guardian_enrollment_requests
  FOR SELECT TO authenticated
  USING (parent_id = core.get_my_parent_id());

DROP POLICY IF EXISTS guardian_enrollment_requests_admin_select ON core.guardian_enrollment_requests;
CREATE POLICY guardian_enrollment_requests_admin_select ON core.guardian_enrollment_requests
  FOR SELECT TO authenticated
  USING (core.is_org_admin(organization_id) OR core.is_org_member(organization_id));

DROP POLICY IF EXISTS guardian_enrollment_requests_admin_update ON core.guardian_enrollment_requests;
CREATE POLICY guardian_enrollment_requests_admin_update ON core.guardian_enrollment_requests
  FOR UPDATE TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

GRANT SELECT ON core.guardian_enrollment_requests TO authenticated;

-- =============================================
-- Search organizations (public discovery)
-- =============================================
CREATE OR REPLACE FUNCTION core.search_organizations_for_enrollment(
  p_query TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  industry_type TEXT,
  city TEXT,
  phone TEXT,
  description TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT
    o.id,
    o.name,
    o.industry_type,
    COALESCE(o.settings->>'city', o.settings->>'address', '') AS city,
    COALESCE(o.settings->>'phone', '') AS phone,
    COALESCE(o.settings->>'description', '') AS description
  FROM core.organizations o
  WHERE o.is_active = true
    AND (
      p_query IS NULL
      OR p_query = ''
      OR o.name ILIKE '%' || p_query || '%'
      OR o.settings->>'city' ILIKE '%' || p_query || '%'
      OR o.settings->>'address' ILIKE '%' || p_query || '%'
    )
  ORDER BY o.name
  LIMIT LEAST(p_limit, 100);
$$;

GRANT EXECUTE ON FUNCTION core.search_organizations_for_enrollment(TEXT, INT) TO authenticated;

-- =============================================
-- Find organization by public code
-- =============================================
CREATE OR REPLACE FUNCTION core.find_organization_by_public_code(
  p_code TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  industry_type TEXT,
  city TEXT,
  phone TEXT,
  description TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT
    o.id,
    o.name,
    o.industry_type,
    COALESCE(o.settings->>'city', o.settings->>'address', '') AS city,
    COALESCE(o.settings->>'phone', '') AS phone,
    COALESCE(o.settings->>'description', '') AS description
  FROM core.organizations o
  WHERE o.is_active = true
    AND o.public_code IS NOT NULL
    AND upper(trim(o.public_code::text)) = upper(trim(p_code))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION core.find_organization_by_public_code(TEXT) TO authenticated;

-- =============================================
-- Guardian requests child enrollment
-- =============================================
CREATE OR REPLACE FUNCTION core.request_guardian_enrollment(
  p_student_id UUID,
  p_organization_id UUID,
  p_consent_fields JSONB DEFAULT '["display_name","birth_date"]'::JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_parent_id UUID;
  v_student RECORD;
  v_org RECORD;
  v_existing_enrollment RECORD;
  v_existing_request RECORD;
  v_request_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_parent_id := core.get_my_parent_id();
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Parent profile not found';
  END IF;

  -- Verify parent owns this child
  IF NOT EXISTS (
    SELECT 1 FROM core.parent_student_guardians
    WHERE parent_id = v_parent_id AND student_id = p_student_id
  ) THEN
    RAISE EXCEPTION 'You are not authorized to enroll this child';
  END IF;

  -- Get student info
  SELECT * INTO v_student FROM core.students WHERE id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  -- Get org info
  SELECT * INTO v_org FROM core.organizations WHERE id = p_organization_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found or inactive';
  END IF;

  -- Check if already enrolled
  SELECT * INTO v_existing_enrollment
  FROM core.student_enrollments
  WHERE student_id = p_student_id
    AND organization_id = p_organization_id
    AND status IN ('active', 'leave');

  IF FOUND THEN
    RAISE EXCEPTION 'Child is already enrolled in this organization';
  END IF;

  -- Check for existing pending request
  SELECT * INTO v_existing_request
  FROM core.guardian_enrollment_requests
  WHERE parent_id = v_parent_id
    AND student_id = p_student_id
    AND organization_id = p_organization_id
    AND status = 'pending';

  IF FOUND THEN
    RAISE EXCEPTION 'You already have a pending enrollment request for this child';
  END IF;

  -- Create enrollment request
  INSERT INTO core.guardian_enrollment_requests (
    parent_id,
    student_id,
    organization_id,
    status,
    consent_fields,
    notes
  )
  VALUES (
    v_parent_id,
    p_student_id,
    p_organization_id,
    'pending',
    COALESCE(p_consent_fields, '["display_name","birth_date"]'::JSONB),
    p_notes
  )
  RETURNING id INTO v_request_id;

  -- Store consent record
  INSERT INTO core.academy_data_sharing_consents (
    parent_id,
    student_id,
    organization_id,
    shared_fields,
    consented_at
  )
  VALUES (
    v_parent_id,
    p_student_id,
    p_organization_id,
    COALESCE(p_consent_fields, '["display_name","birth_date"]'::JSONB),
    now()
  )
  ON CONFLICT (parent_id, student_id, organization_id) DO UPDATE SET
    shared_fields = EXCLUDED.shared_fields,
    consented_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'student_name', v_student.display_name,
    'organization_name', v_org.name,
    'status', 'pending'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.request_guardian_enrollment(UUID, UUID, JSONB, TEXT) TO authenticated;

-- =============================================
-- Owner approves enrollment request
-- =============================================
CREATE OR REPLACE FUNCTION core.approve_guardian_enrollment(
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_request RECORD;
  v_parent RECORD;
  v_student RECORD;
  v_customer_id UUID;
  v_parent_customer_id UUID;
  v_enrollment_id UUID;
  v_org_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get request
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

  -- Check if already enrolled
  IF EXISTS (
    SELECT 1 FROM core.student_enrollments
    WHERE student_id = v_request.student_id
      AND organization_id = v_request.organization_id
      AND status IN ('active', 'leave')
  ) THEN
    RAISE EXCEPTION 'Child is already enrolled';
  END IF;

  -- Get parent and student info
  SELECT * INTO v_parent FROM core.parents WHERE id = v_request.parent_id;
  SELECT * INTO v_student FROM core.students WHERE id = v_request.student_id;
  SELECT name INTO v_org_name FROM core.organizations WHERE id = v_request.organization_id;

  -- Create student customer
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
      'enrolledViaGuardianRequest', true,
      'guardianRequestId', v_request.id
    ),
    NULL
  )
  RETURNING id INTO v_customer_id;

  -- Create enrollment
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

  -- Ensure parent has org customer profile
  v_parent_customer_id := core.ensure_org_parent_customer(
    v_request.parent_id,
    v_request.organization_id
  );

  -- Link parent to student in org
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

  -- Update request status
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

-- =============================================
-- Owner rejects enrollment request
-- =============================================
CREATE OR REPLACE FUNCTION core.reject_guardian_enrollment(
  p_request_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_request RECORD;
  v_student_name TEXT;
  v_org_name TEXT;
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
    RAISE EXCEPTION 'Request is not pending';
  END IF;

  SELECT display_name INTO v_student_name FROM core.students WHERE id = v_request.student_id;
  SELECT name INTO v_org_name FROM core.organizations WHERE id = v_request.organization_id;

  UPDATE core.guardian_enrollment_requests
  SET
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    rejection_reason = p_reason,
    updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'student_name', v_student_name,
    'organization_name', v_org_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.reject_guardian_enrollment(UUID, TEXT) TO authenticated;

-- =============================================
-- Guardian cancels pending request
-- =============================================
CREATE OR REPLACE FUNCTION core.cancel_guardian_enrollment_request(
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_request RECORD;
  v_parent_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_parent_id := core.get_my_parent_id();
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Parent profile not found';
  END IF;

  SELECT * INTO v_request
  FROM core.guardian_enrollment_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment request not found';
  END IF;

  IF v_request.parent_id <> v_parent_id THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending requests can be cancelled';
  END IF;

  UPDATE core.guardian_enrollment_requests
  SET
    status = 'cancelled',
    updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.cancel_guardian_enrollment_request(UUID) TO authenticated;

-- =============================================
-- Get guardian's pending requests
-- =============================================
CREATE OR REPLACE FUNCTION core.get_my_enrollment_requests()
RETURNS TABLE (
  id UUID,
  student_id UUID,
  student_name TEXT,
  organization_id UUID,
  organization_name TEXT,
  industry_type TEXT,
  status core.enrollment_request_status,
  requested_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT
    ger.id,
    ger.student_id,
    s.display_name AS student_name,
    ger.organization_id,
    o.name AS organization_name,
    o.industry_type,
    ger.status,
    ger.requested_at,
    ger.reviewed_at,
    ger.rejection_reason
  FROM core.guardian_enrollment_requests ger
  JOIN core.students s ON s.id = ger.student_id
  JOIN core.organizations o ON o.id = ger.organization_id
  WHERE ger.parent_id = core.get_my_parent_id()
  ORDER BY ger.requested_at DESC;
$$;

GRANT EXECUTE ON FUNCTION core.get_my_enrollment_requests() TO authenticated;

-- =============================================
-- Get org's pending enrollment requests
-- =============================================
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

-- =============================================
-- Update RPC security: revoke anon
-- =============================================
REVOKE ALL ON FUNCTION core.search_organizations_for_enrollment(TEXT, INT) FROM anon;
REVOKE ALL ON FUNCTION core.find_organization_by_public_code(TEXT) FROM anon;
REVOKE ALL ON FUNCTION core.request_guardian_enrollment(UUID, UUID, JSONB, TEXT) FROM anon;
REVOKE ALL ON FUNCTION core.approve_guardian_enrollment(UUID) FROM anon;
REVOKE ALL ON FUNCTION core.reject_guardian_enrollment(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION core.cancel_guardian_enrollment_request(UUID) FROM anon;
REVOKE ALL ON FUNCTION core.get_my_enrollment_requests() FROM anon;
REVOKE ALL ON FUNCTION core.get_org_enrollment_requests(UUID, core.enrollment_request_status) FROM anon;
