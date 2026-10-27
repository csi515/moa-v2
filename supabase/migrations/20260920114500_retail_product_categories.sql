-- 상품 카테고리 (목록 필터·폼용). products.category_id FK 연결.

BEGIN;

CREATE TABLE IF NOT EXISTS core.product_categories (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_product_categories_org_name UNIQUE (organization_id, name)
);

COMMENT ON TABLE core.product_categories IS '소매 상품 카테고리. organization_id로 사업장 분리.';

CREATE INDEX IF NOT EXISTS idx_product_categories_org_active
  ON core.product_categories (organization_id, is_active);

DROP TRIGGER IF EXISTS set_updated_at ON core.product_categories;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON core.product_categories
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE core.product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_product_categories_select ON core.product_categories;
CREATE POLICY core_product_categories_select
  ON core.product_categories
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_admin(organization_id));

DROP POLICY IF EXISTS core_product_categories_admin ON core.product_categories;
CREATE POLICY core_product_categories_admin
  ON core.product_categories
  FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_category_id_fkey'
  ) THEN
    ALTER TABLE core.products
      ADD CONSTRAINT products_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES core.product_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;
