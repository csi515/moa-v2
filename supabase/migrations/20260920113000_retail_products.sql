-- Retail 상품 기본 데이터 모델 (Product / ProductVariant)
-- 옵션 없는 상품도 products만으로 저장 가능. 재고·판매·포인트는 별도.

BEGIN;

CREATE TABLE IF NOT EXISTS core.products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  category_id       UUID,
  product_code      TEXT,
  price             NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  cost              NUMERIC(12, 2) CHECK (cost IS NULL OR cost >= 0),
  image_url         TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE core.products IS '소매 상품 마스터. organization_id로 사업장 분리. category_id는 향후 카테고리 테이블 연결용(현재 FK 없음).';
COMMENT ON COLUMN core.products.category_id IS 'nullable — 상품 카테고리 테이블 미도입 상태의';
COMMENT ON COLUMN core.products.product_code IS '사업장 내 상품 코드(선택)';

CREATE UNIQUE INDEX IF NOT EXISTS uq_products_org_product_code
  ON core.products (organization_id, product_code)
  WHERE product_code IS NOT NULL AND btrim(product_code) <> '';

CREATE INDEX IF NOT EXISTS idx_products_org_active
  ON core.products (organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_products_org_name
  ON core.products (organization_id, name);

DROP TRIGGER IF EXISTS set_updated_at ON core.products;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON core.products
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE IF NOT EXISTS core.product_variants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES core.products(id) ON DELETE CASCADE,
  name              TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  sku               TEXT,
  price             NUMERIC(12, 2) CHECK (price IS NULL OR price >= 0),
  cost              NUMERIC(12, 2) CHECK (cost IS NULL OR cost >= 0),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE core.product_variants IS '상품 옵션/변형. 없으면 상품(products) 단위로만 운영 가능. 판매·재고는 variant 단위로 확장 예정.';
COMMENT ON COLUMN core.product_variants.name IS '옵션 라벨 (예: 빨강 / L)';
COMMENT ON COLUMN core.product_variants.price IS 'nullable — null이면 상위 product.price 사용';
COMMENT ON COLUMN core.product_variants.cost IS 'nullable — null이면 상위 product.cost 사용';

CREATE INDEX IF NOT EXISTS idx_product_variants_product
  ON core.product_variants (product_id, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_product_sku
  ON core.product_variants (product_id, sku)
  WHERE sku IS NOT NULL AND btrim(sku) <> '';

DROP TRIGGER IF EXISTS set_updated_at ON core.product_variants;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON core.product_variants
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE core.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.product_variants ENABLE ROW LEVEL SECURITY;

-- 멤버 조회 / 관리자 쓰기 (고객 테이블과 무관)
DROP POLICY IF EXISTS core_products_select ON core.products;
CREATE POLICY core_products_select
  ON core.products
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_admin(organization_id));

DROP POLICY IF EXISTS core_products_admin ON core.products;
CREATE POLICY core_products_admin
  ON core.products
  FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

DROP POLICY IF EXISTS core_product_variants_select ON core.product_variants;
CREATE POLICY core_product_variants_select
  ON core.product_variants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM core.products p
      WHERE p.id = product_id
        AND (core.is_org_member(p.organization_id) OR core.is_org_admin(p.organization_id))
    )
  );

DROP POLICY IF EXISTS core_product_variants_admin ON core.product_variants;
CREATE POLICY core_product_variants_admin
  ON core.product_variants
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM core.products p
      WHERE p.id = product_id
        AND core.is_org_admin(p.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM core.products p
      WHERE p.id = product_id
        AND core.is_org_admin(p.organization_id)
    )
  );

COMMIT;
