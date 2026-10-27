-- ==============================================================================
-- Moa-v2: 신규 원자적 Capability 5종 DB 마이그레이션 (atomic_expansion)
-- 1. field_dispatch (출장 및 방문 파견 관리)
-- 2. promotional_deal (기간 한정 특가 & 이벤트 스케줄러)
-- 3. space_turnaround (공간·좌석 정비/청소 버퍼 관리)
-- 4. waitlist_queue (시간표/수업 마감 취소 대기열 FIFO)
-- 5. trial_funnel (체험 및 상담 리드 파이프라인)
-- ==============================================================================

-- 1. field_dispatch (출장 및 방문 파견 관리)
CREATE TABLE IF NOT EXISTS core.dispatch_orders (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id             UUID,
  staff_id                UUID,
  service_name            VARCHAR(128) NOT NULL,
  service_address         TEXT NOT NULL,
  address_detail          TEXT,
  scheduled_at            TIMESTAMPTZ NOT NULL,
  estimated_duration_min  INT NOT NULL DEFAULT 60 CHECK (estimated_duration_min > 0),
  travel_buffer_min       INT NOT NULL DEFAULT 30 CHECK (travel_buffer_min >= 0),
  status                  VARCHAR(32) NOT NULL DEFAULT 'BOOKED' CHECK (status IN ('BOOKED', 'ASSIGNED', 'EN_ROUTE', 'WORKING', 'COMPLETED', 'CANCELLED')),
  before_photo_url        TEXT,
  after_photo_url         TEXT,
  memo                    TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_orders_tenant_status
  ON core.dispatch_orders (tenant_id, status, scheduled_at);

ALTER TABLE core.dispatch_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dispatch_orders_tenant_all ON core.dispatch_orders;
CREATE POLICY dispatch_orders_tenant_all ON core.dispatch_orders
  FOR ALL TO authenticated
  USING (core.is_org_owner_or_admin(tenant_id) OR core.is_org_member(tenant_id))
  WITH CHECK (core.is_org_owner_or_admin(tenant_id) OR core.is_org_member(tenant_id));


-- 2. promotional_deal (기간 한정 특가 & 이벤트 스케줄러)
CREATE TABLE IF NOT EXISTS core.promotional_deals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  title             VARCHAR(128) NOT NULL,
  target_type       VARCHAR(32) NOT NULL CHECK (target_type IN ('PASS', 'RETAIL')),
  target_id         UUID NOT NULL,
  original_price    INT NOT NULL CHECK (original_price >= 0),
  special_price     INT NOT NULL CHECK (special_price >= 0),
  start_at          TIMESTAMPTZ NOT NULL,
  end_at            TIMESTAMPTZ NOT NULL,
  limited_quantity  INT DEFAULT NULL CHECK (limited_quantity IS NULL OR limited_quantity > 0),
  sold_quantity     INT NOT NULL DEFAULT 0 CHECK (sold_quantity >= 0),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_promo_dates CHECK (end_at > start_at),
  CONSTRAINT promotional_deals_price_check CHECK (special_price <= original_price)
);

CREATE INDEX IF NOT EXISTS idx_promotional_deals_tenant_active
  ON core.promotional_deals (tenant_id, is_active, start_at, end_at);

ALTER TABLE core.promotional_deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS promotional_deals_tenant_all ON core.promotional_deals;
CREATE POLICY promotional_deals_tenant_all ON core.promotional_deals
  FOR ALL TO authenticated
  USING (core.is_org_owner_or_admin(tenant_id) OR core.is_org_member(tenant_id))
  WITH CHECK (core.is_org_owner_or_admin(tenant_id) OR core.is_org_member(tenant_id));


-- 3. space_turnaround (공간·좌석 정비/청소 버퍼 관리)
CREATE TABLE IF NOT EXISTS core.space_cleanings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  resource_id     VARCHAR(128) NOT NULL,
  turnaround_min  INT NOT NULL DEFAULT 15 CHECK (turnaround_min >= 0),
  status          VARCHAR(32) NOT NULL DEFAULT 'DIRTY' CHECK (status IN ('DIRTY', 'CLEANING', 'READY')),
  cleaned_by      UUID,
  cleaned_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_space_cleanings_tenant_resource
  ON core.space_cleanings (tenant_id, resource_id, status);

ALTER TABLE core.space_cleanings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS space_cleanings_tenant_all ON core.space_cleanings;
CREATE POLICY space_cleanings_tenant_all ON core.space_cleanings
  FOR ALL TO authenticated
  USING (core.is_org_owner_or_admin(tenant_id) OR core.is_org_member(tenant_id))
  WITH CHECK (core.is_org_owner_or_admin(tenant_id) OR core.is_org_member(tenant_id));


-- 4. waitlist_queue (시간표/수업 마감 취소 대기열 FIFO)
CREATE TABLE IF NOT EXISTS core.booking_waitlists (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  booking_slot_id   VARCHAR(128) NOT NULL,
  customer_id       UUID NOT NULL,
  pass_id           UUID,
  queue_order       INT NOT NULL DEFAULT 1 CHECK (queue_order > 0),
  status            VARCHAR(32) NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'OFFERED', 'EXPIRED', 'CONVERTED')),
  offered_at        TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_waitlists_tenant_slot
  ON core.booking_waitlists (tenant_id, booking_slot_id, queue_order);

ALTER TABLE core.booking_waitlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booking_waitlists_tenant_all ON core.booking_waitlists;
CREATE POLICY booking_waitlists_tenant_all ON core.booking_waitlists
  FOR ALL TO authenticated
  USING (core.is_org_owner_or_admin(tenant_id) OR core.is_org_member(tenant_id))
  WITH CHECK (core.is_org_owner_or_admin(tenant_id) OR core.is_org_member(tenant_id));


-- 5. trial_funnel: core.trial_leads 는 선행 마이그레이션에서 organization_id/trial_date 스키마로 이미 생성됨.
-- 중복 CREATE/인덱스(scheduled_at)는 원격 스키마와 충돌하므로 여기서는 RLS만 재확인한다.
ALTER TABLE core.trial_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trial_leads_tenant_all ON core.trial_leads;
DROP POLICY IF EXISTS trial_leads_org_all ON core.trial_leads;
CREATE POLICY trial_leads_org_all ON core.trial_leads
  FOR ALL TO authenticated
  USING (core.is_org_owner_or_admin(organization_id) OR core.is_org_member(organization_id))
  WITH CHECK (core.is_org_owner_or_admin(organization_id) OR core.is_org_member(organization_id));
