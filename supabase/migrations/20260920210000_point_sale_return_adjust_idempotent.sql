-- 반품 포인트 보정(adjust) idempotent 제약
-- sale_return당 적립 취소(음수) 1건 + 사용 복구(양수) 1건

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_point_transactions_sale_return_earn_clawback
  ON core.point_transactions (organization_id, reference_id)
  WHERE type = 'adjust'
    AND reference_type = 'sale_return'
    AND reference_id IS NOT NULL
    AND amount < 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_point_transactions_sale_return_redeem_restore
  ON core.point_transactions (organization_id, reference_id)
  WHERE type = 'adjust'
    AND reference_type = 'sale_return'
    AND reference_id IS NOT NULL
    AND amount > 0;

COMMENT ON INDEX core.uq_point_transactions_sale_return_earn_clawback IS
  '반품당 적립 취소(adjust 음수) 중복 방지';
COMMENT ON INDEX core.uq_point_transactions_sale_return_redeem_restore IS
  '반품당 사용 복구(adjust 양수) 중복 방지';

COMMIT;
