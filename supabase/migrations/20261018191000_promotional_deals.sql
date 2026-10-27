-- ==============================================================================
-- Moa-v2: 기간 한정 특가 & 이벤트 스케줄러 (promotional_deal) 마이그레이션
-- ==============================================================================

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
  CONSTRAINT promotional_deals_date_check CHECK (end_at > start_at),
  CONSTRAINT promotional_deals_price_check CHECK (special_price <= original_price)
);

CREATE INDEX IF NOT EXISTS idx_promotional_deals_tenant_active
  ON core.promotional_deals (tenant_id, is_active, start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_promotional_deals_target
  ON core.promotional_deals (tenant_id, target_type, target_id);

COMMENT ON TABLE core.promotional_deals IS '사업주가 등록한 기간 한정 특가 및 이벤트 할인 정책';
COMMENT ON COLUMN core.promotional_deals.target_type IS '할인 적용 대상 구분 (PASS: 수강권/이용권, RETAIL: 상품/비품)';
COMMENT ON COLUMN core.promotional_deals.limited_quantity IS '선착순 한정 판매 수량 (NULL이면 무제한)';
COMMENT ON COLUMN core.promotional_deals.sold_quantity IS '특가 판매 완료된 누적 수량';

-- RLS 보안 정책 활성화
ALTER TABLE core.promotional_deals ENABLE ROW LEVEL SECURITY;

-- 1. 사업주/관리자: 본인 테넌트의 프로모션 전체 CRUD 허용
DROP POLICY IF EXISTS promotional_deals_owner_all ON core.promotional_deals;
CREATE POLICY promotional_deals_owner_all ON core.promotional_deals
  FOR ALL TO authenticated
  USING (core.is_org_owner_or_admin(tenant_id) OR core.is_org_member(tenant_id))
  WITH CHECK (core.is_org_owner_or_admin(tenant_id) OR core.is_org_member(tenant_id));

-- 2. 고객: 본인 테넌트의 활성화된 프로모션 조회 허용
DROP POLICY IF EXISTS promotional_deals_customer_select ON core.promotional_deals;
CREATE POLICY promotional_deals_customer_select ON core.promotional_deals
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND (core.is_org_member(tenant_id) OR core.is_org_owner_or_admin(tenant_id))
  );
