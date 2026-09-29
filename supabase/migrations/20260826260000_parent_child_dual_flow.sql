-- Parent-child dual flow: P0 fixes + P1 parent register + P2 consent

-- =============================================
-- P0: Ensure org parent customer + profile
-- =============================================
CREATE OR REPLACE FUNCTION core.ensure_org_parent_customer(
  p_parent_id UUID,
  p_org_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_parent RECORD;
  v_customer_id UUID;
BEGIN
  IF p_parent_id IS NULL OR p_org_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT opp.customer_id INTO v_customer_id
  FROM core.org_parent_profiles opp
  WHERE opp.parent_id = p_parent_id
    AND opp.organization_id = p_org_id;

  IF v_customer_id IS NOT NULL THEN
    RETURN v_customer_id;
  END IF;

  SELECT * INTO v_parent FROM core.parents WHERE id = p_parent_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Legacy: global parent id equals parent customer id in this org
  SELECT c.id INTO v_customer_id
  FROM core.customers c
  WHERE c.id = p_parent_id
    AND c.organization_id = p_org_id
    AND c.metadata->>'entityType' = 'parent';

  IF v_customer_id IS NULL AND v_parent.user_id IS NOT NULL THEN
    SELECT c.id INTO v_customer_id
    FROM core.customers c
    WHERE c.organization_id = p_org_id
      AND c.metadata->>'entityType' = 'parent'
      AND c.user_id = v_parent.user_id
    ORDER BY c.updated_at DESC
    LIMIT 1;
  END IF;

  IF v_customer_id IS NULL AND v_parent.email IS NOT NULL THEN
    SELECT c.id INTO v_customer_id
    FROM core.customers c
    WHERE c.organization_id = p_org_id
      AND c.metadata->>'entityType' = 'parent'
      AND lower(trim(c.email)) = lower(trim(v_parent.email))
    ORDER BY c.updated_at DESC
    LIMIT 1;
  END IF;

  IF v_customer_id IS NULL THEN
    INSERT INTO core.customers (
      organization_id, name, phone, email, status, metadata, user_id
    )
    VALUES (
      p_org_id,
      COALESCE(NULLIF(trim(v_parent.name), ''), '학부모'),
      v_parent.phone,
      v_parent.email,
      'active',
      jsonb_build_object('entityType', 'parent'),
      v_parent.user_id
    )
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE core.customers
    SET
      user_id = COALESCE(user_id, v_parent.user_id),
      name = COALESCE(NULLIF(trim(name), ''), v_parent.name),
      phone = COALESCE(phone, v_parent.phone),
      email = COALESCE(email, v_parent.email),
      updated_at = now()
    WHERE id = v_customer_id;
  END IF;

  INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id)
  VALUES (p_parent_id, p_org_id, v_customer_id)
  ON CONFLICT (customer_id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    updated_at = now();

  RETURN v_customer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION core.ensure_org_parent_customer(UUID, UUID) TO authenticated;

-- =============================================
-- P0: parent_owns_customer — guardian + enrollment (org profile optional)
-- =============================================
CREATE OR REPLACE FUNCTION core.parent_owns_customer(org_id UUID, cust_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.parent_student_guardians psg
    JOIN core.student_enrollments se ON se.student_id = psg.student_id
    WHERE psg.parent_id = core.get_my_parent_id()
      AND se.organization_id = org_id
      AND se.customer_id = cust_id
      AND se.status IN ('active', 'leave', 'withdrawn', 'alumni')
  )
  OR EXISTS (
    SELECT 1 FROM core.parent_student_links psl
    WHERE psl.organization_id = org_id
      AND psl.student_customer_id = cust_id
      AND psl.parent_customer_id = core.get_my_parent_customer_id(org_id)
  );
$$;

-- =============================================
-- P1: Merge parent-created orphan student into academy student
-- =============================================
CREATE OR REPLACE FUNCTION core.merge_parent_created_student_if_duplicate(
  p_parent_id UUID,
  p_academy_student_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_academy RECORD;
  v_orphan RECORD;
  v_merged INT := 0;
BEGIN
  SELECT display_name, birth_date INTO v_academy
  FROM core.students
  WHERE id = p_academy_student_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  FOR v_orphan IN
    SELECT s.id
    FROM core.students s
    JOIN core.parent_student_guardians psg ON psg.student_id = s.id
    WHERE psg.parent_id = p_parent_id
      AND s.id <> p_academy_student_id
      AND NOT EXISTS (
        SELECT 1 FROM core.student_enrollments se WHERE se.student_id = s.id
      )
      AND lower(trim(s.display_name)) = lower(trim(v_academy.display_name))
      AND s.birth_date IS NOT DISTINCT FROM v_academy.birth_date
  LOOP
    DELETE FROM core.parent_student_guardians
    WHERE parent_id = p_parent_id AND student_id = v_orphan.id;

    DELETE FROM core.students s
    WHERE s.id = v_orphan.id
      AND NOT EXISTS (SELECT 1 FROM core.student_enrollments se WHERE se.student_id = s.id)
      AND NOT EXISTS (SELECT 1 FROM core.parent_student_guardians psg WHERE psg.student_id = s.id);

    v_merged := v_merged + 1;
  END LOOP;

  RETURN v_merged;
END;
$$;

GRANT EXECUTE ON FUNCTION core.merge_parent_created_student_if_duplicate(UUID, UUID) TO authenticated;

-- =============================================
-- P2: Academy data sharing consent
-- =============================================
CREATE TABLE IF NOT EXISTS core.academy_data_sharing_consents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id        UUID NOT NULL REFERENCES core.parents(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES core.students(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  shared_fields    JSONB NOT NULL DEFAULT '["display_name","birth_date"]'::JSONB,
  consented_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_id, student_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_academy_consents_parent
  ON core.academy_data_sharing_consents(parent_id);

ALTER TABLE core.academy_data_sharing_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS academy_consents_parent_select ON core.academy_data_sharing_consents;
CREATE POLICY academy_consents_parent_select ON core.academy_data_sharing_consents
  FOR SELECT TO authenticated
  USING (parent_id = core.get_my_parent_id());

DROP POLICY IF EXISTS academy_consents_admin_select ON core.academy_data_sharing_consents;
CREATE POLICY academy_consents_admin_select ON core.academy_data_sharing_consents
  FOR SELECT TO authenticated
  USING (core.is_org_admin(organization_id));

GRANT SELECT ON core.academy_data_sharing_consents TO authenticated;

-- =============================================
-- P1: Parent registers child (no academy enrollment yet)
-- =============================================
CREATE OR REPLACE FUNCTION core.parent_register_child(
  p_display_name TEXT,
  p_birth_date DATE DEFAULT NULL,
  p_relationship core.guardian_relationship DEFAULT 'other',
  p_is_primary BOOLEAN DEFAULT true
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
  v_existing RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_name := trim(p_display_name);
  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'Child name is required';
  END IF;

  v_parent_id := core.ensure_global_parent_profile();
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Could not create parent profile';
  END IF;

  SELECT s.id, s.display_name, s.birth_date
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
      'birth_date', v_existing.birth_date
    );
  END IF;

  INSERT INTO core.students (display_name, birth_date, metadata)
  VALUES (
    v_name,
    p_birth_date,
    jsonb_build_object('source', 'parent_portal', 'created_by_parent_id', v_parent_id)
  )
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
    'birth_date', p_birth_date
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.parent_register_child(TEXT, DATE, core.guardian_relationship, BOOLEAN) TO authenticated;

-- =============================================
-- P0+P1+P2: Redeem guardian link token (fixed org profile + relationship + consent)
-- =============================================
CREATE OR REPLACE FUNCTION core.redeem_guardian_link_token(
  p_token TEXT,
  p_shared_fields JSONB DEFAULT '["display_name","birth_date"]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_hash TEXT;
  v_row RECORD;
  v_parent_id UUID;
  v_profile RECORD;
  v_parent_customer_id UUID;
  v_relationship core.guardian_relationship := 'other';
  v_is_primary BOOLEAN := false;
  v_student_customer_id UUID;
  v_merged INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_hash := encode(digest(upper(trim(p_token)), 'sha256'), 'hex');

  SELECT glt.*, s.display_name AS student_name, o.name AS org_name
  INTO v_row
  FROM core.guardian_link_tokens glt
  JOIN core.students s ON s.id = glt.student_id
  JOIN core.organizations o ON o.id = glt.organization_id
  WHERE glt.token_hash = v_hash
    AND glt.used_count < glt.max_uses
    AND (glt.expires_at IS NULL OR glt.expires_at > now())
  FOR UPDATE OF glt;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired link code';
  END IF;

  v_parent_id := core.ensure_global_parent_profile();
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Could not create parent profile';
  END IF;

  SELECT * INTO v_profile FROM core.profiles WHERE id = auth.uid();

  UPDATE core.parents
  SET name = COALESCE(NULLIF(name, '학부모'), v_profile.full_name, '학부모'),
      email = COALESCE(email, v_profile.email),
      updated_at = now()
  WHERE id = v_parent_id;

  v_student_customer_id := NULLIF(v_row.metadata->>'customer_id', '')::UUID;
  v_parent_customer_id := NULLIF(v_row.metadata->>'parent_customer_id', '')::UUID;

  IF v_parent_customer_id IS NOT NULL THEN
    IF v_parent_id <> v_parent_customer_id THEN
      UPDATE core.parents
      SET user_id = NULL, updated_at = now()
      WHERE id = v_parent_id AND user_id = auth.uid();
    END IF;

    UPDATE core.customers
    SET user_id = auth.uid(), updated_at = now()
    WHERE id = v_parent_customer_id AND organization_id = v_row.organization_id;

    INSERT INTO core.parents (id, user_id, name, phone, email)
    SELECT c.id, auth.uid(), c.name, c.phone, c.email
    FROM core.customers c
    WHERE c.id = v_parent_customer_id
    ON CONFLICT (id) DO UPDATE SET
      user_id = auth.uid(),
      name = COALESCE(EXCLUDED.name, core.parents.name),
      phone = COALESCE(EXCLUDED.phone, core.parents.phone),
      email = COALESCE(EXCLUDED.email, core.parents.email),
      updated_at = now();

    IF v_parent_id <> v_parent_customer_id THEN
      UPDATE core.parent_student_guardians
      SET parent_id = v_parent_customer_id, updated_at = now()
      WHERE parent_id = v_parent_id;

      DELETE FROM core.parents p
      WHERE p.id = v_parent_id
        AND NOT EXISTS (
          SELECT 1 FROM core.parent_student_guardians psg WHERE psg.parent_id = p.id
        );

      v_parent_id := v_parent_customer_id;
    END IF;
  END IF;

  v_parent_customer_id := core.ensure_org_parent_customer(v_parent_id, v_row.organization_id);

  IF v_student_customer_id IS NOT NULL AND v_parent_customer_id IS NOT NULL THEN
    SELECT psl.relationship, psl.is_primary
    INTO v_relationship, v_is_primary
    FROM core.parent_student_links psl
    WHERE psl.organization_id = v_row.organization_id
      AND psl.parent_customer_id = v_parent_customer_id
      AND psl.student_customer_id = v_student_customer_id
    LIMIT 1;
  END IF;

  IF v_is_primary THEN
    UPDATE core.parent_student_guardians
    SET is_primary = false, updated_at = now()
    WHERE parent_id = v_parent_id AND is_primary = true;
  END IF;

  INSERT INTO core.parent_student_guardians (parent_id, student_id, relationship, is_primary)
  VALUES (v_parent_id, v_row.student_id, COALESCE(v_relationship, 'other'), COALESCE(v_is_primary, false))
  ON CONFLICT (parent_id, student_id) DO UPDATE SET
    relationship = COALESCE(EXCLUDED.relationship, core.parent_student_guardians.relationship),
    is_primary = EXCLUDED.is_primary OR core.parent_student_guardians.is_primary,
    updated_at = now();

  v_merged := core.merge_parent_created_student_if_duplicate(v_parent_id, v_row.student_id);

  INSERT INTO core.academy_data_sharing_consents (
    parent_id, student_id, organization_id, shared_fields
  )
  VALUES (
    v_parent_id,
    v_row.student_id,
    v_row.organization_id,
    COALESCE(p_shared_fields, '["display_name","birth_date"]'::JSONB)
  )
  ON CONFLICT (parent_id, student_id, organization_id) DO UPDATE SET
    shared_fields = EXCLUDED.shared_fields,
    consented_at = now();

  UPDATE core.guardian_link_tokens
  SET used_count = used_count + 1
  WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'success', true,
    'student_name', v_row.student_name,
    'organization_name', v_row.org_name,
    'organization_id', v_row.organization_id,
    'student_id', v_row.student_id,
    'merged_duplicates', v_merged
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.redeem_guardian_link_token(TEXT, JSONB) TO authenticated;
