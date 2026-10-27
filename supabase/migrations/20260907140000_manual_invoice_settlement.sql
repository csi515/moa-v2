-- Manual invoice send + onsite settlement (no PG auto-pay)
-- Maps product "invoices" → core.payments, "payment_records" → core.payment_transactions

-- =============================================
-- 1. Payment method: local currency / onsite card
-- =============================================
DO $$
BEGIN
  ALTER TYPE core.payment_method ADD VALUE IF NOT EXISTS 'local_currency';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE core.payment_method ADD VALUE IF NOT EXISTS 'onsite_card';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- 2. Invoice send timestamp + cash receipt on ledger
-- =============================================
ALTER TABLE core.payments
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

COMMENT ON COLUMN core.payments.sent_at IS
  '원장이 청구서를 수동 발송한 시각. NULL이면 미발송(초안) 또는 레거시.';

ALTER TABLE core.payment_transactions
  ADD COLUMN IF NOT EXISTS cash_receipt_issued BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN core.payment_transactions.cash_receipt_issued IS
  '현금영수증 발행 여부(수기 수납 시 기록)';

CREATE INDEX IF NOT EXISTS idx_payments_org_sent_at
  ON core.payments (organization_id, sent_at DESC NULLS LAST);

-- =============================================
-- 3. RLS — parent + adult student read own invoices
-- =============================================
DROP POLICY IF EXISTS payments_select ON core.payments;
CREATE POLICY payments_select ON core.payments
  FOR SELECT TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR core.parent_owns_student(organization_id, customer_id)
    OR EXISTS (
      SELECT 1 FROM core.customers c
      WHERE c.id = customer_id
        AND c.organization_id = payments.organization_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS payment_transactions_select ON core.payment_transactions;
CREATE POLICY payment_transactions_select ON core.payment_transactions
  FOR SELECT TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR EXISTS (
      SELECT 1 FROM core.payments p
      WHERE p.id = payment_id
        AND p.organization_id = payment_transactions.organization_id
        AND (
          core.parent_owns_student(p.organization_id, p.customer_id)
          OR EXISTS (
            SELECT 1 FROM core.customers c
            WHERE c.id = p.customer_id
              AND c.organization_id = p.organization_id
              AND c.user_id = auth.uid()
          )
        )
    )
  );

-- =============================================
-- 4. Parent/student: request cash receipt (metadata only)
-- =============================================
CREATE OR REPLACE FUNCTION core.request_payment_cash_receipt(p_payment_id UUID)
RETURNS core.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_row core.payments;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row
  FROM core.payments
  WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF NOT (
    core.parent_owns_student(v_row.organization_id, v_row.customer_id)
    OR EXISTS (
      SELECT 1 FROM core.customers c
      WHERE c.id = v_row.customer_id
        AND c.organization_id = v_row.organization_id
        AND c.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE core.payments
  SET
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('cashReceiptRequested', true),
    updated_at = now()
  WHERE id = p_payment_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION core.request_payment_cash_receipt(UUID) IS
  '학부모/성인 수강생이 청구서에 현금영수증 발행을 요청합니다.';

GRANT EXECUTE ON FUNCTION core.request_payment_cash_receipt(UUID) TO authenticated;
