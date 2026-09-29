-- 강사 월별 정산 확정 (조직 단위, owner-only — expenses/income과 동일)
-- 기존 localStorage-only 정산 확정을 Supabase SoT로 올린다.

CREATE TABLE IF NOT EXISTS core.teacher_payroll_settlements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  teacher_id          TEXT NOT NULL,
  year_month          TEXT NOT NULL
                        CHECK (year_month ~ '^[0-9]{4}-[0-9]{2}$'),
  pay_type            TEXT NOT NULL,
  quantity            NUMERIC(12, 2) NOT NULL DEFAULT 0,
  rate                NUMERIC(12, 2) NOT NULL DEFAULT 0,
  calculated_amount   NUMERIC(12, 2) NOT NULL CHECK (calculated_amount >= 0),
  adjustment_amount   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  adjustment_reason   TEXT,
  final_amount        NUMERIC(12, 2) NOT NULL CHECK (final_amount >= 0),
  confirmed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expense_id          UUID REFERENCES core.expenses(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teacher_payroll_settlements_org_teacher_month_uidx
    UNIQUE (organization_id, teacher_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_teacher_payroll_settlements_org_month
  ON core.teacher_payroll_settlements (organization_id, year_month);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON core.teacher_payroll_settlements
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE core.teacher_payroll_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY core_teacher_payroll_settlements_select
  ON core.teacher_payroll_settlements
  FOR SELECT TO authenticated
  USING (core.is_org_owner(organization_id));

CREATE POLICY core_teacher_payroll_settlements_insert
  ON core.teacher_payroll_settlements
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_owner(organization_id));

CREATE POLICY core_teacher_payroll_settlements_update
  ON core.teacher_payroll_settlements
  FOR UPDATE TO authenticated
  USING (core.is_org_owner(organization_id))
  WITH CHECK (core.is_org_owner(organization_id));

CREATE POLICY core_teacher_payroll_settlements_delete
  ON core.teacher_payroll_settlements
  FOR DELETE TO authenticated
  USING (core.is_org_owner(organization_id));
