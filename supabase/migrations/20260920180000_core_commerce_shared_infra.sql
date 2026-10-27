-- Core 공통 상품·재고 인프라 확정 (테이블 중복 생성 금지)
--
-- 현황: 아래 9개 테이블은 이미 retail migration(20260920113000~20170000)으로
--       core 스키마에 존재한다. Skin/Piano 데이터는 건드리지 않는다.
--   core.product_categories
--   core.products
--   core.product_variants
--   core.inventory
--   core.stock_movements
--   core.sales
--   core.sale_items
--   core.sale_returns
--   core.sale_return_items
--
-- 이 migration의 역할:
-- 1) 공통 Core 인프라로 문서화(COMMENT)
-- 2) authenticated GRANT 백필 (sale_returns만 명시 GRANT 되어 있던 갭 해소)
-- 3) organization_id 교차-테넌트 방지 트리거
-- 4) 판매/반품 ↔ stock_movements 추적 규칙(부호·reference)
-- 5) 옵션명 중복 방지 unique (데이터 비어 있음 전제, IF NOT EXISTS)

BEGIN;

-- ── 0) 필수 테이블 존재 확인 (없으면 중단 — 이전 migration 누락) ─────────────
DO $$
DECLARE
  missing TEXT;
BEGIN
  SELECT string_agg(t, ', ')
  INTO missing
  FROM unnest(ARRAY[
    'product_categories',
    'products',
    'product_variants',
    'inventory',
    'stock_movements',
    'sales',
    'sale_items',
    'sale_returns',
    'sale_return_items'
  ]) AS t
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'core' AND table_name = t
  );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION
      'core commerce tables missing: %. Apply prior retail_* migrations first.',
      missing;
  END IF;
END $$;

-- ── 1) Core 공통 인프라로 COMMENT 정리 ─────────────────────────────────────
COMMENT ON TABLE core.product_categories IS
  'Core 상품 카테고리. organization_id로 사업장 격리. Retail/Skin/Piano 등 Module이 공유.';
COMMENT ON TABLE core.products IS
  'Core 상품 마스터. organization_id 멀티테넌트. 업종별 확장(교재 ISBN 등)은 Module 측.';
COMMENT ON COLUMN core.products.category_id IS
  'core.product_categories 참조(nullable). 동일 organization_id만 허용(트리거).';
COMMENT ON COLUMN core.products.product_code IS
  '사업장 내 상품 코드(선택). (organization_id, product_code) 유일.';

COMMENT ON TABLE core.product_variants IS
  'Core 상품 옵션/변형. 없으면 products 단위로 재고·판매 가능.';
COMMENT ON COLUMN core.product_variants.price IS
  'nullable — null이면 상위 products.price 사용(앱 해석).';
COMMENT ON COLUMN core.product_variants.cost IS
  'nullable — null이면 상위 products.cost 사용(앱 해석).';

COMMENT ON TABLE core.inventory IS
  'Core 현재 재고 잔량. 변경은 stock_movements로 추적. 상품단위(variant NULL) 또는 옵션단위 유일.';
COMMENT ON COLUMN core.inventory.quantity IS
  '현재 잔량. movement 반영으로 갱신(직접 덮어쓰기 비권장).';

COMMENT ON TYPE core.stock_movement_type IS
  'Core 재고 이동 유형: inbound|sale|return|adjustment.';
COMMENT ON TABLE core.stock_movements IS
  'Core 재고 변동 이력(append). quantity는 부호 있는 증감. 판매/반품은 reference로 추적.';
COMMENT ON COLUMN core.stock_movements.reference_type IS
  '연관 도메인: sale | sale_return | (기타 입고/조정 키).';
COMMENT ON COLUMN core.stock_movements.reference_id IS
  '연관 레코드 id (sale.id 또는 sale_returns.id 등).';

COMMENT ON TYPE core.sale_status IS
  'Core 판매 거래 상태(completed|cancelled|refunded). 교재 납부상태(unpaid/partial)와 별개.';
COMMENT ON TABLE core.sales IS
  'Core 판매 헤더. customer_id NULL 허용. 포인트·Finance 연동은 별도 계층.';
COMMENT ON TABLE core.sale_items IS
  'Core 판매 라인. product_name_snapshot·unit_price는 판매 시점 불변.';
COMMENT ON TABLE core.sale_returns IS
  'Core 반품 헤더. 원본 sales는 삭제하지 않음(ON DELETE RESTRICT).';
COMMENT ON TABLE core.sale_return_items IS
  'Core 반품 라인. 원본 sale_item 기준 부분 반품.';

-- ── 2) GRANT 백필 (RLS는 기존 정책 유지) ───────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON core.product_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.product_variants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.stock_movements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.sale_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.sale_returns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.sale_return_items TO authenticated;

-- ── 3) 옵션명 중복 방지 (동일 product 내) ──────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_product_name
  ON core.product_variants (product_id, lower(btrim(name)));

-- ── 4) 판매/반품 movement 부호·reference 규칙 ───────────────────────────────
-- sale: 출고(음수) + reference_type=sale + reference_id 필수
-- return: 입고(양수) + reference_type=sale_return + reference_id 필수
-- inbound: 양수 (reference 선택)
-- adjustment: 부호 자유 (reference 선택)
ALTER TABLE core.stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_sale_sign_ref_chk;
ALTER TABLE core.stock_movements
  ADD CONSTRAINT stock_movements_sale_sign_ref_chk
  CHECK (
    movement_type <> 'sale'
    OR (
      quantity < 0
      AND reference_type = 'sale'
      AND reference_id IS NOT NULL
    )
  );

ALTER TABLE core.stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_return_sign_ref_chk;
ALTER TABLE core.stock_movements
  ADD CONSTRAINT stock_movements_return_sign_ref_chk
  CHECK (
    movement_type <> 'return'
    OR (
      quantity > 0
      AND reference_type = 'sale_return'
      AND reference_id IS NOT NULL
    )
  );

ALTER TABLE core.stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_inbound_sign_chk;
ALTER TABLE core.stock_movements
  ADD CONSTRAINT stock_movements_inbound_sign_chk
  CHECK (
    movement_type <> 'inbound'
    OR quantity > 0
  );

-- ── 5) organization_id / product·variant 정합 트리거 ───────────────────────
CREATE OR REPLACE FUNCTION core.enforce_commerce_row_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = core, pg_temp
AS $$
DECLARE
  product_org UUID;
  variant_product UUID;
  category_org UUID;
  sale_org UUID;
  sale_of_item UUID;
  return_org UUID;
BEGIN
  -- products.category_id → 동일 org
  IF TG_TABLE_NAME = 'products' AND NEW.category_id IS NOT NULL THEN
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

  -- inventory / stock_movements: product·variant org·소속 일치
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
      -- variant만 온 경우 product_id를 채움(정합·조회 편의). inventory/stock 모두.
      IF NEW.product_id IS NULL THEN
        NEW.product_id := variant_product;
      END IF;
    END IF;
  END IF;

  -- sale_returns: 원본 sale과 동일 org
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

  -- sale_return_items: sale_item이 같은 sale에 속하는지(간접 org 보호)
  IF TG_TABLE_NAME = 'sale_return_items' THEN
    SELECT r.organization_id, r.sale_id
    INTO return_org, sale_of_item
    FROM core.sale_returns r
    WHERE r.id = NEW.sale_return_id;
    IF return_org IS NULL THEN
      RAISE EXCEPTION 'sale_return % not found', NEW.sale_return_id;
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM core.sale_items si
      WHERE si.id = NEW.sale_item_id
        AND si.sale_id = sale_of_item
    ) THEN
      RAISE EXCEPTION 'sale_return_item.sale_item_id must belong to the returned sale';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_commerce_org ON core.products;
CREATE TRIGGER trg_products_commerce_org
  BEFORE INSERT OR UPDATE OF organization_id, category_id
  ON core.products
  FOR EACH ROW
  EXECUTE FUNCTION core.enforce_commerce_row_org();

DROP TRIGGER IF EXISTS trg_inventory_commerce_org ON core.inventory;
CREATE TRIGGER trg_inventory_commerce_org
  BEFORE INSERT OR UPDATE OF organization_id, product_id, variant_id
  ON core.inventory
  FOR EACH ROW
  EXECUTE FUNCTION core.enforce_commerce_row_org();

DROP TRIGGER IF EXISTS trg_stock_movements_commerce_org ON core.stock_movements;
CREATE TRIGGER trg_stock_movements_commerce_org
  BEFORE INSERT OR UPDATE OF organization_id, product_id, variant_id
  ON core.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION core.enforce_commerce_row_org();

DROP TRIGGER IF EXISTS trg_sale_returns_commerce_org ON core.sale_returns;
CREATE TRIGGER trg_sale_returns_commerce_org
  BEFORE INSERT OR UPDATE OF organization_id, sale_id
  ON core.sale_returns
  FOR EACH ROW
  EXECUTE FUNCTION core.enforce_commerce_row_org();

DROP TRIGGER IF EXISTS trg_sale_return_items_commerce_org ON core.sale_return_items;
CREATE TRIGGER trg_sale_return_items_commerce_org
  BEFORE INSERT OR UPDATE OF sale_return_id, sale_item_id
  ON core.sale_return_items
  FOR EACH ROW
  EXECUTE FUNCTION core.enforce_commerce_row_org();

COMMENT ON FUNCTION core.enforce_commerce_row_org() IS
  'Core commerce: organization_id·product/variant·sale_return 정합 강제.';

COMMIT;
