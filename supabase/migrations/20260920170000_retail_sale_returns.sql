-- 판매 반품 (원본 Sale 불변, 반품 이력 별도 기록)

BEGIN;

CREATE TABLE IF NOT EXISTS core.sale_returns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  sale_id           UUID NOT NULL REFERENCES core.sales(id) ON DELETE RESTRICT,
  total_amount      NUMERIC(14, 2) NOT NULL DEFAULT 0,
  reason            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sale_returns_total_amount_nonneg_chk CHECK (total_amount >= 0)
);

COMMENT ON TABLE core.sale_returns IS
  '판매 반품 헤더. 원본 sales 행은 삭제·금액 덮어쓰기 하지 않음.';
COMMENT ON COLUMN core.sale_returns.sale_id IS '원본 판매. ON DELETE RESTRICT로 원본 보존.';
COMMENT ON COLUMN core.sale_returns.total_amount IS '이번 반품 합계(라인 합). 포인트·PG와 무관.';
COMMENT ON COLUMN core.sale_returns.reason IS '반품 사유(선택).';

CREATE INDEX IF NOT EXISTS idx_sale_returns_org_created
  ON core.sale_returns (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sale_returns_sale
  ON core.sale_returns (sale_id);

CREATE TABLE IF NOT EXISTS core.sale_return_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_return_id          UUID NOT NULL REFERENCES core.sale_returns(id) ON DELETE CASCADE,
  sale_item_id            UUID NOT NULL REFERENCES core.sale_items(id) ON DELETE RESTRICT,
  product_id              UUID REFERENCES core.products(id) ON DELETE SET NULL,
  variant_id              UUID REFERENCES core.product_variants(id) ON DELETE SET NULL,
  product_name_snapshot   TEXT NOT NULL,
  quantity                NUMERIC(14, 3) NOT NULL,
  unit_price              NUMERIC(14, 2) NOT NULL,
  line_amount             NUMERIC(14, 2) NOT NULL,
  CONSTRAINT sale_return_items_quantity_positive_chk CHECK (quantity > 0),
  CONSTRAINT sale_return_items_unit_price_nonneg_chk CHECK (unit_price >= 0),
  CONSTRAINT sale_return_items_line_amount_nonneg_chk CHECK (line_amount >= 0)
);

COMMENT ON TABLE core.sale_return_items IS
  '반품 라인. 원본 sale_item 수량 이하만 허용(앱에서 누적 검증).';
COMMENT ON COLUMN core.sale_return_items.sale_item_id IS '원본 판매 라인.';
COMMENT ON COLUMN core.sale_return_items.product_name_snapshot IS '반품 시점 스냅샷(원본 판매 스냅샷 복사).';

CREATE INDEX IF NOT EXISTS idx_sale_return_items_return
  ON core.sale_return_items (sale_return_id);

CREATE INDEX IF NOT EXISTS idx_sale_return_items_sale_item
  ON core.sale_return_items (sale_item_id);

ALTER TABLE core.sale_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.sale_return_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_sale_returns_select ON core.sale_returns;
CREATE POLICY core_sale_returns_select
  ON core.sale_returns
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_admin(organization_id));

DROP POLICY IF EXISTS core_sale_returns_admin ON core.sale_returns;
CREATE POLICY core_sale_returns_admin
  ON core.sale_returns
  FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

DROP POLICY IF EXISTS core_sale_return_items_select ON core.sale_return_items;
CREATE POLICY core_sale_return_items_select
  ON core.sale_return_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM core.sale_returns r
      WHERE r.id = sale_return_id
        AND (core.is_org_member(r.organization_id) OR core.is_org_admin(r.organization_id))
    )
  );

DROP POLICY IF EXISTS core_sale_return_items_admin ON core.sale_return_items;
CREATE POLICY core_sale_return_items_admin
  ON core.sale_return_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM core.sale_returns r
      WHERE r.id = sale_return_id
        AND core.is_org_admin(r.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM core.sale_returns r
      WHERE r.id = sale_return_id
        AND core.is_org_admin(r.organization_id)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON core.sale_returns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.sale_return_items TO authenticated;

COMMIT;
