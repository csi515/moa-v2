-- Phase 6: Piano expenses table

CREATE TABLE piano.expenses (
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

CREATE INDEX idx_piano_expenses_org_date ON piano.expenses(organization_id, expense_date);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON piano.expenses
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- RLS
ALTER TABLE piano.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY piano_expenses_select ON piano.expenses
  FOR SELECT USING (core.is_org_member(organization_id));
CREATE POLICY piano_expenses_insert ON piano.expenses
  FOR INSERT WITH CHECK (core.is_org_member(organization_id));
CREATE POLICY piano_expenses_update ON piano.expenses
  FOR UPDATE USING (core.is_org_member(organization_id));
CREATE POLICY piano_expenses_delete ON piano.expenses
  FOR DELETE USING (core.is_org_member(organization_id));
