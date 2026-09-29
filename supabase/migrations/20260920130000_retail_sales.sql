-- Retail 판매 데이터 모델 (Sale / SaleItem)
-- 판매 시점 상품명·단가는 snapshot. 재고 차감·포인트·PG·Finance는 별도.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'core' AND t.typname = 'sale_status'
  ) THEN
    CREATE TYPE core.sale_status AS ENUM (
      'completed',  -- 판매 완료
      'cancelled',  -- 취소
      'refunded'    -- 환불
    );
  END IF;
END $$;

COMMENT ON TYPE core.sale_status IS '소매 판매 상태. payment_status(청구)와 별개.';

CREATE TABLE IF NOT EXISTS core.sales (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id       UUID REFERENCES core.customers(id) ON DELETE SET NULL,
  total_amount      NUMERIC(14, 2) NOT NULL DEFAULT 0,
  payment_method    core.payment_method NOT NULL DEFAULT 'cash',
  status            core.sale_status NOT NULL DEFAULT 'completed',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sales_total_amount_nonneg_chk CHECK (total_amount >= 0)
);

COMMENT ON TABLE core.sales IS '소매 판매 헤더. customer_id NULL = 비회원/고객 없는 판매 가능.';
COMMENT ON COLUMN core.sales.customer_id IS '고객(nullable). 없어도 판매 가능.';
COMMENT ON COLUMN core.sales.total_amount IS '판매 합계 금액(라인 합과 앱에서 일치시킴).';
COMMENT ON COLUMN core.sales.payment_method IS 'core.payment_method 재사용. PG 연동 없음.';
COMMENT ON COLUMN core.sales.status IS 'completed|cancelled|refunded';

CREATE INDEX IF NOT EXISTS idx_sales_org_created
  ON core.sales (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_org_customer
  ON core.sales (organization_id, customer_id)
  WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_org_status
  ON core.sales (organization_id, status);

CREATE TABLE IF NOT EXISTS core.sale_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id                 UUID NOT NULL REFERENCES core.sales(id) ON DELETE CASCADE,
  product_id              UUID REFERENCES core.products(id) ON DELETE SET NULL,
  variant_id              UUID REFERENCES core.product_variants(id) ON DELETE SET NULL,
  product_name_snapshot   TEXT NOT NULL,
  quantity                NUMERIC(14, 3) NOT NULL,
  unit_price              NUMERIC(14, 2) NOT NULL,
  discount_amount         NUMERIC(14, 2) NOT NULL DEFAULT 0,
  line_amount             NUMERIC(14, 2) NOT NULL,
  CONSTRAINT sale_items_quantity_positive_chk CHECK (quantity > 0),
  CONSTRAINT sale_items_unit_price_nonneg_chk CHECK (unit_price >= 0),
  CONSTRAINT sale_items_discount_nonneg_chk CHECK (discount_amount >= 0),
  CONSTRAINT sale_items_line_amount_nonneg_chk CHECK (line_amount >= 0)
);

COMMENT ON TABLE core.sale_items IS '판매 라인. 상품명·단가는 판매 시점 snapshot — 이후 마스터 변경에 영향받지 않음.';
COMMENT ON COLUMN core.sale_items.product_id IS '참조용(삭제 시 NULL). 표시는 product_name_snapshot.';
COMMENT ON COLUMN core.sale_items.variant_id IS '옵션(nullable). 삭제 시 NULL.';
COMMENT ON COLUMN core.sale_items.product_name_snapshot IS '판매 시점 상품명(옵션명 포함 가능). 과거 내역 불변.';
COMMENT ON COLUMN core.sale_items.unit_price IS '판매 시점 단가 snapshot.';
COMMENT ON COLUMN core.sale_items.discount_amount IS '라인 할인액.';
COMMENT ON COLUMN core.sale_items.line_amount IS '라인 합계(통상 quantity*unit_price - discount_amount).';

CREATE INDEX IF NOT EXISTS idx_sale_items_sale
  ON core.sale_items (sale_id);

CREATE INDEX IF NOT EXISTS idx_sale_items_product
  ON core.sale_items (product_id)
  WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sale_items_variant
  ON core.sale_items (variant_id)
  WHERE variant_id IS NOT NULL;

ALTER TABLE core.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_sales_select ON core.sales;
CREATE POLICY core_sales_select
  ON core.sales
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_admin(organization_id));

DROP POLICY IF EXISTS core_sales_admin ON core.sales;
CREATE POLICY core_sales_admin
  ON core.sales
  FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

DROP POLICY IF EXISTS core_sale_items_select ON core.sale_items;
CREATE POLICY core_sale_items_select
  ON core.sale_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM core.sales s
      WHERE s.id = sale_id
        AND (core.is_org_member(s.organization_id) OR core.is_org_admin(s.organization_id))
    )
  );

DROP POLICY IF EXISTS core_sale_items_admin ON core.sale_items;
CREATE POLICY core_sale_items_admin
  ON core.sale_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM core.sales s
      WHERE s.id = sale_id
        AND core.is_org_admin(s.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM core.sales s
      WHERE s.id = sale_id
        AND core.is_org_admin(s.organization_id)
    )
  );

COMMIT;
