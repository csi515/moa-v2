-- Core Loyalty 포인트 데이터 모델 (PointAccount / PointTransaction)
-- 사업장×고객 잔액 + 이력. 판매 UI·적립 계산·소멸은 별도.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'core' AND t.typname = 'point_transaction_type'
  ) THEN
    CREATE TYPE core.point_transaction_type AS ENUM (
      'earn',    -- 적립 (+)
      'redeem',  -- 사용 (-)
      'adjust'   -- 보정 (부호 있는 amount)
    );
  END IF;
END $$;

COMMENT ON TYPE core.point_transaction_type IS
  '포인트 거래 유형. amount 부호와 함께 이력화. 과거 거래는 설정 변경으로 재계산하지 않음.';

CREATE TABLE IF NOT EXISTS core.point_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  balance           NUMERIC(14, 2) NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT point_accounts_balance_nonneg_chk CHECK (balance >= 0)
);

COMMENT ON TABLE core.point_accounts IS
  '고객별 사업장 포인트 잔액. (organization_id, customer_id) 유일 — 사업장 간 분리.';
COMMENT ON COLUMN core.point_accounts.organization_id IS '사업장(필수). 포인트는 사업장별로 분리.';
COMMENT ON COLUMN core.point_accounts.customer_id IS 'Core Customer(필수).';
COMMENT ON COLUMN core.point_accounts.balance IS '현재 잔액. 변경은 point_transactions 이력으로 추적.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_point_accounts_org_customer
  ON core.point_accounts (organization_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_point_accounts_org
  ON core.point_accounts (organization_id);

CREATE INDEX IF NOT EXISTS idx_point_accounts_customer
  ON core.point_accounts (customer_id);

DROP TRIGGER IF EXISTS set_updated_at ON core.point_accounts;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON core.point_accounts
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE IF NOT EXISTS core.point_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  type              core.point_transaction_type NOT NULL,
  amount            NUMERIC(14, 2) NOT NULL,
  balance_after     NUMERIC(14, 2) NOT NULL,
  reference_type    TEXT,
  reference_id      UUID,
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT point_transactions_amount_nonzero_chk CHECK (amount <> 0),
  CONSTRAINT point_transactions_balance_after_nonneg_chk CHECK (balance_after >= 0)
);

COMMENT ON TABLE core.point_transactions IS
  '포인트 거래 이력(append 권장). amount는 부호 있는 증감(적립+, 사용-). balance_after는 거래 직후 잔액 스냅샷.';
COMMENT ON COLUMN core.point_transactions.organization_id IS '사업장(필수).';
COMMENT ON COLUMN core.point_transactions.customer_id IS 'Core Customer(필수).';
COMMENT ON COLUMN core.point_transactions.type IS 'earn|redeem|adjust';
COMMENT ON COLUMN core.point_transactions.amount IS '증감량(부호 포함). 과거 이력은 재계산하지 않음.';
COMMENT ON COLUMN core.point_transactions.balance_after IS '이 거래 반영 직후 잔액. 설정 변경과 무관하게 고정.';
COMMENT ON COLUMN core.point_transactions.reference_type IS '연관 도메인 키(예: sale) — 선택';
COMMENT ON COLUMN core.point_transactions.reference_id IS '연관 레코드 id — 선택';

CREATE INDEX IF NOT EXISTS idx_point_transactions_org_created
  ON core.point_transactions (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_point_transactions_org_customer_created
  ON core.point_transactions (organization_id, customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_point_transactions_reference
  ON core.point_transactions (organization_id, reference_type, reference_id)
  WHERE reference_id IS NOT NULL;

ALTER TABLE core.point_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.point_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_point_accounts_select ON core.point_accounts;
CREATE POLICY core_point_accounts_select
  ON core.point_accounts
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_admin(organization_id));

DROP POLICY IF EXISTS core_point_accounts_admin ON core.point_accounts;
CREATE POLICY core_point_accounts_admin
  ON core.point_accounts
  FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

DROP POLICY IF EXISTS core_point_transactions_select ON core.point_transactions;
CREATE POLICY core_point_transactions_select
  ON core.point_transactions
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_admin(organization_id));

-- 이력은 관리자 쓰기 (앱은 append-only 권장)
DROP POLICY IF EXISTS core_point_transactions_admin ON core.point_transactions;
CREATE POLICY core_point_transactions_admin
  ON core.point_transactions
  FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

COMMIT;
