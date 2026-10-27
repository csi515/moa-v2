-- 반품 포인트 adjust 원자 처리 (FOR UPDATE)
-- sale_return당 earn clawback(음수) / redeem restore(양수) 각각 멱등

BEGIN;

CREATE OR REPLACE FUNCTION core.apply_point_adjust_for_sale_return(
  p_organization_id UUID,
  p_customer_id UUID,
  p_return_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_amount NUMERIC(14, 2);
  v_account core.point_accounts%ROWTYPE;
  v_balance_after NUMERIC(14, 2);
  v_tx core.point_transactions%ROWTYPE;
  v_existing_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT core.is_org_admin(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_customer_id IS NULL OR p_return_id IS NULL THEN
    RAISE EXCEPTION 'customer_id and return_id are required';
  END IF;

  v_amount := trunc(COALESCE(p_amount, 0));
  IF v_amount = 0 THEN
    RETURN jsonb_build_object(
      'skipped', true,
      'reason', 'zero_amount',
      'duplicate', false,
      'transaction', NULL
    );
  END IF;

  -- 동일 returnId + 부호 방향 기존 행이면 skip (부분 실패 복구)
  IF v_amount < 0 THEN
    SELECT id INTO v_existing_id
    FROM core.point_transactions
    WHERE organization_id = p_organization_id
      AND reference_type = 'sale_return'
      AND reference_id = p_return_id
      AND type = 'adjust'
      AND amount < 0
    LIMIT 1;
  ELSE
    SELECT id INTO v_existing_id
    FROM core.point_transactions
    WHERE organization_id = p_organization_id
      AND reference_type = 'sale_return'
      AND reference_id = p_return_id
      AND type = 'adjust'
      AND amount > 0
    LIMIT 1;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'skipped', true,
      'reason', 'already_adjusted',
      'duplicate', true,
      'transaction', NULL
    );
  END IF;

  INSERT INTO core.point_accounts (organization_id, customer_id, balance)
  VALUES (p_organization_id, p_customer_id, 0)
  ON CONFLICT (organization_id, customer_id) DO NOTHING;

  SELECT *
  INTO v_account
  FROM core.point_accounts
  WHERE organization_id = p_organization_id
    AND customer_id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '포인트 계정을 준비하지 못했습니다.';
  END IF;

  v_balance_after := v_account.balance + v_amount;
  IF v_balance_after < 0 THEN
    RAISE EXCEPTION '%',
      format(
        '포인트 잔액이 부족하여 반품 적립 취소를 완료할 수 없습니다. (잔액 %sP)',
        trim(to_char(v_account.balance, 'FM999999999999990'))
      );
  END IF;

  BEGIN
    INSERT INTO core.point_transactions (
      organization_id,
      customer_id,
      type,
      amount,
      balance_after,
      earn_rate_percent,
      base_amount,
      reference_type,
      reference_id,
      description
    ) VALUES (
      p_organization_id,
      p_customer_id,
      'adjust',
      v_amount,
      v_balance_after,
      NULL,
      NULL,
      'sale_return',
      p_return_id,
      NULLIF(btrim(COALESCE(p_description, '')), '')
    )
    RETURNING * INTO v_tx;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'skipped', true,
        'reason', 'already_adjusted',
        'duplicate', true,
        'transaction', NULL
      );
  END;

  UPDATE core.point_accounts
  SET balance = v_balance_after,
      updated_at = now()
  WHERE id = v_account.id
    AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '포인트 잔액 갱신에 실패했습니다.';
  END IF;

  RETURN jsonb_build_object(
    'skipped', false,
    'duplicate', false,
    'transaction', jsonb_build_object(
      'id', v_tx.id,
      'organization_id', v_tx.organization_id,
      'customer_id', v_tx.customer_id,
      'type', v_tx.type,
      'amount', v_tx.amount,
      'balance_after', v_tx.balance_after,
      'earn_rate_percent', v_tx.earn_rate_percent,
      'base_amount', v_tx.base_amount,
      'reference_type', v_tx.reference_type,
      'reference_id', v_tx.reference_id,
      'description', v_tx.description,
      'created_at', v_tx.created_at
    )
  );
END;
$$;

COMMENT ON FUNCTION core.apply_point_adjust_for_sale_return(UUID, UUID, UUID, NUMERIC, TEXT) IS
  '반품 포인트 adjust 원자 RPC. FOR UPDATE + unique(sale_return, 부호) 멱등. earn clawback/redeem restore 독립 재처리.';

GRANT EXECUTE ON FUNCTION core.apply_point_adjust_for_sale_return(UUID, UUID, UUID, NUMERIC, TEXT)
  TO authenticated;
REVOKE EXECUTE ON FUNCTION core.apply_point_adjust_for_sale_return(UUID, UUID, UUID, NUMERIC, TEXT)
  FROM anon;

COMMIT;
