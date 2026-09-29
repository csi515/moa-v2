-- Core finance: expenses + income entries (all industries, owner-only)

-- =============================================
-- RLS HELPER: owner only
-- =============================================

CREATE OR REPLACE FUNCTION core.is_org_owner(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT core.get_org_role(org_id) = 'owner';
$$;

GRANT EXECUTE ON FUNCTION core.is_org_owner(UUID) TO authenticated;

-- =============================================
-- CORE EXPENSES
-- =============================================

CREATE TABLE core.expenses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  expense_date      DATE NOT NULL,
  category          TEXT NOT NULL,
  amount            NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  payment_method    core.payment_method NOT NULL DEFAULT 'cash',
  description       TEXT NOT NULL DEFAULT '',
  recipient         TEXT,
  vendor            TEXT,
  memo              TEXT,
  receipt_memo      TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_core_expenses_org_date ON core.expenses(organization_id, expense_date);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.expenses
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- =============================================
-- CORE INCOME ENTRIES
-- =============================================

CREATE TABLE core.income_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  income_date       DATE NOT NULL,
  category          TEXT NOT NULL,
  amount            NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  payment_method    core.payment_method NOT NULL DEFAULT 'cash',
  description       TEXT NOT NULL DEFAULT '',
  payer             TEXT,
  memo              TEXT,
  source_type       TEXT NOT NULL DEFAULT 'manual',
  source_id         UUID,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_core_income_org_date ON core.income_entries(organization_id, income_date);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.income_entries
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- =============================================
-- MIGRATE piano.expenses → core.expenses
-- =============================================

INSERT INTO core.expenses (
  id, organization_id, expense_date, category, amount, payment_method,
  description, recipient, vendor, memo, receipt_memo, metadata, created_at, updated_at
)
SELECT
  id, organization_id, expense_date, category, amount, payment_method,
  description, recipient, vendor, memo, receipt_memo, metadata, created_at, updated_at
FROM piano.expenses
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- RLS: owner only
-- =============================================

ALTER TABLE core.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.income_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY core_expenses_select ON core.expenses
  FOR SELECT TO authenticated
  USING (core.is_org_owner(organization_id));

CREATE POLICY core_expenses_insert ON core.expenses
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_owner(organization_id));

CREATE POLICY core_expenses_update ON core.expenses
  FOR UPDATE TO authenticated
  USING (core.is_org_owner(organization_id))
  WITH CHECK (core.is_org_owner(organization_id));

CREATE POLICY core_expenses_delete ON core.expenses
  FOR DELETE TO authenticated
  USING (core.is_org_owner(organization_id));

CREATE POLICY core_income_select ON core.income_entries
  FOR SELECT TO authenticated
  USING (core.is_org_owner(organization_id));

CREATE POLICY core_income_insert ON core.income_entries
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_owner(organization_id));

CREATE POLICY core_income_update ON core.income_entries
  FOR UPDATE TO authenticated
  USING (core.is_org_owner(organization_id))
  WITH CHECK (core.is_org_owner(organization_id));

CREATE POLICY core_income_delete ON core.income_entries
  FOR DELETE TO authenticated
  USING (core.is_org_owner(organization_id));
