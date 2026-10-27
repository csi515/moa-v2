-- ==============================================================================
-- Moa-v2 Enterprise Paradigm Shift Migration
-- 1. Range Exclusion Constraint with btree_gist for Double Booking Prevention
-- 2. Append-Only Immutable Financial Ledger (core.financial_ledgers)
-- 3. Universal Activity Stream (core.activities)
-- 4. Full-Text Search tsvector & GIN Indices on customers, products, workplace_policies
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TSTZRANGE & Range Exclusion Constraints
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1.1 core.room_reservations time_slot 컬럼 및 동기화 트리거
ALTER TABLE core.room_reservations
  ADD COLUMN IF NOT EXISTS time_slot TSTZRANGE;

UPDATE core.room_reservations
  SET time_slot = tstzrange(starts_at, ends_at, '[)')
  WHERE time_slot IS NULL AND starts_at IS NOT NULL AND ends_at IS NOT NULL;

CREATE OR REPLACE FUNCTION core.sync_room_reservation_timeslot()
RETURNS TRIGGER AS $$
BEGIN
  NEW.time_slot := tstzrange(NEW.starts_at, NEW.ends_at, '[)');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_room_reservation_timeslot ON core.room_reservations;
CREATE TRIGGER trg_sync_room_reservation_timeslot
  BEFORE INSERT OR UPDATE OF starts_at, ends_at ON core.room_reservations
  FOR EACH ROW EXECUTE FUNCTION core.sync_room_reservation_timeslot();

-- 기존 제약 조건 교체 (no_double_booking 배타 제약)
ALTER TABLE core.room_reservations
  DROP CONSTRAINT IF EXISTS room_reservations_no_overlap,
  DROP CONSTRAINT IF EXISTS no_double_booking;

ALTER TABLE core.room_reservations
  ADD CONSTRAINT no_double_booking
  EXCLUDE USING gist (
    room_id WITH =,
    time_slot WITH &&
  )
  WHERE (status IN ('pending', 'approved'));

-- 1.2 범용 자원 예약 테이블 (core.resource_reservations)
CREATE TABLE IF NOT EXISTS core.resource_reservations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  resource_id     UUID NOT NULL REFERENCES core.bookable_resources(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES core.customers(id) ON DELETE SET NULL,
  requested_by    UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
  time_slot       TSTZRANGE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  memo            TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_resource_double_booking EXCLUDE USING gist (
    resource_id WITH =,
    time_slot WITH &&
  ) WHERE (status <> 'cancelled')
);

CREATE INDEX IF NOT EXISTS idx_resource_reservations_org_res
  ON core.resource_reservations (organization_id, resource_id);

CREATE INDEX IF NOT EXISTS idx_resource_reservations_time_slot
  ON core.resource_reservations USING gist (time_slot);

ALTER TABLE core.resource_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resource_reservations_select ON core.resource_reservations;
CREATE POLICY resource_reservations_select ON core.resource_reservations
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_owner_or_admin(organization_id));

DROP POLICY IF EXISTS resource_reservations_write ON core.resource_reservations;
CREATE POLICY resource_reservations_write ON core.resource_reservations
  FOR ALL TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_owner_or_admin(organization_id))
  WITH CHECK (core.is_org_member(organization_id) OR core.is_org_owner_or_admin(organization_id));

-- ------------------------------------------------------------------------------
-- 2. Append-Only Immutable Financial Ledger (core.financial_ledgers)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.financial_ledgers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  account_type          TEXT NOT NULL, -- 'points', 'deposit', 'ar_receivable', 'deferred_revenue'
  reference_entity_type TEXT NOT NULL, -- 'customer', 'order', 'contract', 'settlement'
  reference_entity_id   TEXT NOT NULL,
  entry_type            TEXT NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
  amount                NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  balance_after         NUMERIC(15, 2) NOT NULL,
  description           TEXT NOT NULL,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_ledgers_org_ref
  ON core.financial_ledgers (organization_id, reference_entity_type, reference_entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_ledgers_account_type
  ON core.financial_ledgers (organization_id, account_type, created_at DESC);

-- 불변성 강제: UPDATE 및 DELETE 시도 시 즉시 예외 발생
CREATE OR REPLACE FUNCTION core.prevent_financial_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Financial ledger entries are strictly immutable. UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_financial_ledger_mutation ON core.financial_ledgers;
CREATE TRIGGER trg_prevent_financial_ledger_mutation
  BEFORE UPDATE OR DELETE ON core.financial_ledgers
  FOR EACH ROW EXECUTE FUNCTION core.prevent_financial_ledger_mutation();

ALTER TABLE core.financial_ledgers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financial_ledgers_select ON core.financial_ledgers;
CREATE POLICY financial_ledgers_select ON core.financial_ledgers
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_owner_or_admin(organization_id));

DROP POLICY IF EXISTS financial_ledgers_insert ON core.financial_ledgers;
CREATE POLICY financial_ledgers_insert ON core.financial_ledgers
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_member(organization_id) OR core.is_org_owner_or_admin(organization_id));

-- ------------------------------------------------------------------------------
-- 3. Universal Activity Stream (core.activities)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  actor_id        UUID,
  actor_name      TEXT NOT NULL,
  target_type     TEXT NOT NULL, -- 'customer', 'project', 'task', 'contract', 'expense', etc.
  target_id       TEXT NOT NULL,
  activity_type   TEXT NOT NULL, -- 'created', 'updated', 'status_changed', 'consultation', 'payment', 'attendance', 'signed'
  title           TEXT NOT NULL,
  content         TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_org_target
  ON core.activities (organization_id, target_type, target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activities_org_created
  ON core.activities (organization_id, created_at DESC);

ALTER TABLE core.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activities_select ON core.activities;
CREATE POLICY activities_select ON core.activities
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_owner_or_admin(organization_id));

DROP POLICY IF EXISTS activities_insert ON core.activities;
CREATE POLICY activities_insert ON core.activities
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_member(organization_id) OR core.is_org_owner_or_admin(organization_id));

-- ------------------------------------------------------------------------------
-- 4. Full-Text Search tsvector & GIN Indices
-- ------------------------------------------------------------------------------

-- 4.1 core.customers
ALTER TABLE core.customers
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(name, '') || ' ' ||
      coalesce(phone, '') || ' ' ||
      coalesce(metadata->>'school', '') || ' ' ||
      coalesce(memo, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_customers_search_vector
  ON core.customers USING gin (search_vector);

-- 4.2 core.products
ALTER TABLE core.products
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(name, '') || ' ' ||
      coalesce(product_code, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_products_search_vector
  ON core.products USING gin (search_vector);

-- 4.3 core.workplace_policies
ALTER TABLE core.workplace_policies
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title, '') || ' ' ||
      coalesce(content, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_workplace_policies_search_vector
  ON core.workplace_policies USING gin (search_vector);
