-- Sync bridge: keep legacy parent_student_links / customers in sync with
-- global parent_student_guardians / student_enrollments / parents tables.

-- =============================================
-- Helper: map customer status → enrollment status
-- =============================================
CREATE OR REPLACE FUNCTION core.customer_status_to_enrollment(p_status TEXT)
RETURNS core.enrollment_status
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_status
    WHEN 'leave' THEN 'leave'::core.enrollment_status
    WHEN 'withdrawn' THEN 'withdrawn'::core.enrollment_status
    WHEN 'alumni' THEN 'alumni'::core.enrollment_status
    ELSE 'active'::core.enrollment_status
  END;
$$;

-- =============================================
-- Sync customer row → global student/parent models
-- =============================================
CREATE OR REPLACE FUNCTION core.sync_customer_to_global_models()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_entity_type TEXT;
  v_birth_date DATE;
  v_join_date DATE;
  v_leave_date DATE;
BEGIN
  v_entity_type := COALESCE(NEW.metadata->>'entityType', 'student');

  IF v_entity_type = 'parent' THEN
    INSERT INTO core.parents (id, user_id, name, phone, email, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.user_id,
      NEW.name,
      NEW.phone,
      NEW.email,
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      user_id = COALESCE(EXCLUDED.user_id, core.parents.user_id),
      name = EXCLUDED.name,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      updated_at = now();

    INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id, created_at, updated_at)
    VALUES (NEW.id, NEW.organization_id, NEW.id, NEW.created_at, NEW.updated_at)
    ON CONFLICT (customer_id) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      organization_id = EXCLUDED.organization_id,
      updated_at = now();

    RETURN NEW;
  END IF;

  -- Student customer
  v_birth_date := NULLIF(NEW.metadata->>'birthDate', '')::DATE;
  v_join_date := COALESCE(NULLIF(NEW.metadata->>'joinDate', '')::DATE, NEW.created_at::DATE);
  v_leave_date := NULLIF(NEW.metadata->>'leaveDate', '')::DATE;

  INSERT INTO core.students (id, display_name, birth_date, created_at, updated_at)
  VALUES (NEW.id, NEW.name, v_birth_date, NEW.created_at, NEW.updated_at)
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    birth_date = COALESCE(EXCLUDED.birth_date, core.students.birth_date),
    updated_at = now();

  INSERT INTO core.student_enrollments (
    student_id, organization_id, customer_id, status, enrolled_at, left_at, created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.organization_id,
    NEW.id,
    core.customer_status_to_enrollment(NEW.status),
    v_join_date,
    v_leave_date,
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (customer_id) DO UPDATE SET
    status = EXCLUDED.status,
    enrolled_at = EXCLUDED.enrolled_at,
    left_at = EXCLUDED.left_at,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_customer_to_global ON core.customers;
CREATE TRIGGER trg_sync_customer_to_global
  AFTER INSERT OR UPDATE ON core.customers
  FOR EACH ROW
  EXECUTE FUNCTION core.sync_customer_to_global_models();

-- =============================================
-- Sync parent_student_links → parent_student_guardians
-- =============================================
CREATE OR REPLACE FUNCTION core.sync_parent_link_to_guardian()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_student_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT se.student_id INTO v_student_id
    FROM core.student_enrollments se
    WHERE se.customer_id = OLD.student_customer_id
      AND se.organization_id = OLD.organization_id
    LIMIT 1;

    IF v_student_id IS NOT NULL THEN
      DELETE FROM core.parent_student_guardians
      WHERE parent_id = OLD.parent_customer_id
        AND student_id = v_student_id;
    END IF;

    RETURN OLD;
  END IF;

  -- INSERT or UPDATE
  SELECT se.student_id INTO v_student_id
  FROM core.student_enrollments se
  WHERE se.customer_id = NEW.student_customer_id
    AND se.organization_id = NEW.organization_id
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ensure parent exists in global model
  IF NOT EXISTS (SELECT 1 FROM core.parents WHERE id = NEW.parent_customer_id) THEN
    INSERT INTO core.parents (id, user_id, name, phone, email)
    SELECT c.id, c.user_id, c.name, c.phone, c.email
    FROM core.customers c
    WHERE c.id = NEW.parent_customer_id
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id)
    VALUES (NEW.parent_customer_id, NEW.organization_id, NEW.parent_customer_id)
    ON CONFLICT (customer_id) DO NOTHING;
  END IF;

  INSERT INTO core.parent_student_guardians (
    parent_id, student_id, relationship, is_primary, created_at, updated_at
  )
  VALUES (
    NEW.parent_customer_id,
    v_student_id,
    NEW.relationship,
    NEW.is_primary,
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (parent_id, student_id) DO UPDATE SET
    relationship = EXCLUDED.relationship,
    is_primary = EXCLUDED.is_primary,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_parent_link_to_guardian ON core.parent_student_links;
CREATE TRIGGER trg_sync_parent_link_to_guardian
  AFTER INSERT OR UPDATE OR DELETE ON core.parent_student_links
  FOR EACH ROW
  EXECUTE FUNCTION core.sync_parent_link_to_guardian();

-- =============================================
-- Helper: sync all guardians for a parent in an org
-- =============================================
CREATE OR REPLACE FUNCTION core.sync_guardians_for_parent_org(
  p_parent_id UUID,
  p_org_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_count INT := 0;
  v_link RECORD;
  v_student_id UUID;
BEGIN
  FOR v_link IN
    SELECT *
    FROM core.parent_student_links
    WHERE parent_customer_id = p_parent_id
      AND organization_id = p_org_id
  LOOP
    SELECT se.student_id INTO v_student_id
    FROM core.student_enrollments se
    WHERE se.customer_id = v_link.student_customer_id
      AND se.organization_id = v_link.organization_id
    LIMIT 1;

    IF v_student_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO core.parent_student_guardians (
      parent_id, student_id, relationship, is_primary, created_at, updated_at
    )
    VALUES (
      v_link.parent_customer_id,
      v_student_id,
      v_link.relationship,
      v_link.is_primary,
      v_link.created_at,
      now()
    )
    ON CONFLICT (parent_id, student_id) DO UPDATE SET
      relationship = EXCLUDED.relationship,
      is_primary = EXCLUDED.is_primary,
      updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION core.sync_guardians_for_parent_org(UUID, UUID) TO authenticated;

-- =============================================
-- Org-wide bridge sync (safety net after bulk link writes)
-- =============================================
CREATE OR REPLACE FUNCTION core.sync_org_parent_student_bridge(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_enrollments INT := 0;
  v_guardians INT := 0;
  v_parent RECORD;
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- customers → students + enrollments
  INSERT INTO core.students (id, display_name, birth_date, created_at, updated_at)
  SELECT
    c.id,
    c.name,
    NULLIF(c.metadata->>'birthDate', '')::DATE,
    c.created_at,
    c.updated_at
  FROM core.customers c
  WHERE c.organization_id = p_org_id
    AND (c.metadata->>'entityType' IS NULL OR c.metadata->>'entityType' <> 'parent')
    AND NOT EXISTS (SELECT 1 FROM core.students s WHERE s.id = c.id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO core.student_enrollments (
    student_id, organization_id, customer_id, status, enrolled_at, left_at, created_at, updated_at
  )
  SELECT
    c.id,
    c.organization_id,
    c.id,
    core.customer_status_to_enrollment(c.status),
    COALESCE(NULLIF(c.metadata->>'joinDate', '')::DATE, c.created_at::DATE),
    NULLIF(c.metadata->>'leaveDate', '')::DATE,
    c.created_at,
    c.updated_at
  FROM core.customers c
  WHERE c.organization_id = p_org_id
    AND (c.metadata->>'entityType' IS NULL OR c.metadata->>'entityType' <> 'parent')
  ON CONFLICT (customer_id) DO UPDATE SET
    status = EXCLUDED.status,
    enrolled_at = EXCLUDED.enrolled_at,
    left_at = EXCLUDED.left_at,
    updated_at = now();

  GET DIAGNOSTICS v_enrollments = ROW_COUNT;

  -- parent customers → parents + org profiles
  INSERT INTO core.parents (id, user_id, name, phone, email, created_at, updated_at)
  SELECT c.id, c.user_id, c.name, c.phone, c.email, c.created_at, c.updated_at
  FROM core.customers c
  WHERE c.organization_id = p_org_id
    AND c.metadata->>'entityType' = 'parent'
  ON CONFLICT (id) DO UPDATE SET
    user_id = COALESCE(EXCLUDED.user_id, core.parents.user_id),
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    updated_at = now();

  INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id, created_at, updated_at)
  SELECT c.id, c.organization_id, c.id, c.created_at, c.updated_at
  FROM core.customers c
  WHERE c.organization_id = p_org_id
    AND c.metadata->>'entityType' = 'parent'
  ON CONFLICT (customer_id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    organization_id = EXCLUDED.organization_id,
    updated_at = now();

  -- links → guardians
  INSERT INTO core.parent_student_guardians (parent_id, student_id, relationship, is_primary, created_at, updated_at)
  SELECT
    psl.parent_customer_id,
    se.student_id,
    psl.relationship,
    psl.is_primary,
    psl.created_at,
    now()
  FROM core.parent_student_links psl
  JOIN core.student_enrollments se
    ON se.customer_id = psl.student_customer_id
    AND se.organization_id = psl.organization_id
  WHERE psl.organization_id = p_org_id
    AND EXISTS (SELECT 1 FROM core.parents p WHERE p.id = psl.parent_customer_id)
  ON CONFLICT (parent_id, student_id) DO UPDATE SET
    relationship = EXCLUDED.relationship,
    is_primary = EXCLUDED.is_primary,
    updated_at = now();

  GET DIAGNOSTICS v_guardians = ROW_COUNT;

  RETURN jsonb_build_object(
    'organization_id', p_org_id,
    'enrollments_synced', v_enrollments,
    'guardians_synced', v_guardians
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.sync_org_parent_student_bridge(UUID) TO authenticated;

-- =============================================
-- Update connect_parent_on_login: sync guardians after connect
-- =============================================
CREATE OR REPLACE FUNCTION core.connect_parent_on_login()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_inv RECORD;
  v_parent RECORD;
  v_connected INT := 0;
  v_results JSONB := '[]'::JSONB;
  v_global_parent_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('connected', 0, 'memberships', v_results); END IF;

  SELECT email INTO v_email FROM core.profiles WHERE id = v_user_id;

  FOR v_inv IN
    SELECT pi.*, c.name, c.phone
    FROM core.parent_invitations pi
    JOIN core.customers c ON c.id = pi.parent_customer_id
    WHERE lower(pi.email) = lower(v_email) AND pi.status = 'pending'
  LOOP
    UPDATE core.customers SET user_id = v_user_id, updated_at = now()
    WHERE id = v_inv.parent_customer_id AND organization_id = v_inv.organization_id;

    INSERT INTO core.parents (id, user_id, name, phone, email)
    VALUES (v_inv.parent_customer_id, v_user_id, v_inv.name, v_inv.phone, v_email)
    ON CONFLICT (id) DO UPDATE SET user_id = v_user_id, updated_at = now()
    RETURNING id INTO v_global_parent_id;

    INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id)
    VALUES (v_global_parent_id, v_inv.organization_id, v_inv.parent_customer_id)
    ON CONFLICT (customer_id) DO UPDATE SET parent_id = EXCLUDED.parent_id, updated_at = now();

    PERFORM core.sync_guardians_for_parent_org(v_global_parent_id, v_inv.organization_id);

    UPDATE core.parent_invitations SET status = 'accepted', accepted_at = now() WHERE id = v_inv.id;

    v_connected := v_connected + 1;
    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'organization_id', v_inv.organization_id,
      'parent_customer_id', v_inv.parent_customer_id
    ));
  END LOOP;

  IF v_email IS NOT NULL AND trim(v_email) <> '' THEN
    FOR v_parent IN
      SELECT c.*
      FROM core.customers c
      WHERE lower(c.email) = lower(v_email)
        AND c.metadata->>'entityType' = 'parent'
        AND c.user_id IS NULL
    LOOP
      UPDATE core.customers SET user_id = v_user_id, updated_at = now()
      WHERE id = v_parent.id;

      INSERT INTO core.parents (id, user_id, name, phone, email)
      VALUES (v_parent.id, v_user_id, v_parent.name, v_parent.phone, v_email)
      ON CONFLICT (id) DO UPDATE SET user_id = v_user_id, updated_at = now()
      RETURNING id INTO v_global_parent_id;

      INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id)
      VALUES (v_global_parent_id, v_parent.organization_id, v_parent.id)
      ON CONFLICT (customer_id) DO UPDATE SET parent_id = EXCLUDED.parent_id, updated_at = now();

      PERFORM core.sync_guardians_for_parent_org(v_global_parent_id, v_parent.organization_id);
    END LOOP;
  END IF;

  PERFORM core.ensure_global_parent_profile();

  RETURN jsonb_build_object('connected', v_connected, 'memberships', v_results);
END;
$$;

-- =============================================
-- Update invite_parent_member: sync guardians when connected
-- =============================================
CREATE OR REPLACE FUNCTION core.invite_parent_member(
  p_org_id UUID,
  p_parent_customer_id UUID,
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_email TEXT;
  v_parent RECORD;
  v_profile_id UUID;
  v_invitation_id UUID;
  v_global_parent_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_email := lower(trim(p_email));
  IF v_email = '' OR v_email NOT LIKE '%@%' THEN
    RAISE EXCEPTION 'Valid email is required';
  END IF;

  SELECT * INTO v_parent
  FROM core.customers
  WHERE id = p_parent_customer_id AND organization_id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent not found';
  END IF;

  UPDATE core.customers SET email = v_email, updated_at = now()
  WHERE id = p_parent_customer_id;

  INSERT INTO core.parents (id, user_id, name, phone, email)
  VALUES (p_parent_customer_id, v_parent.user_id, v_parent.name, v_parent.phone, v_email)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    updated_at = now()
  RETURNING id INTO v_global_parent_id;

  INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id)
  VALUES (v_global_parent_id, p_org_id, p_parent_customer_id)
  ON CONFLICT (customer_id) DO UPDATE SET parent_id = EXCLUDED.parent_id, updated_at = now();

  IF v_parent.user_id IS NOT NULL THEN
    UPDATE core.parents SET user_id = v_parent.user_id, updated_at = now()
    WHERE id = v_global_parent_id;

    PERFORM core.sync_guardians_for_parent_org(v_global_parent_id, p_org_id);

    RETURN jsonb_build_object('status', 'connected', 'parent_customer_id', p_parent_customer_id, 'user_id', v_parent.user_id);
  END IF;

  SELECT id INTO v_profile_id FROM core.profiles WHERE lower(email) = v_email LIMIT 1;

  IF v_profile_id IS NOT NULL THEN
    UPDATE core.customers SET user_id = v_profile_id, updated_at = now()
    WHERE id = p_parent_customer_id;

    UPDATE core.parents SET user_id = v_profile_id, updated_at = now()
    WHERE id = v_global_parent_id;

    UPDATE core.parent_invitations SET status = 'accepted', accepted_at = now()
    WHERE organization_id = p_org_id AND parent_customer_id = p_parent_customer_id;

    PERFORM core.sync_guardians_for_parent_org(v_global_parent_id, p_org_id);

    RETURN jsonb_build_object('status', 'connected', 'parent_customer_id', p_parent_customer_id, 'user_id', v_profile_id);
  END IF;

  INSERT INTO core.parent_invitations (organization_id, parent_customer_id, email, role, invited_by, status)
  VALUES (p_org_id, p_parent_customer_id, v_email, 'parent', auth.uid(), 'pending')
  ON CONFLICT (organization_id, parent_customer_id)
  DO UPDATE SET email = EXCLUDED.email, status = 'pending', invited_by = EXCLUDED.invited_by, accepted_at = NULL
  RETURNING id INTO v_invitation_id;

  RETURN jsonb_build_object('status', 'invited', 'parent_customer_id', p_parent_customer_id, 'invitation_id', v_invitation_id, 'email', v_email);
END;
$$;

-- =============================================
-- One-time backfill for any gaps since initial migration
-- =============================================

-- Students + enrollments
INSERT INTO core.students (id, display_name, birth_date, created_at, updated_at)
SELECT
  c.id,
  c.name,
  NULLIF(c.metadata->>'birthDate', '')::DATE,
  c.created_at,
  c.updated_at
FROM core.customers c
WHERE (c.metadata->>'entityType' IS NULL OR c.metadata->>'entityType' <> 'parent')
  AND NOT EXISTS (SELECT 1 FROM core.students s WHERE s.id = c.id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO core.student_enrollments (
  student_id, organization_id, customer_id, status, enrolled_at, left_at, created_at, updated_at
)
SELECT
  c.id,
  c.organization_id,
  c.id,
  core.customer_status_to_enrollment(c.status),
  COALESCE(NULLIF(c.metadata->>'joinDate', '')::DATE, c.created_at::DATE),
  NULLIF(c.metadata->>'leaveDate', '')::DATE,
  c.created_at,
  c.updated_at
FROM core.customers c
WHERE (c.metadata->>'entityType' IS NULL OR c.metadata->>'entityType' <> 'parent')
ON CONFLICT (customer_id) DO UPDATE SET
  status = EXCLUDED.status,
  enrolled_at = EXCLUDED.enrolled_at,
  left_at = EXCLUDED.left_at,
  updated_at = now();

-- Parents + org profiles
INSERT INTO core.parents (id, user_id, name, phone, email, created_at, updated_at)
SELECT c.id, c.user_id, c.name, c.phone, c.email, c.created_at, c.updated_at
FROM core.customers c
WHERE c.metadata->>'entityType' = 'parent'
ON CONFLICT (id) DO UPDATE SET
  user_id = COALESCE(EXCLUDED.user_id, core.parents.user_id),
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  updated_at = now();

INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id, created_at, updated_at)
SELECT c.id, c.organization_id, c.id, c.created_at, c.updated_at
FROM core.customers c
WHERE c.metadata->>'entityType' = 'parent'
ON CONFLICT (customer_id) DO NOTHING;

-- Links → guardians
INSERT INTO core.parent_student_guardians (parent_id, student_id, relationship, is_primary, created_at, updated_at)
SELECT
  psl.parent_customer_id,
  se.student_id,
  psl.relationship,
  psl.is_primary,
  psl.created_at,
  now()
FROM core.parent_student_links psl
JOIN core.student_enrollments se
  ON se.customer_id = psl.student_customer_id
  AND se.organization_id = psl.organization_id
WHERE EXISTS (SELECT 1 FROM core.parents p WHERE p.id = psl.parent_customer_id)
ON CONFLICT (parent_id, student_id) DO UPDATE SET
  relationship = EXCLUDED.relationship,
  is_primary = EXCLUDED.is_primary,
  updated_at = now();
