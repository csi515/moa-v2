-- inventory/stock_movements 트리거에서 NEW.category_id 접근으로 터지던 버그 수정
-- (TG_TABLE_NAME = 'products' AND NEW.category_id) → nested IF 로 가드

BEGIN;

CREATE OR REPLACE FUNCTION core.enforce_commerce_row_org()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'core', 'pg_temp'
AS $$
DECLARE
  product_org UUID;
  variant_product UUID;
  category_org UUID;
  sale_org UUID;
  sale_of_item UUID;
  return_org UUID;
BEGIN
  IF TG_TABLE_NAME = 'products' THEN
    IF NEW.category_id IS NOT NULL THEN
      SELECT organization_id INTO category_org
      FROM core.product_categories
      WHERE id = NEW.category_id;
      IF category_org IS NULL THEN
        RAISE EXCEPTION 'product category % not found', NEW.category_id;
      END IF;
      IF category_org <> NEW.organization_id THEN
        RAISE EXCEPTION 'product category organization mismatch';
      END IF;
    END IF;
  END IF;

  IF TG_TABLE_NAME IN ('inventory', 'stock_movements') THEN
    IF NEW.product_id IS NOT NULL THEN
      SELECT organization_id INTO product_org
      FROM core.products
      WHERE id = NEW.product_id;
      IF product_org IS NULL THEN
        RAISE EXCEPTION 'product % not found', NEW.product_id;
      END IF;
      IF product_org <> NEW.organization_id THEN
        RAISE EXCEPTION 'product organization_id mismatch with % row', TG_TABLE_NAME;
      END IF;
    END IF;

    IF NEW.variant_id IS NOT NULL THEN
      SELECT v.product_id, p.organization_id
      INTO variant_product, product_org
      FROM core.product_variants v
      JOIN core.products p ON p.id = v.product_id
      WHERE v.id = NEW.variant_id;
      IF variant_product IS NULL THEN
        RAISE EXCEPTION 'variant % not found', NEW.variant_id;
      END IF;
      IF product_org <> NEW.organization_id THEN
        RAISE EXCEPTION 'variant organization_id mismatch with % row', TG_TABLE_NAME;
      END IF;
      IF NEW.product_id IS NOT NULL AND NEW.product_id <> variant_product THEN
        RAISE EXCEPTION 'variant does not belong to product_id';
      END IF;
      IF NEW.product_id IS NULL THEN
        NEW.product_id := variant_product;
      END IF;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'sale_returns' THEN
    SELECT organization_id INTO sale_org
    FROM core.sales
    WHERE id = NEW.sale_id;
    IF sale_org IS NULL THEN
      RAISE EXCEPTION 'sale % not found', NEW.sale_id;
    END IF;
    IF sale_org <> NEW.organization_id THEN
      RAISE EXCEPTION 'sale_return organization_id must match sale';
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'sale_return_items' THEN
    SELECT r.organization_id, r.sale_id
    INTO return_org, sale_of_item
    FROM core.sale_returns r
    WHERE r.id = NEW.sale_return_id;
    IF return_org IS NULL THEN
      RAISE EXCEPTION 'sale_return % not found', NEW.sale_return_id;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM core.sale_items si
      WHERE si.id = NEW.sale_item_id AND si.sale_id = sale_of_item
    ) THEN
      RAISE EXCEPTION 'sale_return_item.sale_item_id must belong to the returned sale';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
