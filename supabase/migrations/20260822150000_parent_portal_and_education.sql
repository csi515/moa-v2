-- Parent portal + piano education quality features

-- =============================================
-- EXTEND member_role
DO $$ BEGIN
  ALTER TYPE core.member_role ADD VALUE 'parent';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Link auth user to customer (parent)
ALTER TABLE core.customers
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES core.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_core_customers_user ON core.customers(user_id);

-- Parent customer on organization_members
ALTER TABLE core.organization_members
  ADD COLUMN IF NOT EXISTS parent_customer_id UUID REFERENCES core.customers(id) ON DELETE SET NULL;

-- =============================================
-- PARENT INVITATIONS
-- =============================================
CREATE TABLE core.parent_invitations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  parent_customer_id UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  role              core.member_role NOT NULL DEFAULT 'parent',
  invited_by        UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at       TIMESTAMPTZ,
  UNIQUE (organization_id, parent_customer_id)
);

CREATE INDEX idx_parent_invitations_email ON core.parent_invitations (lower(email), status);

ALTER TABLE core.parent_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY parent_invitations_select ON core.parent_invitations
  FOR SELECT TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR lower(email) = lower((SELECT email FROM core.profiles WHERE id = auth.uid()))
  );

CREATE POLICY parent_invitations_insert ON core.parent_invitations
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY parent_invitations_update ON core.parent_invitations
  FOR UPDATE TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY parent_invitations_delete ON core.parent_invitations
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- PARENT ↔ STUDENT LINKS
-- =============================================
CREATE TABLE core.parent_student_links (
  organization_id       UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  parent_customer_id    UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  student_customer_id   UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  relationship          TEXT NOT NULL DEFAULT 'parent',
  is_primary            BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_customer_id, student_customer_id)
);

CREATE INDEX idx_parent_student_links_student ON core.parent_student_links(student_customer_id);

ALTER TABLE core.parent_student_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY parent_student_links_select ON core.parent_student_links
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

CREATE POLICY parent_student_links_admin ON core.parent_student_links
  FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

-- =============================================
-- RLS HELPERS: parent scope
-- =============================================
CREATE OR REPLACE FUNCTION core.get_my_parent_customer_id(org_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT parent_customer_id
  FROM core.organization_members
  WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND role = 'parent'
    AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION core.is_org_parent(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT core.get_org_role(org_id) = 'parent';
$$;

CREATE OR REPLACE FUNCTION core.parent_owns_student(org_id UUID, student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM core.parent_student_links psl
    WHERE psl.organization_id = org_id
      AND psl.parent_customer_id = core.get_my_parent_customer_id(org_id)
      AND psl.student_customer_id = student_id
  );
$$;

GRANT EXECUTE ON FUNCTION core.get_my_parent_customer_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.is_org_parent(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.parent_owns_student(UUID, UUID) TO authenticated;

-- =============================================
-- PIANO: CURRICULUM
-- =============================================
CREATE TABLE piano.curriculum_levels (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  sort_order        INT NOT NULL DEFAULT 0,
  description       TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE piano.curriculum_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  level_id          UUID NOT NULL REFERENCES piano.curriculum_levels(id) ON DELETE CASCADE,
  song_id           UUID REFERENCES piano.songs(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  sort_order        INT NOT NULL DEFAULT 0,
  required          BOOLEAN NOT NULL DEFAULT true,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE piano.student_curriculum_progress (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  curriculum_item_id UUID NOT NULL REFERENCES piano.curriculum_items(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'not_started'
                      CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completed_at      TIMESTAMPTZ,
  notes             TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, curriculum_item_id)
);

-- =============================================
-- PIANO: WEEKLY ASSIGNMENTS
-- =============================================
CREATE TABLE piano.weekly_assignments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  staff_id          UUID REFERENCES core.staff(id) ON DELETE SET NULL,
  week_start        DATE NOT NULL,
  title             TEXT,
  status            TEXT NOT NULL DEFAULT 'assigned'
                      CHECK (status IN ('assigned', 'in_progress', 'submitted', 'reviewed')),
  teacher_notes     TEXT,
  parent_notes      TEXT,
  due_date          DATE,
  published_at      TIMESTAMPTZ,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, week_start)
);

CREATE TABLE piano.assignment_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id     UUID NOT NULL REFERENCES piano.weekly_assignments(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  song_title        TEXT NOT NULL,
  target_minutes    INT,
  instructions      TEXT NOT NULL DEFAULT '',
  sort_order        INT NOT NULL DEFAULT 0,
  parent_confirmed  BOOLEAN NOT NULL DEFAULT false,
  parent_confirmed_at TIMESTAMPTZ,
  completed         BOOLEAN NOT NULL DEFAULT false,
  completed_at      TIMESTAMPTZ,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- PIANO: ACHIEVEMENTS (exams, competitions, grades)
-- =============================================
CREATE TABLE piano.achievements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  type              TEXT NOT NULL
                      CHECK (type IN ('exam', 'competition', 'certificate', 'grade', 'recital', 'other')),
  title             TEXT NOT NULL,
  event_date        DATE,
  result            TEXT,
  level_label       TEXT,
  song_title        TEXT,
  certificate_url   TEXT,
  staff_id          UUID REFERENCES core.staff(id) ON DELETE SET NULL,
  memo              TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- PIANO: LEARNING REPORTS
-- =============================================
CREATE TABLE piano.learning_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  staff_id          UUID REFERENCES core.staff(id) ON DELETE SET NULL,
  year_month        TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'published', 'archived')),
  summary           TEXT,
  strengths         TEXT,
  improvements      TEXT,
  goals_next_month  TEXT,
  attendance_rate   NUMERIC(5,2),
  practice_minutes  INT,
  lessons_count     INT,
  songs_completed   INT,
  published_at      TIMESTAMPTZ,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, year_month)
);

-- Triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON piano.curriculum_levels
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON piano.curriculum_items
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON piano.student_curriculum_progress
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON piano.weekly_assignments
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON piano.achievements
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON piano.learning_reports
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- =============================================
-- PARENT RPCs
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
  v_member_id UUID;
  v_invitation_id UUID;
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

  IF v_parent.user_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'connected', 'parent_customer_id', p_parent_customer_id, 'user_id', v_parent.user_id);
  END IF;

  SELECT id INTO v_profile_id FROM core.profiles WHERE lower(email) = v_email LIMIT 1;

  IF v_profile_id IS NOT NULL THEN
    UPDATE core.customers SET user_id = v_profile_id, updated_at = now()
    WHERE id = p_parent_customer_id;

    INSERT INTO core.organization_members (organization_id, user_id, role, parent_customer_id)
    VALUES (p_org_id, v_profile_id, 'parent', p_parent_customer_id)
    ON CONFLICT (organization_id, user_id)
    DO UPDATE SET role = 'parent', parent_customer_id = EXCLUDED.parent_customer_id, is_active = true, updated_at = now()
    RETURNING id INTO v_member_id;

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
  v_connected INT := 0;
  v_results JSONB := '[]'::JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('connected', 0, 'memberships', v_results); END IF;

  SELECT email INTO v_email FROM core.profiles WHERE id = v_user_id;
  IF v_email IS NULL OR trim(v_email) = '' THEN
    RETURN jsonb_build_object('connected', 0, 'memberships', v_results);
  END IF;

  FOR v_inv IN
    SELECT * FROM core.parent_invitations
    WHERE lower(email) = lower(v_email) AND status = 'pending'
  LOOP
    UPDATE core.customers SET user_id = v_user_id, updated_at = now()
    WHERE id = v_inv.parent_customer_id AND organization_id = v_inv.organization_id;

    INSERT INTO core.organization_members (organization_id, user_id, role, parent_customer_id)
    VALUES (v_inv.organization_id, v_user_id, 'parent', v_inv.parent_customer_id)
    ON CONFLICT (organization_id, user_id)
    DO UPDATE SET role = 'parent', parent_customer_id = EXCLUDED.parent_customer_id, is_active = true, updated_at = now();

    UPDATE core.parent_invitations SET status = 'accepted', accepted_at = now() WHERE id = v_inv.id;

    v_connected := v_connected + 1;
    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'organization_id', v_inv.organization_id,
      'parent_customer_id', v_inv.parent_customer_id
    ));
  END LOOP;

  RETURN jsonb_build_object('connected', v_connected, 'memberships', v_results);
END;
$$;

CREATE OR REPLACE FUNCTION core.revoke_parent_invitation(p_org_id UUID, p_parent_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  UPDATE core.parent_invitations SET status = 'revoked'
  WHERE organization_id = p_org_id AND parent_customer_id = p_parent_customer_id AND status = 'pending';
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION core.get_parent_account_statuses(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER STABLE
SET search_path = core, public
AS $$
DECLARE v_result JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(t)::JSONB), '[]'::JSONB) INTO v_result
  FROM (
    SELECT c.id AS parent_customer_id,
      CASE WHEN c.user_id IS NOT NULL THEN 'connected'
           WHEN pi.status = 'pending' THEN 'invited' ELSE 'none' END AS status,
      c.email, pi.created_at AS invited_at
    FROM core.customers c
    LEFT JOIN core.parent_invitations pi ON pi.parent_customer_id = c.id AND pi.organization_id = c.organization_id AND pi.status = 'pending'
    WHERE c.organization_id = p_org_id AND c.metadata->>'entityType' = 'parent'
  ) t;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION core.invite_parent_member(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.connect_parent_on_login() TO authenticated;
GRANT EXECUTE ON FUNCTION core.revoke_parent_invitation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.get_parent_account_statuses(UUID) TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.parent_invitations TO authenticated;

-- =============================================
-- RLS: Education tables (admin/staff write, parent read own children)
-- =============================================
ALTER TABLE piano.curriculum_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE piano.curriculum_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE piano.student_curriculum_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE piano.weekly_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE piano.assignment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE piano.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE piano.learning_reports ENABLE ROW LEVEL SECURITY;

-- Curriculum levels/items: admin manage, all members read
CREATE POLICY curriculum_levels_select ON piano.curriculum_levels FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));
CREATE POLICY curriculum_levels_admin ON piano.curriculum_levels FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id)) WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY curriculum_items_select ON piano.curriculum_items FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));
CREATE POLICY curriculum_items_admin ON piano.curriculum_items FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id)) WITH CHECK (core.is_org_admin(organization_id));

-- Student-scoped tables
CREATE POLICY curriculum_progress_select ON piano.student_curriculum_progress FOR SELECT TO authenticated
  USING (core.is_org_admin(organization_id) OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)) OR core.parent_owns_student(organization_id, customer_id));
CREATE POLICY curriculum_progress_write ON piano.student_curriculum_progress FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id) OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)))
  WITH CHECK (core.is_org_admin(organization_id) OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)));

CREATE POLICY weekly_assignments_select ON piano.weekly_assignments FOR SELECT TO authenticated
  USING (core.is_org_admin(organization_id) OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)) OR core.parent_owns_student(organization_id, customer_id));
CREATE POLICY weekly_assignments_write ON piano.weekly_assignments FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id) OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)))
  WITH CHECK (core.is_org_admin(organization_id) OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)));
CREATE POLICY weekly_assignments_parent_update ON piano.weekly_assignments FOR UPDATE TO authenticated
  USING (core.parent_owns_student(organization_id, customer_id))
  WITH CHECK (core.parent_owns_student(organization_id, customer_id));

CREATE POLICY assignment_items_select ON piano.assignment_items FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));
CREATE POLICY assignment_items_write ON piano.assignment_items FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id) OR EXISTS (
    SELECT 1 FROM piano.weekly_assignments wa WHERE wa.id = assignment_id
      AND core.rls_staff_or_admin(wa.organization_id, core.staff_owns_customer(wa.organization_id, wa.customer_id))
  )) WITH CHECK (core.is_org_admin(organization_id) OR EXISTS (
    SELECT 1 FROM piano.weekly_assignments wa WHERE wa.id = assignment_id
      AND core.rls_staff_or_admin(wa.organization_id, core.staff_owns_customer(wa.organization_id, wa.customer_id))
  ));
CREATE POLICY assignment_items_parent_update ON piano.assignment_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM piano.weekly_assignments wa WHERE wa.id = assignment_id
      AND core.parent_owns_student(wa.organization_id, wa.customer_id)
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM piano.weekly_assignments wa WHERE wa.id = assignment_id
      AND core.parent_owns_student(wa.organization_id, wa.customer_id)
  ));

CREATE POLICY achievements_select ON piano.achievements FOR SELECT TO authenticated
  USING (core.is_org_admin(organization_id) OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)) OR core.parent_owns_student(organization_id, customer_id));
CREATE POLICY achievements_write ON piano.achievements FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id) OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)))
  WITH CHECK (core.is_org_admin(organization_id) OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)));

CREATE POLICY learning_reports_select ON piano.learning_reports FOR SELECT TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
    OR (core.parent_owns_student(organization_id, customer_id) AND status = 'published')
  );
CREATE POLICY learning_reports_write ON piano.learning_reports FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id) OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)))
  WITH CHECK (core.is_org_admin(organization_id) OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)));
