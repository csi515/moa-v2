-- 판매 적립 스냅샷 컬럼: 적용 적립률·적립 기준금액 (과거 거래 재계산 금지)

BEGIN;

ALTER TABLE core.point_transactions
  ADD COLUMN IF NOT EXISTS earn_rate_percent NUMERIC(5, 2);

ALTER TABLE core.point_transactions
  ADD COLUMN IF NOT EXISTS base_amount NUMERIC(14, 2);

COMMENT ON COLUMN core.point_transactions.earn_rate_percent IS
  '적립 거래 시점의 적용 적립률(%). earn만 사용. 이후 설정 변경과 무관.';
COMMENT ON COLUMN core.point_transactions.base_amount IS
  '적립 대상 결제금액(원) 스냅샷. earn만 사용. 상품 가격 변경과 무관.';

-- 동일 판매에 대한 적립 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS uq_point_transactions_sale_earn
  ON core.point_transactions (organization_id, reference_id)
  WHERE type = 'earn'
    AND reference_type = 'sale'
    AND reference_id IS NOT NULL;

COMMIT;
