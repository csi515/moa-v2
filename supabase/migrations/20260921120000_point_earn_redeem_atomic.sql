-- point_accounts 잔액 변경 원자화: SELECT FOR UPDATE + tx INSERT + balance UPDATE
-- 클라이언트 read-modify-write 레이스 제거. earn/redeem idempotency 인덱스 유지.

BEGIN;

-- ---------------------------------------------------------------------------
-- Redeem (sale): 잔액 직렬화 + 부족 시 전체 실패
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.apply_point_redeem_for_sale(
  p_organization_id UUID,
  p_customer_id UUID,
  p_sale_id UUID,
  p_points_to_use NUMERIC,
  p_sale_total_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_requested NUMERIC(14, 2);
  v_sale_total NUMERIC(14, 2);
  v_account core.point_accounts%ROWTYPE;
  v_balance NUMERIC(14, 2);
  v_balance_after NUMERIC(14, 2);
  v_delta NUMERIC(14, 2);
  v_tx core.point_transactions%ROWTYPE;
  v_existing_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT core.is_org_admin(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION '포인트를 사용하려면 고객을 선택해 주세요.';
  END IF;

  IF p_sale_id IS NULL THEN
    RAISE EXCEPTION 'sale_id is required';
  END IF;

  v_requested := FLOOR(GREATEST(COALESCE(p_points_to_use, 0), 0));
  IF v_requested <= 0 THEN
    RETURN jsonb_build_object(
      'skipped', true,
      'reason', 'zero_points',
      'points_used', 0,
      'transaction', NULL
    );
  END IF;

  v_sale_total := GREATEST(COALESCE(p_sale_total_amount, 0), 0);
  IF v_requested > v_sale_total THEN
    RAISE EXCEPTION '사용 포인트는 결제금액을 초과할 수 없습니다.';
  END IF;

  -- 멱등: 이미 redeem 있으면 skip (락 전에 빠른 경로)
  SELECT id INTO v_existing_id
  FROM core.point_transactions
  WHERE organization_id = p_organization_id
    AND reference_type = 'sale'
    AND reference_id = p_sale_id
    AND type = 'redeem'
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'skipped', true,
      'reason', 'already_redeemed',
      'points_used', 0,
      'transaction', NULL
    );
  END IF;

  SELECT *
  INTO v_account
  FROM core.point_accounts
  WHERE organization_id = p_organization_id
    AND customer_id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '사용 가능한 포인트가 없습니다.';
  END IF;

  v_balance := v_account.balance;
  IF v_requested > v_balance THEN
    RAISE EXCEPTION '%',
      format(
        '포인트가 부족합니다. (잔액 %sP, 요청 %sP)',
        trim(to_char(v_balance, 'FM999999999999990')),
        trim(to_char(v_requested, 'FM999999999999990'))
      );
  END IF;

  v_delta := -v_requested;
  v_balance_after := v_balance + v_delta;
  IF v_balance_after < 0 THEN
    RAISE EXCEPTION '포인트 잔액이 부족합니다.';
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
      'redeem',
      v_delta,
      v_balance_after,
      NULL,
      NULL,
      'sale',
      p_sale_id,
      format('판매 포인트 사용 %sP', trim(to_char(v_requested, 'FM999999999999990')))
    )
    RETURNING * INTO v_tx;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'skipped', true,
        'reason', 'already_redeemed',
        'points_used', 0,
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
    'points_used', v_requested,
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

COMMENT ON FUNCTION core.apply_point_redeem_for_sale(UUID, UUID, UUID, NUMERIC, NUMERIC) IS
  '판매 포인트 사용: point_accounts FOR UPDATE 후 tx INSERT + balance UPDATE 원자 처리. 음수 잔액 차단.';

GRANT EXECUTE ON FUNCTION core.apply_point_redeem_for_sale(UUID, UUID, UUID, NUMERIC, NUMERIC)
  TO authenticated;
REVOKE EXECUTE ON FUNCTION core.apply_point_redeem_for_sale(UUID, UUID, UUID, NUMERIC, NUMERIC)
  FROM anon;

-- ---------------------------------------------------------------------------
-- Earn (sale): 계정 확보 + FOR UPDATE + tx/balance 원자 처리
-- 적립액·요율은 앱 정책 계산값을 그대로 스냅샷(정책 변경 없음)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.apply_point_earn_for_sale(
  p_organization_id UUID,
  p_customer_id UUID,
  p_sale_id UUID,
  p_points_earned NUMERIC,
  p_earn_rate_percent NUMERIC,
  p_base_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_points NUMERIC(14, 2);
  v_rate NUMERIC(5, 2);
  v_base NUMERIC(14, 2);
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

  IF p_customer_id IS NULL THEN
    RETURN jsonb_build_object(
      'skipped', true,
      'reason', 'no_customer',
      'points_earned', 0,
      'earn_rate_percent', p_earn_rate_percent,
      'base_amount', p_base_amount,
      'transaction', NULL
    );
  END IF;

  IF p_sale_id IS NULL THEN
    RAISE EXCEPTION 'sale_id is required';
  END IF;

  v_points := FLOOR(GREATEST(COALESCE(p_points_earned, 0), 0));
  v_rate := COALESCE(p_earn_rate_percent, 0);
  v_base := GREATEST(COALESCE(p_base_amount, 0), 0);

  IF v_points <= 0 THEN
    RETURN jsonb_build_object(
      'skipped', true,
      'reason', 'zero_points',
      'points_earned', 0,
      'earn_rate_percent', v_rate,
      'base_amount', v_base,
      'transaction', NULL
    );
  END IF;

  SELECT id INTO v_existing_id
  FROM core.point_transactions
  WHERE organization_id = p_organization_id
    AND reference_type = 'sale'
    AND reference_id = p_sale_id
    AND type = 'earn'
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'skipped', true,
      'reason', 'already_earned',
      'points_earned', 0,
      'earn_rate_percent', v_rate,
      'base_amount', v_base,
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

  v_balance_after := v_account.balance + v_points;

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
      'earn',
      v_points,
      v_balance_after,
      v_rate,
      v_base,
      'sale',
      p_sale_id,
      format('판매 적립 %s%%', trim(to_char(v_rate, 'FM990.0')))
    )
    RETURNING * INTO v_tx;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'skipped', true,
        'reason', 'already_earned',
        'points_earned', 0,
        'earn_rate_percent', v_rate,
        'base_amount', v_base,
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
    'points_earned', v_points,
    'earn_rate_percent', v_rate,
    'base_amount', v_base,
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

COMMENT ON FUNCTION core.apply_point_earn_for_sale(UUID, UUID, UUID, NUMERIC, NUMERIC, NUMERIC) IS
  '판매 포인트 적립: 계정 upsert 후 FOR UPDATE, tx INSERT + balance UPDATE 원자 처리.';

GRANT EXECUTE ON FUNCTION core.apply_point_earn_for_sale(UUID, UUID, UUID, NUMERIC, NUMERIC, NUMERIC)
  TO authenticated;
REVOKE EXECUTE ON FUNCTION core.apply_point_earn_for_sale(UUID, UUID, UUID, NUMERIC, NUMERIC, NUMERIC)
  FROM anon;

COMMIT;
