-- Invoice(payments)에서 마지막 수납 snapshot 쓰기를 제거한다.
-- payment_method / paid_at 원장은 payment_transactions.
-- 잔액·상태·영수증 번호는 Invoice에 유지. 함수 시그니처 변경 없음.

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

CREATE OR REPLACE FUNCTION core.sync_payment_from_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_total_paid NUMERIC(12, 2);
  v_billed NUMERIC(12, 2);
  v_new_status core.payment_status;
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM core.payment_transactions
  WHERE payment_id = NEW.payment_id;

  SELECT billed_amount INTO v_billed
  FROM core.payments
  WHERE id = NEW.payment_id;

  IF v_total_paid >= v_billed AND v_billed > 0 THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'unpaid';
  END IF;

  UPDATE core.payments
  SET
    paid_amount = v_total_paid,
    status = v_new_status,
    updated_at = now()
  WHERE id = NEW.payment_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION core.record_tuition_payment(UUID, UUID, NUMERIC, core.payment_method, DATE, TEXT, BOOLEAN, TEXT) IS
  '수강료 수납. Invoice는 잔액/상태만 갱신. 마지막 수납 method/date는 payment_transactions.';
