-- Core Availability rules (generic; industry labels live in app layer)
-- Materialized bookable slots reuse core.schedules + existing reservation RPCs

BEGIN;

CREATE TABLE IF NOT EXISTS core.availability_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  staff_id          UUID REFERENCES core.staff(id) ON DELETE SET NULL,
  day_of_week       SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  slot_minutes      INT NOT NULL DEFAULT 30 CHECK (slot_minutes IN (15, 20, 30, 45, 60)),
  title             TEXT NOT NULL DEFAULT '상담',
  max_capacity      INT NOT NULL DEFAULT 1 CHECK (max_capacity >= 1),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT availability_rules_ends_after_starts CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS core.availability_overrides (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  staff_id          UUID REFERENCES core.staff(id) ON DELETE SET NULL,
  override_date     DATE NOT NULL,
  is_closed         BOOLEAN NOT NULL DEFAULT false,
  start_time        TIME,
  end_time          TIME,
  slot_minutes      INT CHECK (slot_minutes IS NULL OR slot_minutes IN (15, 20, 30, 45, 60)),
  title             TEXT,
  max_capacity      INT CHECK (max_capacity IS NULL OR max_capacity >= 1),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  reason            TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT availability_override_window_valid CHECK (
    is_closed = true
    OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);

CREATE INDEX IF NOT EXISTS idx_availability_rules_org
  ON core.availability_rules(organization_id, is_active, day_of_week);

CREATE INDEX IF NOT EXISTS idx_availability_overrides_org_date
  ON core.availability_overrides(organization_id, override_date, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS uq_availability_rules_org_dow_window
  ON core.availability_rules (organization_id, day_of_week, start_time, end_time)
  WHERE is_active = true AND staff_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_availability_overrides_org_date
  ON core.availability_overrides (organization_id, override_date)
  WHERE is_active = true AND staff_id IS NULL;

DROP TRIGGER IF EXISTS update_availability_rules_updated_at ON core.availability_rules;
CREATE TRIGGER update_availability_rules_updated_at
  BEFORE UPDATE ON core.availability_rules
  FOR EACH ROW
  EXECUTE FUNCTION core.set_updated_at();

DROP TRIGGER IF EXISTS update_availability_overrides_updated_at ON core.availability_overrides;
CREATE TRIGGER update_availability_overrides_updated_at
  BEFORE UPDATE ON core.availability_overrides
  FOR EACH ROW
  EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE core.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.availability_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS availability_rules_select ON core.availability_rules;
CREATE POLICY availability_rules_select ON core.availability_rules
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_admin(organization_id));

DROP POLICY IF EXISTS availability_rules_admin ON core.availability_rules;
CREATE POLICY availability_rules_admin ON core.availability_rules
  FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

DROP POLICY IF EXISTS availability_overrides_select ON core.availability_overrides;
CREATE POLICY availability_overrides_select ON core.availability_overrides
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_admin(organization_id));

DROP POLICY IF EXISTS availability_overrides_admin ON core.availability_overrides;
CREATE POLICY availability_overrides_admin ON core.availability_overrides
  FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

COMMENT ON TABLE core.availability_rules IS '반복 가능 시간(요일 윈도우). 업종 라벨은 앱 레이어에서 주입';
COMMENT ON TABLE core.availability_overrides IS '특정 날짜 가능시간 예외(닫힘 또는 커스텀 윈도우)';

COMMIT;
