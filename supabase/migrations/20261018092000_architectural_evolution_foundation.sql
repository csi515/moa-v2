-- ==============================================================================
-- Migration: 20261018092000_architectural_evolution_foundation.sql
-- Description: Moa-v2 5대 엔터프라이즈 구조적 패러다임 전환 기반 스키마
--              1. 시간 범위 TSTZRANGE 배타 제약 (Range Exclusion Constraint)
--              2. 불변 복식부기 원장 (Append-Only Immutable Ledger)
--              3. 선언적 FSM 상태 전이 감사 로그 (FSM Transition Logs)
--              4. 전사 단일 활동 스트림 (Universal Activity Stream)
--              5. 전사 전문 검색 (tsvector Generated Columns + GIN)
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ------------------------------------------------------------------------------
-- 1. 시간 범위 TSTZRANGE 배타 제약 (자원 예약 중복 원천 차단)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS core.bookable_resource_reservations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  resource_id     UUID NOT NULL REFERENCES core.bookable_resources(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES core.customers(id) ON DELETE SET NULL,
  requested_by    UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
  time_slot       TSTZRANGE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'confirmed'
                    CHECK (status IN ('requested', 'confirmed', 'cancelled', 'completed')),
  memo            TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT no_double_resource_booking EXCLUDE USING gist (
    resource_id WITH =,
    time_slot WITH &&
  ) WHERE (status IN ('requested', 'confirmed'))
);

CREATE INDEX IF NOT EXISTS idx_res_reservations_org_time
  ON core.bookable_resource_reservations USING gist (time_slot);

CREATE INDEX IF NOT EXISTS idx_res_reservations_org_resource
  ON core.bookable_resource_reservations (organization_id, resource_id);

ALTER TABLE core.bookable_resource_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view resource reservations" ON core.bookable_resource_reservations;
CREATE POLICY "Members can view resource reservations"
  ON core.bookable_resource_reservations
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT m.organization_id FROM core.organization_members m WHERE m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can insert resource reservations" ON core.bookable_resource_reservations;
CREATE POLICY "Members can insert resource reservations"
  ON core.bookable_resource_reservations
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT m.organization_id FROM core.organization_members m WHERE m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update resource reservations" ON core.bookable_resource_reservations;
CREATE POLICY "Members can update resource reservations"
  ON core.bookable_resource_reservations
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT m.organization_id FROM core.organization_members m WHERE m.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------------------
-- 2. 불변 복식부기 원장 (Append-Only Immutable Ledger)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS core.financial_ledgers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  account_type          TEXT NOT NULL
                          CHECK (account_type IN ('point', 'deposit', 'receivable', 'deferred_revenue', 'general')),
  reference_entity_type TEXT NOT NULL, -- 'customer', 'vendor', 'order', 'invoice'
  reference_entity_id   UUID NOT NULL,
  entry_type            TEXT NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
  amount                NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  balance_after         NUMERIC(15, 2) NOT NULL,
  description           TEXT NOT NULL,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
  -- UPDATE 및 DELETE는 원칙적으로 금지(Append-Only)
);

CREATE INDEX IF NOT EXISTS idx_financial_ledgers_lookup
  ON core.financial_ledgers (organization_id, account_type, reference_entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_ledgers_metadata_gin
  ON core.financial_ledgers USING gin (metadata jsonb_path_ops);

ALTER TABLE core.financial_ledgers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view financial ledgers" ON core.financial_ledgers;
CREATE POLICY "Members can view financial ledgers"
  ON core.financial_ledgers
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT m.organization_id FROM core.organization_members m WHERE m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can insert financial ledgers" ON core.financial_ledgers;
CREATE POLICY "Members can insert financial ledgers"
  ON core.financial_ledgers
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT m.organization_id FROM core.organization_members m WHERE m.user_id = auth.uid()
    )
  );
-- (UPDATE 및 DELETE 정책은 의도적으로 생성하지 않음 - Append Only 불변성 보장)

-- ------------------------------------------------------------------------------
-- 3. 선언적 FSM 상태 전이 감사 로그 (FSM Transition Logs)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS core.fsm_transition_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  domain          TEXT NOT NULL, -- 'booking', 'approval', 'task_pipeline', 'contract'
  entity_id       UUID NOT NULL,
  from_state      TEXT NOT NULL,
  to_state        TEXT NOT NULL,
  actor_id        UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
  actor_role      TEXT,
  reason          TEXT,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_fsm_logs_lookup
  ON core.fsm_transition_logs (organization_id, domain, entity_id, created_at DESC);

ALTER TABLE core.fsm_transition_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view fsm logs" ON core.fsm_transition_logs;
CREATE POLICY "Members can view fsm logs"
  ON core.fsm_transition_logs
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT m.organization_id FROM core.organization_members m WHERE m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can insert fsm logs" ON core.fsm_transition_logs;
CREATE POLICY "Members can insert fsm logs"
  ON core.fsm_transition_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT m.organization_id FROM core.organization_members m WHERE m.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------------------
-- 4. 전사 단일 활동 스트림 (Universal Activity Stream)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS core.activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  actor_id        UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
  actor_name      TEXT,
  target_type     TEXT NOT NULL, -- 'customer', 'project', 'task', 'contract', 'resource', 'order'
  target_id       UUID NOT NULL,
  activity_type   TEXT NOT NULL, -- 'created', 'status_changed', 'comment_added', 'payment_received'
  title           TEXT NOT NULL,
  content         TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_activities_target
  ON core.activities (organization_id, target_type, target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activities_metadata_gin
  ON core.activities USING gin (metadata jsonb_path_ops);

ALTER TABLE core.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view activities" ON core.activities;
CREATE POLICY "Members can view activities"
  ON core.activities
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT m.organization_id FROM core.organization_members m WHERE m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can insert activities" ON core.activities;
CREATE POLICY "Members can insert activities"
  ON core.activities
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT m.organization_id FROM core.organization_members m WHERE m.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------------------
-- 5. 전사 전문 검색 (tsvector Generated Columns + GIN)
-- ------------------------------------------------------------------------------

DO $$ BEGIN
  -- core.customers
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='customers' AND column_name='search_vector') THEN
    ALTER TABLE core.customers
      ADD COLUMN search_vector tsvector
      GENERATED ALWAYS AS (
        to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(phone, ''))
      ) STORED;
    CREATE INDEX IF NOT EXISTS idx_customers_search_vector_gin ON core.customers USING gin (search_vector);
  END IF;

  -- core.products
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='products' AND column_name='search_vector') THEN
    ALTER TABLE core.products
      ADD COLUMN search_vector tsvector
      GENERATED ALWAYS AS (
        to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(product_code, ''))
      ) STORED;
    CREATE INDEX IF NOT EXISTS idx_products_search_vector_gin ON core.products USING gin (search_vector);
  END IF;

  -- core.workplace_policies
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='workplace_policies' AND column_name='search_vector') THEN
    ALTER TABLE core.workplace_policies
      ADD COLUMN search_vector tsvector
      GENERATED ALWAYS AS (
        to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(category, '') || ' ' || coalesce(content, ''))
      ) STORED;
    CREATE INDEX IF NOT EXISTS idx_workplace_policies_search_vector_gin ON core.workplace_policies USING gin (search_vector);
  END IF;
END $$;

COMMIT;
