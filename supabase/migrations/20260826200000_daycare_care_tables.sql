-- Daycare plugin: care journals + medication requests (core schema)

-- =============================================
-- CARE JOURNALS (알림장)
-- =============================================
CREATE TABLE IF NOT EXISTS core.care_journals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  journal_date      DATE NOT NULL,
  mood              TEXT NOT NULL DEFAULT 'normal'
                      CHECK (mood IN ('good', 'normal', 'tired', 'sick')),
  meals             TEXT NOT NULL DEFAULT '',
  nap               TEXT NOT NULL DEFAULT '',
  activities        TEXT NOT NULL DEFAULT '',
  bowel             TEXT,
  health_note       TEXT,
  teacher_note      TEXT NOT NULL DEFAULT '',
  staff_id          UUID REFERENCES core.staff(id) ON DELETE SET NULL,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, customer_id, journal_date)
);

CREATE INDEX IF NOT EXISTS idx_care_journals_org_date
  ON core.care_journals(organization_id, journal_date DESC);

CREATE INDEX IF NOT EXISTS idx_care_journals_customer
  ON core.care_journals(organization_id, customer_id, journal_date DESC);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.care_journals
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- =============================================
-- MEDICATION REQUESTS (투약 의뢰)
-- =============================================
CREATE TABLE IF NOT EXISTS core.medication_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  request_date      DATE NOT NULL,
  medicine_name     TEXT NOT NULL,
  dosage            TEXT NOT NULL DEFAULT '',
  times             TEXT NOT NULL DEFAULT '',
  reason            TEXT NOT NULL DEFAULT '',
  guardian_name     TEXT,
  status            TEXT NOT NULL DEFAULT 'requested'
                      CHECK (status IN ('requested', 'administered', 'cancelled')),
  administered_at   TIMESTAMPTZ,
  administered_by   TEXT,
  note              TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medication_requests_org_date
  ON core.medication_requests(organization_id, request_date DESC);

CREATE INDEX IF NOT EXISTS idx_medication_requests_customer
  ON core.medication_requests(organization_id, customer_id, request_date DESC);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.medication_requests
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- =============================================
-- RLS
-- =============================================
ALTER TABLE core.care_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.medication_requests ENABLE ROW LEVEL SECURITY;

-- Care journals: staff write, parent read own children
CREATE POLICY care_journals_select ON core.care_journals
  FOR SELECT TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
    OR core.parent_owns_student(organization_id, customer_id)
  );

CREATE POLICY care_journals_write ON core.care_journals
  FOR ALL TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
  )
  WITH CHECK (
    core.is_org_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
  );

-- Medication: staff manage, parent read + create for own children
CREATE POLICY medication_requests_select ON core.medication_requests
  FOR SELECT TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
    OR core.parent_owns_student(organization_id, customer_id)
  );

CREATE POLICY medication_requests_staff_write ON core.medication_requests
  FOR ALL TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
  )
  WITH CHECK (
    core.is_org_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
  );

CREATE POLICY medication_requests_parent_insert ON core.medication_requests
  FOR INSERT TO authenticated
  WITH CHECK (core.parent_owns_student(organization_id, customer_id));

CREATE POLICY medication_requests_parent_update ON core.medication_requests
  FOR UPDATE TO authenticated
  USING (
    core.parent_owns_student(organization_id, customer_id)
    AND status = 'requested'
  )
  WITH CHECK (core.parent_owns_student(organization_id, customer_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON core.care_journals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.medication_requests TO authenticated;
