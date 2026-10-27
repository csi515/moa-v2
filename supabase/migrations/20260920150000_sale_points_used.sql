-- Sale 포인트 사용액 + 판매당 redeem 중복 방지

BEGIN;

ALTER TABLE core.sales
  ADD COLUMN IF NOT EXISTS points_used NUMERIC(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE core.sales
  DROP CONSTRAINT IF EXISTS sales_points_used_nonneg_chk;
ALTER TABLE core.sales
  ADD CONSTRAINT sales_points_used_nonneg_chk CHECK (points_used >= 0);

ALTER TABLE core.sales
  DROP CONSTRAINT IF EXISTS sales_points_used_lte_total_chk;
ALTER TABLE core.sales
  ADD CONSTRAINT sales_points_used_lte_total_chk CHECK (points_used <= total_amount);

COMMENT ON COLUMN core.sales.points_used IS
  '판매 시 사용한 포인트(원 환산, 1P=1원). total_amount(상품 합계)와 별도. 최종 결제 = total_amount - points_used.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_point_transactions_sale_redeem
  ON core.point_transactions (organization_id, reference_id)
  WHERE type = 'redeem'
    AND reference_type = 'sale'
    AND reference_id IS NOT NULL;

COMMIT;
