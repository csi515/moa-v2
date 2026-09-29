-- 수강료/교재비 수납 원자화 + 월 청구·영수증 unique.
-- 기존 payments / payment_transactions / textbook_sales / textbook_payments 를 사용한다.

ALTER TABLE core.payment_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

ALTER TABLE piano.textbook_payments
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

ALTER TABLE piano.textbook_sales
  DROP CONSTRAINT IF EXISTS textbook_sales_amounts_valid;
ALTER TABLE piano.textbook_sales
  ADD CONSTRAINT textbook_sales_amounts_valid
  CHECK (paid_amount >= 0 AND total_amount >= 0 AND paid_amount <= total_amount);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_tx_org_idempotency
  ON core.payment_transactions (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_tx_org_receipt
  ON core.payment_transactions (organization_id, receipt_number)
  WHERE receipt_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_piano_textbook_pay_org_idempotency
  ON piano.textbook_payments (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_piano_textbook_pay_org_receipt
  ON piano.textbook_payments (organization_id, receipt_number)
  WHERE receipt_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_core_payments_org_customer_year_month
  ON core.payments (organization_id, customer_id, (metadata->>'yearMonth'))
  WHERE status <> 'cancelled'
    AND COALESCE(metadata->>'yearMonth', '') <> '';

-- ── 수강료 수납 ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION core.record_tuition_payment(
  p_organization_id UUID,
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_payment_method core.payment_method,
  p_paid_at DATE DEFAULT CURRENT_DATE,
  p_memo TEXT DEFAULT NULL,
  p_cash_receipt_issued BOOLEAN DEFAULT false,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_inv core.payments%ROWTYPE;
  v_tx core.payment_transactions%ROWTYPE;
  v_key TEXT;
  v_apply NUMERIC;
  v_remaining NUMERIC;
  v_new_paid NUMERIC;
  v_status core.payment_status;
  v_receipt TEXT;
  v_tx_id UUID;
  v_meta JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_organization_id IS NULL OR p_invoice_id IS NULL OR p_payment_method IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_key := NULLIF(btrim(COALESCE(p_idempotency_key, '')), '');
  IF v_key IS NOT NULL THEN
    SELECT * INTO v_tx
    FROM core.payment_transactions t
    WHERE t.organization_id = p_organization_id
      AND t.idempotency_key = v_key;
    IF FOUND THEN
      SELECT * INTO v_inv FROM core.payments p WHERE p.id = v_tx.payment_id;
      RETURN jsonb_build_object(
        'action', 'idempotent',
        'invoice', to_jsonb(v_inv),
        'transaction', to_jsonb(v_tx)
      );
    END IF;
  END IF;

  SELECT * INTO v_inv
  FROM core.payments p
  WHERE p.id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  IF v_inv.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;
  IF v_inv.status = 'cancelled' THEN
    RAISE EXCEPTION 'Invoice cancelled';
  END IF;

  v_remaining := GREATEST(0, v_inv.billed_amount - v_inv.paid_amount);
  IF v_remaining <= 0 THEN
    RAISE EXCEPTION 'Invoice already paid';
  END IF;

  v_apply := LEAST(GREATEST(COALESCE(p_amount, 0), 0), v_remaining);
  IF v_apply <= 0 THEN
    RAISE EXCEPTION 'Invalid payment amount';
  END IF;

  v_tx_id := gen_random_uuid();
  v_receipt := 'REC-' || to_char(COALESCE(p_paid_at, CURRENT_DATE), 'YYYYMM')
    || '-' || substr(replace(v_tx_id::text, '-', ''), 1, 8);

  INSERT INTO core.payment_transactions (
    id, organization_id, payment_id, amount, payment_method,
    paid_at, receipt_number, memo, cash_receipt_issued, idempotency_key
  ) VALUES (
    v_tx_id, p_organization_id, v_inv.id, v_apply, p_payment_method,
    COALESCE(p_paid_at, CURRENT_DATE)::timestamptz,
    v_receipt, p_memo, COALESCE(p_cash_receipt_issued, false), v_key
  )
  RETURNING * INTO v_tx;

  v_new_paid := v_inv.paid_amount + v_apply;
  IF v_new_paid >= v_inv.billed_amount THEN
    v_status := 'paid';
  ELSIF v_new_paid > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'unpaid';
  END IF;

  v_meta := COALESCE(v_inv.metadata, '{}'::jsonb);
  v_meta := jsonb_set(v_meta, '{unpaidAmount}', to_jsonb(GREATEST(0, v_inv.billed_amount - v_new_paid)));

  UPDATE core.payments
  SET
    paid_amount = v_new_paid,
    status = v_status,
    payment_method = p_payment_method,
    paid_at = COALESCE(p_paid_at, CURRENT_DATE)::timestamptz,
    receipt_number = COALESCE(v_inv.receipt_number, v_receipt),
    metadata = v_meta,
    updated_at = now()
  WHERE id = v_inv.id
    AND organization_id = p_organization_id
  RETURNING * INTO v_inv;

  RETURN jsonb_build_object(
    'action', 'paid',
    'invoice', to_jsonb(v_inv),
    'transaction', to_jsonb(v_tx)
  );
END;
$$;

-- ── 교재비 수납 ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION core.record_textbook_payment(
  p_organization_id UUID,
  p_sale_id UUID,
  p_amount NUMERIC,
  p_payment_method core.payment_method,
  p_payment_date DATE DEFAULT CURRENT_DATE,
  p_memo TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_student_name TEXT DEFAULT NULL,
  p_textbook_title TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, piano, public
AS $$
DECLARE
  v_sale piano.textbook_sales%ROWTYPE;
  v_pay piano.textbook_payments%ROWTYPE;
  v_key TEXT;
  v_apply NUMERIC;
  v_remaining NUMERIC;
  v_new_paid NUMERIC;
  v_status piano.textbook_payment_status;
  v_receipt TEXT;
  v_pay_id UUID;
  v_meta JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_organization_id IS NULL OR p_sale_id IS NULL OR p_payment_method IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_key := NULLIF(btrim(COALESCE(p_idempotency_key, '')), '');
  IF v_key IS NOT NULL THEN
    SELECT * INTO v_pay
    FROM piano.textbook_payments t
    WHERE t.organization_id = p_organization_id
      AND t.idempotency_key = v_key;
    IF FOUND THEN
      SELECT * INTO v_sale FROM piano.textbook_sales s WHERE s.id = v_pay.textbook_sale_id;
      RETURN jsonb_build_object(
        'action', 'idempotent',
        'sale', to_jsonb(v_sale),
        'payment', to_jsonb(v_pay)
      );
    END IF;
  END IF;

  SELECT * INTO v_sale
  FROM piano.textbook_sales s
  WHERE s.id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Textbook sale not found';
  END IF;
  IF v_sale.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;

  v_remaining := GREATEST(0, v_sale.total_amount - v_sale.paid_amount);
  IF v_remaining <= 0 THEN
    RAISE EXCEPTION 'Textbook sale already paid';
  END IF;

  v_apply := LEAST(GREATEST(COALESCE(p_amount, 0), 0), v_remaining);
  IF v_apply <= 0 THEN
    RAISE EXCEPTION 'Invalid payment amount';
  END IF;

  v_pay_id := gen_random_uuid();
  v_receipt := 'RCP-TB-' || to_char(COALESCE(p_payment_date, CURRENT_DATE), 'YYYYMM')
    || '-' || substr(replace(v_pay_id::text, '-', ''), 1, 8);

  v_meta := jsonb_build_object(
    'studentName', COALESCE(p_student_name, ''),
    'textbookTitle', COALESCE(p_textbook_title, '')
  );

  INSERT INTO piano.textbook_payments (
    id, organization_id, textbook_sale_id, payment_date, amount,
    payment_method, memo, receipt_number, metadata, idempotency_key
  ) VALUES (
    v_pay_id, p_organization_id, v_sale.id, COALESCE(p_payment_date, CURRENT_DATE),
    v_apply, p_payment_method, p_memo, v_receipt, v_meta, v_key
  )
  RETURNING * INTO v_pay;

  v_new_paid := v_sale.paid_amount + v_apply;
  IF v_new_paid >= v_sale.total_amount THEN
    v_status := 'paid';
  ELSIF v_new_paid > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'unpaid';
  END IF;

  UPDATE piano.textbook_sales
  SET
    paid_amount = v_new_paid,
    status = v_status,
    payment_method = p_payment_method,
    updated_at = now()
  WHERE id = v_sale.id
    AND organization_id = p_organization_id
  RETURNING * INTO v_sale;

  RETURN jsonb_build_object(
    'action', 'paid',
    'sale', to_jsonb(v_sale),
    'payment', to_jsonb(v_pay)
  );
END;
$$;

-- ── 월 청구 1건 보장 ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION core.ensure_monthly_tuition_invoice(
  p_organization_id UUID,
  p_customer_id UUID,
  p_year_month TEXT,
  p_title TEXT,
  p_billed_amount NUMERIC,
  p_due_date DATE DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_invoice_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_row core.payments%ROWTYPE;
  v_meta JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_organization_id IS NULL OR p_customer_id IS NULL OR NULLIF(btrim(p_year_month), '') IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM core.customers c
    WHERE c.id = p_customer_id AND c.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Customer not found in organization';
  END IF;

  SELECT * INTO v_row
  FROM core.payments p
  WHERE p.organization_id = p_organization_id
    AND p.customer_id = p_customer_id
    AND p.status <> 'cancelled'
    AND p.metadata->>'yearMonth' = p_year_month
  FOR UPDATE;

  IF FOUND THEN
    RETURN jsonb_build_object('action', 'existing', 'invoice', to_jsonb(v_row));
  END IF;

  v_meta := COALESCE(p_metadata, '{}'::jsonb);
  v_meta := jsonb_set(v_meta, '{yearMonth}', to_jsonb(p_year_month), true);

  BEGIN
    INSERT INTO core.payments (
      id, organization_id, customer_id, title, billed_amount, paid_amount,
      due_date, status, metadata
    ) VALUES (
      COALESCE(p_invoice_id, gen_random_uuid()),
      p_organization_id,
      p_customer_id,
      COALESCE(NULLIF(btrim(p_title), ''), p_year_month || ' 수강료'),
      GREATEST(COALESCE(p_billed_amount, 0), 0),
      0,
      p_due_date,
      CASE WHEN GREATEST(COALESCE(p_billed_amount, 0), 0) <= 0 THEN 'paid' ELSE 'unpaid' END,
      v_meta
    )
    RETURNING * INTO v_row;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT * INTO v_row
      FROM core.payments p
      WHERE p.organization_id = p_organization_id
        AND p.customer_id = p_customer_id
        AND p.status <> 'cancelled'
        AND p.metadata->>'yearMonth' = p_year_month
      LIMIT 1;
      RETURN jsonb_build_object('action', 'existing', 'invoice', to_jsonb(v_row));
  END;

  RETURN jsonb_build_object('action', 'created', 'invoice', to_jsonb(v_row));
END;
$$;

COMMENT ON FUNCTION core.record_tuition_payment(UUID, UUID, NUMERIC, core.payment_method, DATE, TEXT, BOOLEAN, TEXT) IS
  '수강료 수납 원자 RPC. payments FOR UPDATE + transaction insert. paid_amount <= billed_amount.';
COMMENT ON FUNCTION core.record_textbook_payment(UUID, UUID, NUMERIC, core.payment_method, DATE, TEXT, TEXT, TEXT, TEXT) IS
  '교재비 수납 원자 RPC. textbook_sales FOR UPDATE + payment insert. paid <= total.';
COMMENT ON FUNCTION core.ensure_monthly_tuition_invoice(UUID, UUID, TEXT, TEXT, NUMERIC, DATE, JSONB, UUID) IS
  '학생+조직+연월 청구 1건. unique index + unique_violation 재조회.';

REVOKE ALL ON FUNCTION core.record_tuition_payment(UUID, UUID, NUMERIC, core.payment_method, DATE, TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION core.record_textbook_payment(UUID, UUID, NUMERIC, core.payment_method, DATE, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION core.ensure_monthly_tuition_invoice(UUID, UUID, TEXT, TEXT, NUMERIC, DATE, JSONB, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.record_tuition_payment(UUID, UUID, NUMERIC, core.payment_method, DATE, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.record_textbook_payment(UUID, UUID, NUMERIC, core.payment_method, DATE, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.ensure_monthly_tuition_invoice(UUID, UUID, TEXT, TEXT, NUMERIC, DATE, JSONB, UUID) TO authenticated;
