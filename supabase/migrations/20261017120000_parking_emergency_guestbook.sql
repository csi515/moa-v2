-- ==============================================================================
-- Moa-v2 Capability Expansion: 3 New Domain Engines
-- 1) parking_validator (고객 무료 주차 등록 & 상가 주차권 정산기)
-- 2) emergency_alert_broadcast (긴급 휴원·재난 공지 & 모바일 수신확인 대장)
-- 3) digital_guestbook (오프라인 내방객 전자 방명록 & 마케팅 동의기)
-- ==============================================================================

-- 1. Parking Batches & Registrations
CREATE TABLE IF NOT EXISTS core.parking_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  batch_name text NOT NULL,
  ticket_type text NOT NULL DEFAULT '1hour', -- '30min', '1hour', '2hour', '3hour', 'allday'
  allocated_minutes integer NOT NULL DEFAULT 60,
  unit_cost integer NOT NULL DEFAULT 1000,
  purchased_quantity integer NOT NULL DEFAULT 100 CHECK (purchased_quantity >= 0),
  used_quantity integer NOT NULL DEFAULT 0 CHECK (used_quantity >= 0),
  purchased_date date NOT NULL DEFAULT CURRENT_DATE,
  expires_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.parking_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES core.parking_batches(id) ON DELETE SET NULL,
  vehicle_number text NOT NULL,
  visitor_name text NOT NULL,
  visitor_role text NOT NULL DEFAULT 'student',
  purpose text NOT NULL DEFAULT 'lesson',
  registered_at timestamptz NOT NULL DEFAULT now(),
  free_minutes integer NOT NULL DEFAULT 60,
  tickets_used integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active', -- 'active', 'exited', 'cancelled'
  memo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Emergency Broadcasts & Confirmation Receipts
CREATE TABLE IF NOT EXISTS core.emergency_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  emergency_type text NOT NULL DEFAULT 'weather', -- 'weather', 'facility_failure', 'epidemic', 'safety_alert', 'other'
  severity text NOT NULL DEFAULT 'warning', -- 'advisory', 'warning', 'critical'
  effective_start timestamptz NOT NULL DEFAULT now(),
  effective_end timestamptz,
  closure_reason text NOT NULL,
  makeup_policy_notice text,
  target_audience text NOT NULL DEFAULT 'all',
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.emergency_broadcast_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  broadcast_id uuid NOT NULL REFERENCES core.emergency_broadcasts(id) ON DELETE CASCADE,
  recipient_name text NOT NULL,
  recipient_phone text,
  recipient_role text NOT NULL DEFAULT 'guardian',
  is_acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Digital Guestbook Entries
CREATE TABLE IF NOT EXISTS core.digital_guestbook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  visitor_name text NOT NULL,
  phone text NOT NULL,
  visit_purpose text NOT NULL DEFAULT 'consultation', -- 'consultation', 'open_house', 'trial_inquiry', 'event_guest', 'walk_in'
  interested_program text,
  referral_source text,
  privacy_agreed boolean NOT NULL DEFAULT true,
  marketing_agreed boolean NOT NULL DEFAULT false,
  signature_svg text,
  assigned_staff_name text,
  notes text,
  status text NOT NULL DEFAULT 'checked_in', -- 'checked_in', 'consulting', 'converted', 'closed'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================================================================
-- Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_parking_batches_org ON core.parking_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_parking_registrations_org ON core.parking_registrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_parking_registrations_vehicle ON core.parking_registrations(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_emergency_broadcasts_org ON core.emergency_broadcasts(organization_id);
CREATE INDEX IF NOT EXISTS idx_emergency_broadcast_receipts_bc ON core.emergency_broadcast_receipts(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_digital_guestbook_entries_org ON core.digital_guestbook_entries(organization_id);

-- ==============================================================================
-- RLS (Row Level Security)
-- ==============================================================================
ALTER TABLE core.parking_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.parking_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.emergency_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.emergency_broadcast_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.digital_guestbook_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_parking_batches_all') THEN
    CREATE POLICY org_parking_batches_all ON core.parking_batches
      FOR ALL USING (core.is_org_member(organization_id)) WITH CHECK (core.is_org_member(organization_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_parking_registrations_all') THEN
    CREATE POLICY org_parking_registrations_all ON core.parking_registrations
      FOR ALL USING (core.is_org_member(organization_id)) WITH CHECK (core.is_org_member(organization_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_emergency_broadcasts_all') THEN
    CREATE POLICY org_emergency_broadcasts_all ON core.emergency_broadcasts
      FOR ALL USING (core.is_org_member(organization_id)) WITH CHECK (core.is_org_member(organization_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_emergency_broadcast_receipts_all') THEN
    CREATE POLICY org_emergency_broadcast_receipts_all ON core.emergency_broadcast_receipts
      FOR ALL USING (core.is_org_member(organization_id)) WITH CHECK (core.is_org_member(organization_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_digital_guestbook_entries_all') THEN
    CREATE POLICY org_digital_guestbook_entries_all ON core.digital_guestbook_entries
      FOR ALL USING (core.is_org_member(organization_id)) WITH CHECK (core.is_org_member(organization_id));
  END IF;
END $$;
