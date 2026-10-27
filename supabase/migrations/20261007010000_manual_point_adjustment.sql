BEGIN;

CREATE OR REPLACE FUNCTION core.apply_point_manual_adjust(
  p_organization_id UUID,
  p_customer_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $func$
DECLARE
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_tx_id UUID;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Authenticate and authorize
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check permission (e.g., admin or staff)
  IF NOT core.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'Amount must not be zero';
  END IF;

  -- Upsert point balance for customer
  INSERT INTO core.point_accounts (organization_id, customer_id, balance, updated_at)
  VALUES (p_organization_id, p_customer_id, 0, v_now)
  ON CONFLICT (organization_id, customer_id) DO NOTHING;

  -- Lock row
  SELECT balance INTO v_balance_before
  FROM core.point_accounts
  WHERE organization_id = p_organization_id
    AND customer_id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer point balance not found';
  END IF;

  v_balance_after := v_balance_before + p_amount;
  IF v_balance_after < 0 THEN
    RAISE EXCEPTION '잔여 포인트가 부족합니다.';
  END IF;

  UPDATE core.point_accounts
  SET balance = v_balance_after,
      updated_at = v_now
  WHERE organization_id = p_organization_id
    AND customer_id = p_customer_id;

  INSERT INTO core.point_transactions (
    organization_id, customer_id, type, amount, balance_after,
    description, created_at
  ) VALUES (
    p_organization_id, p_customer_id, 'adjust', p_amount, v_balance_after,
    p_description, v_now
  ) RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'transaction_id', v_tx_id,
    'amount', p_amount,
    'balance_after', v_balance_after
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION core.apply_point_manual_adjust(UUID, UUID, NUMERIC, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION core.apply_point_manual_adjust(UUID, UUID, NUMERIC, TEXT) FROM anon;

COMMIT;
