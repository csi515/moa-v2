-- Ops Capability persistence: rental, lifecycle, maintenance, safety, sop, hygiene, seat_rooms
-- nullable department_id for enterprise scope (1인 매장은 NULL)

BEGIN;

CREATE TABLE IF NOT EXISTS core.seat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  department_id UUID NULL REFERENCES core.departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  capacity INT NOT NULL DEFAULT 1 CHECK (capacity > 0),
  status TEXT NOT NULL DEFAULT 'available',
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.rental_equipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  department_id UUID NULL REFERENCES core.departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  asset_tag TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  current_renter_id TEXT,
  rented_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  damage_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.equipment_lifecycle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  department_id UUID NULL REFERENCES core.departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  serial_no TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'in_service',
  purchased_at DATE,
  next_service_at DATE,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.maintenance_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  department_id UUID NULL REFERENCES core.departments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.safety_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  department_id UUID NULL REFERENCES core.departments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.safety_consent_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  consent_id TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.sop_risk_assessment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  department_id UUID NULL REFERENCES core.departments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  hazard_level TEXT NOT NULL DEFAULT 'medium',
  controls JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.hygiene_haccp_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  department_id UUID NULL REFERENCES core.departments(id) ON DELETE SET NULL,
  checkpoint TEXT NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  value TEXT NOT NULL DEFAULT '',
  passed BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE core.space_turnarounds
  ADD COLUMN IF NOT EXISTS department_id UUID NULL REFERENCES core.departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_seat_rooms_org ON core.seat_rooms (organization_id);
CREATE INDEX IF NOT EXISTS idx_rental_equipments_org ON core.rental_equipments (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_equipment_lifecycle_org ON core.equipment_lifecycle (organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_checklists_org ON core.maintenance_checklists (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_safety_consents_org ON core.safety_consents (organization_id);
CREATE INDEX IF NOT EXISTS idx_sop_risk_org ON core.sop_risk_assessment (organization_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_haccp_org ON core.hygiene_haccp_log (organization_id, measured_at DESC);

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'seat_rooms', 'rental_equipments', 'equipment_lifecycle',
    'maintenance_checklists', 'safety_consents', 'safety_consent_signatures',
    'sop_risk_assessment', 'hygiene_haccp_log'
  ]
  LOOP
    EXECUTE format('ALTER TABLE core.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_member_all ON core.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_member_all ON core.%I FOR ALL TO authenticated USING (core.is_org_member(organization_id)) WITH CHECK (core.is_org_member(organization_id))',
      t, t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON core.%I TO authenticated', t);
  END LOOP;
END $$;

COMMIT;
