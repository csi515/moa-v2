-- Retail 재고 데이터 모델 (Inventory / StockMovement)
-- 수량 변경은 movement 이력으로 추적. UI·판매·발주·공급업체는 별도.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'core' AND t.typname = 'stock_movement_type'
  ) THEN
    CREATE TYPE core.stock_movement_type AS ENUM (
      'inbound',     -- 입고/매입 (purchase)
      'sale',        -- 판매 출고
      'return',      -- 반품·회수
      'adjustment'   -- 실사·보정
    );
  END IF;
END $$;

COMMENT ON TYPE core.stock_movement_type IS '소매 재고 이동 유형. inbound≈purchase/입고.';

CREATE TABLE IF NOT EXISTS core.inventory (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES core.products(id) ON DELETE CASCADE,
  variant_id        UUID REFERENCES core.product_variants(id) ON DELETE CASCADE,
  quantity          NUMERIC(14, 3) NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_product_or_variant_chk
    CHECK (product_id IS NOT NULL OR variant_id IS NOT NULL)
);

COMMENT ON TABLE core.inventory IS '현재 재고 잔량. organization_id로 사업장 분리. 변경은 stock_movements로 추적.';
COMMENT ON COLUMN core.inventory.product_id IS '옵션 없는 상품 재고 — variant_id NULL';
COMMENT ON COLUMN core.inventory.variant_id IS '옵션 단위 재고 — 있으면 variant 기준';
COMMENT ON COLUMN core.inventory.quantity IS '현재 수량(잔량). 직접 덮어쓰기보다 movement 반영을 권장.';

-- 상품 단위(옵션 없음) 유일
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_org_product_no_variant
  ON core.inventory (organization_id, product_id)
  WHERE variant_id IS NULL AND product_id IS NOT NULL;

-- 옵션 단위 유일
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_org_variant
  ON core.inventory (organization_id, variant_id)
  WHERE variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_org
  ON core.inventory (organization_id);

CREATE INDEX IF NOT EXISTS idx_inventory_org_product
  ON core.inventory (organization_id, product_id)
  WHERE product_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_updated_at ON core.inventory;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON core.inventory
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE IF NOT EXISTS core.stock_movements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES core.products(id) ON DELETE SET NULL,
  variant_id        UUID REFERENCES core.product_variants(id) ON DELETE SET NULL,
  movement_type     core.stock_movement_type NOT NULL,
  quantity          NUMERIC(14, 3) NOT NULL,
  reference_type    TEXT,
  reference_id      UUID,
  reason            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT stock_movements_product_or_variant_chk
    CHECK (product_id IS NOT NULL OR variant_id IS NOT NULL),
  CONSTRAINT stock_movements_quantity_nonzero_chk
    CHECK (quantity <> 0)
);

COMMENT ON TABLE core.stock_movements IS '재고 이동 이력(append 권장). quantity는 부호 있는 증감(입고+, 판매- 등).';
COMMENT ON COLUMN core.stock_movements.movement_type IS 'inbound|sale|return|adjustment';
COMMENT ON COLUMN core.stock_movements.quantity IS '증감량(부호 포함). 이력 추적용 — 잔량은 inventory.quantity.';
COMMENT ON COLUMN core.stock_movements.reference_type IS '연관 도메인 키(예: sale, purchase_order) — 선택';
COMMENT ON COLUMN core.stock_movements.reference_id IS '연관 레코드 id — 선택';

CREATE INDEX IF NOT EXISTS idx_stock_movements_org_created
  ON core.stock_movements (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_org_product
  ON core.stock_movements (organization_id, product_id)
  WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_org_variant
  ON core.stock_movements (organization_id, variant_id)
  WHERE variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_reference
  ON core.stock_movements (organization_id, reference_type, reference_id)
  WHERE reference_id IS NOT NULL;

ALTER TABLE core.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_inventory_select ON core.inventory;
CREATE POLICY core_inventory_select
  ON core.inventory
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_admin(organization_id));

DROP POLICY IF EXISTS core_inventory_admin ON core.inventory;
CREATE POLICY core_inventory_admin
  ON core.inventory
  FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

DROP POLICY IF EXISTS core_stock_movements_select ON core.stock_movements;
CREATE POLICY core_stock_movements_select
  ON core.stock_movements
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_admin(organization_id));

-- 이력은 관리자 insert/update/delete (앱은 append-only 권장)
DROP POLICY IF EXISTS core_stock_movements_admin ON core.stock_movements;
CREATE POLICY core_stock_movements_admin
  ON core.stock_movements
  FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

COMMIT;
