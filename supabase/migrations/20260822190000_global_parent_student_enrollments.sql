-- Global Parent / Student / Enrollment model (approved design A/A/A)
-- Parent ↔ Org: NO direct 1:1; use org_parent_profiles projection
-- Student ↔ Org: student_enrollments lifecycle

DO $$ BEGIN
  CREATE TYPE core.enrollment_status AS ENUM ('active', 'leave', 'withdrawn', 'alumni');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE core.guardian_link_token_type AS ENUM ('invite_code', 'qr', 'deep_link');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- GLOBAL PARENT (User 1:1)
-- =============================================
CREATE TABLE IF NOT EXISTS core.parents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID UNIQUE REFERENCES core.profiles(id) ON DELETE SET NULL,
  name        TEXT NOT NULL DEFAULT '학부모',
  phone       TEXT,
  email       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_core_parents_user ON core.parents(user_id);

-- =============================================
-- GLOBAL STUDENT (child identity)
-- =============================================
CREATE TABLE IF NOT EXISTS core.students (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name  TEXT NOT NULL,
  birth_date    DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- PARENT ↔ STUDENT (global, no org)
-- =============================================
CREATE TABLE IF NOT EXISTS core.parent_student_guardians (
  parent_id     UUID NOT NULL REFERENCES core.parents(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES core.students(id) ON DELETE CASCADE,
  relationship  core.guardian_relationship NOT NULL DEFAULT 'other',
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_student_guardians_student ON core.parent_student_guardians(student_id);

-- =============================================
-- STUDENT ↔ ORGANIZATION (enrollment lifecycle)
-- =============================================
CREATE TABLE IF NOT EXISTS core.student_enrollments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES core.students(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL UNIQUE REFERENCES core.customers(id) ON DELETE CASCADE,
  status          core.enrollment_status NOT NULL DEFAULT 'active',
  enrolled_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  left_at         DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_org ON core.student_enrollments(organization_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student ON core.student_enrollments(student_id);

-- =============================================
-- PARENT org projection (CRM, not portal entry)
-- =============================================
CREATE TABLE IF NOT EXISTS core.org_parent_profiles (
  parent_id       UUID NOT NULL REFERENCES core.parents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL UNIQUE REFERENCES core.customers(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_id, organization_id)
);

-- =============================================
-- Guardian link tokens (invite code / QR / deep link — Phase B ready)
-- =============================================
CREATE TABLE IF NOT EXISTS core.guardian_link_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  student_id      UUID REFERENCES core.students(id) ON DELETE SET NULL,
  enrollment_id   UUID REFERENCES core.student_enrollments(id) ON DELETE SET NULL,
  token_hash      TEXT NOT NULL,
  token_type      core.guardian_link_token_type NOT NULL DEFAULT 'invite_code',
  expires_at      TIMESTAMPTZ,
  max_uses        INT NOT NULL DEFAULT 1,
  used_count      INT NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guardian_link_tokens_org ON core.guardian_link_tokens(organization_id);

-- =============================================
-- LEGACY DATA MIGRATION
-- =============================================

-- Student customers → global students + enrollments (1:1 Phase A)
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
  student_id, organization_id, customer_id, status, enrolled_at, left_at, created_at
)
SELECT
  c.id,
  c.organization_id,
  c.id,
  CASE c.status
    WHEN 'leave' THEN 'leave'::core.enrollment_status
    WHEN 'withdrawn' THEN 'withdrawn'::core.enrollment_status
    ELSE 'active'::core.enrollment_status
  END,
  COALESCE(NULLIF(c.metadata->>'joinDate', '')::DATE, c.created_at::DATE),
  NULLIF(c.metadata->>'leaveDate', '')::DATE,
  c.created_at
FROM core.customers c
WHERE (c.metadata->>'entityType' IS NULL OR c.metadata->>'entityType' <> 'parent')
ON CONFLICT (customer_id) DO NOTHING;

-- Parent customers → global parents + org_parent_profiles
INSERT INTO core.parents (id, user_id, name, phone, email, created_at, updated_at)
SELECT
  c.id,
  c.user_id,
  c.name,
  c.phone,
  COALESCE(c.email, NULL),
  c.created_at,
  c.updated_at
FROM core.customers c
WHERE (c.metadata->>'entityType') = 'parent'
ON CONFLICT (id) DO UPDATE SET
  user_id = COALESCE(EXCLUDED.user_id, core.parents.user_id),
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  updated_at = now();

-- org_parent_profiles from parent customers
INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id, created_at)
SELECT c.id, c.organization_id, c.id, c.created_at
FROM core.customers c
WHERE (c.metadata->>'entityType') = 'parent'
ON CONFLICT (customer_id) DO NOTHING;

-- Merge duplicate parents by user_id (keep oldest id)
WITH ranked AS (
  SELECT id, user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS rn
  FROM core.parents
  WHERE user_id IS NOT NULL
),
canonical AS (
  SELECT user_id, id AS canonical_id FROM ranked WHERE rn = 1
)
UPDATE core.org_parent_profiles opp
SET parent_id = c.canonical_id
FROM ranked r
JOIN canonical c ON c.user_id = r.user_id
WHERE opp.parent_id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT id, user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS rn
  FROM core.parents
  WHERE user_id IS NOT NULL
),
canonical AS (
  SELECT user_id, id AS canonical_id FROM ranked WHERE rn = 1
)
UPDATE core.parent_student_guardians psg
SET parent_id = c.canonical_id
FROM ranked r
JOIN canonical c ON c.user_id = r.user_id
WHERE psg.parent_id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT id, user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS rn
  FROM core.parents
  WHERE user_id IS NOT NULL
)
DELETE FROM core.parents p
USING ranked r
WHERE p.id = r.id AND r.rn > 1;

-- parent_student_links → parent_student_guardians
INSERT INTO core.parent_student_guardians (parent_id, student_id, relationship, is_primary, created_at)
SELECT
  psl.parent_customer_id,
  se.student_id,
  psl.relationship,
  psl.is_primary,
  psl.created_at
FROM core.parent_student_links psl
JOIN core.student_enrollments se
  ON se.customer_id = psl.student_customer_id
  AND se.organization_id = psl.organization_id
WHERE EXISTS (SELECT 1 FROM core.parents p WHERE p.id = psl.parent_customer_id)
ON CONFLICT (parent_id, student_id) DO UPDATE SET
  relationship = EXCLUDED.relationship,
  is_primary = EXCLUDED.is_primary,
  updated_at = now();

-- =============================================
-- RLS HELPERS
-- =============================================
CREATE OR REPLACE FUNCTION core.get_my_parent_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT id FROM core.parents WHERE user_id = auth.uid() LIMIT 1;
$$;

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
    JOIN core.org_parent_profiles opp
      ON opp.parent_id = psg.parent_id AND opp.organization_id = org_id
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

-- Replace parent_owns_student to use enrollment model
CREATE OR REPLACE FUNCTION core.parent_owns_student(org_id UUID, student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT core.parent_owns_customer(org_id, student_id);
$$;

GRANT EXECUTE ON FUNCTION core.get_my_parent_id() TO authenticated;
GRANT EXECUTE ON FUNCTION core.parent_owns_customer(UUID, UUID) TO authenticated;

-- =============================================
-- RLS on new tables
-- =============================================
ALTER TABLE core.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.parent_student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.org_parent_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parents_self_select ON core.parents;
CREATE POLICY parents_self_select ON core.parents
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS parents_self_update ON core.parents;
CREATE POLICY parents_self_update ON core.parents
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS students_guardian_select ON core.students;
CREATE POLICY students_guardian_select ON core.students
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM core.parent_student_guardians psg
      WHERE psg.student_id = students.id AND psg.parent_id = core.get_my_parent_id()
    )
    OR core.is_org_admin((SELECT organization_id FROM core.student_enrollments se WHERE se.student_id = students.id LIMIT 1))
  );

DROP POLICY IF EXISTS parent_student_guardians_select ON core.parent_student_guardians;
CREATE POLICY parent_student_guardians_select ON core.parent_student_guardians
  FOR SELECT TO authenticated
  USING (parent_id = core.get_my_parent_id() OR core.is_org_member(
    (SELECT organization_id FROM core.org_parent_profiles WHERE parent_id = parent_student_guardians.parent_id LIMIT 1)
  ));

DROP POLICY IF EXISTS student_enrollments_parent_select ON core.student_enrollments;
CREATE POLICY student_enrollments_parent_select ON core.student_enrollments
  FOR SELECT TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR core.is_org_member(organization_id)
    OR EXISTS (
      SELECT 1 FROM core.parent_student_guardians psg
      WHERE psg.student_id = student_enrollments.student_id
        AND psg.parent_id = core.get_my_parent_id()
    )
  );

DROP POLICY IF EXISTS org_parent_profiles_select ON core.org_parent_profiles;
CREATE POLICY org_parent_profiles_select ON core.org_parent_profiles
  FOR SELECT TO authenticated
  USING (
    parent_id = core.get_my_parent_id()
    OR core.is_org_admin(organization_id)
    OR core.is_org_member(organization_id)
  );

-- Admin write policies
DROP POLICY IF EXISTS student_enrollments_admin ON core.student_enrollments;
CREATE POLICY student_enrollments_admin ON core.student_enrollments
  FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

-- =============================================
-- Portal tree RPC
-- =============================================
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
    RETURN jsonb_build_object('parent', null, 'children', '[]'::JSONB);
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
    ), '[]'::JSONB)
  ) INTO v_result
  FROM core.parents p
  WHERE p.id = v_parent_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION core.get_my_parent_portal_tree() TO authenticated;

-- Ensure global parent from user profile + legacy memberships
CREATE OR REPLACE FUNCTION core.ensure_global_parent_profile()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_user_id UUID;
  v_parent_id UUID;
  v_profile RECORD;
  v_om RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN NULL; END IF;

  SELECT id INTO v_parent_id FROM core.parents WHERE user_id = v_user_id LIMIT 1;
  IF v_parent_id IS NOT NULL THEN RETURN v_parent_id; END IF;

  SELECT * INTO v_profile FROM core.profiles WHERE id = v_user_id;

  -- From legacy organization_members parent_customer_id
  FOR v_om IN
    SELECT om.parent_customer_id, om.organization_id, c.name, c.phone, c.email
    FROM core.organization_members om
    JOIN core.customers c ON c.id = om.parent_customer_id
    WHERE om.user_id = v_user_id AND om.role = 'parent' AND om.parent_customer_id IS NOT NULL
    LIMIT 1
  LOOP
    INSERT INTO core.parents (id, user_id, name, phone, email)
    VALUES (v_om.parent_customer_id, v_user_id, v_om.name, v_om.phone, v_om.email)
    ON CONFLICT (id) DO UPDATE SET user_id = v_user_id, updated_at = now()
    RETURNING id INTO v_parent_id;
    RETURN v_parent_id;
  END LOOP;

  INSERT INTO core.parents (user_id, name, email)
  VALUES (v_user_id, COALESCE(v_profile.full_name, '학부모'), v_profile.email)
  RETURNING id INTO v_parent_id;

  RETURN v_parent_id;
END;
$$;

GRANT EXECUTE ON FUNCTION core.ensure_global_parent_profile() TO authenticated;

-- =============================================
-- Update parent RPCs: global parents, no org_members for portal
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

    UPDATE core.parent_invitations SET status = 'accepted', accepted_at = now() WHERE id = v_inv.id;

    v_connected := v_connected + 1;
    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'organization_id', v_inv.organization_id,
      'parent_customer_id', v_inv.parent_customer_id
    ));
  END LOOP;

  -- Legacy: link user_id on parent customers without invitation
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
    END LOOP;
  END IF;

  PERFORM core.ensure_global_parent_profile();

  RETURN jsonb_build_object('connected', v_connected, 'memberships', v_results);
END;
$$;
