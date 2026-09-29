-- Piano 교재 재고 movement: reference_type=textbook_sale 허용
-- sale: reference_type IN ('sale', 'textbook_sale')
-- return: reference_type IN ('sale_return', 'textbook_sale')
-- Retail/Core Sale 경로는 기존 'sale' / 'sale_return' 유지

BEGIN;

ALTER TABLE core.stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_sale_sign_ref_chk;
ALTER TABLE core.stock_movements
  ADD CONSTRAINT stock_movements_sale_sign_ref_chk
  CHECK (
    movement_type <> 'sale'
    OR (
      quantity < 0
      AND reference_type IN ('sale', 'textbook_sale')
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
      AND reference_type IN ('sale_return', 'textbook_sale')
      AND reference_id IS NOT NULL
    )
  );

COMMENT ON CONSTRAINT stock_movements_sale_sign_ref_chk ON core.stock_movements IS
  'sale: 음수 + reference_type sale|textbook_sale + reference_id';
COMMENT ON CONSTRAINT stock_movements_return_sign_ref_chk ON core.stock_movements IS
  'return: 양수 + reference_type sale_return|textbook_sale + reference_id';

COMMIT;
