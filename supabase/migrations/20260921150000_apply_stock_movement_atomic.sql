-- 일반 재고 변경 원자 RPC (inbound / adjustment / sale / return)
-- movement INSERT + inventory UPDATE를 동일 트랜잭션·FOR UPDATE로 처리

BEGIN;

ALTER TABLE core.inventory
  DROP CONSTRAINT IF EXISTS inventory_quantity_nonneg_chk;
ALTER TABLE core.inventory
  ADD CONSTRAINT inventory_quantity_nonneg_chk CHECK (quantity >= 0);

COMMENT ON CONSTRAINT inventory_quantity_nonneg_chk ON core.inventory IS
  '재고 잔량 음수 금지 (원자 RPC·create_sale과 동일 계약)';

CREATE OR REPLACE FUNCTION core.apply_stock_movement(
  p_organization_id UUID,
  p_product_id UUID,
  p_variant_id UUID,
  p_movement_type core.stock_movement_type,
  p_quantity NUMERIC,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_product_org UUID;
  v_variant_product UUID;
  v_delta NUMERIC(14, 3);
  v_qty_abs NUMERIC(14, 3);
  v_inv core.inventory%ROWTYPE;
  v_after NUMERIC(14, 3);
  v_mov core.stock_movements%ROWTYPE;
  v_ref_type TEXT;
  v_reason TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT core.is_org_admin(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_product_id IS NULL THEN
    RAISE EXCEPTION '상품을 선택해 주세요.';
  END IF;

  SELECT p.organization_id INTO v_product_org
  FROM core.products p
  WHERE p.id = p_product_id;

  IF v_product_org IS NULL THEN
    RAISE EXCEPTION '상품을 찾을 수 없습니다.';
  END IF;
  IF v_product_org <> p_organization_id THEN
    RAISE EXCEPTION 'product organization_id mismatch';
  END IF;

  IF p_variant_id IS NOT NULL THEN
    SELECT v.product_id INTO v_variant_product
    FROM core.product_variants v
    WHERE v.id = p_variant_id;
    IF v_variant_product IS NULL THEN
      RAISE EXCEPTION '선택한 옵션이 상품과 일치하지 않습니다.';
    END IF;
    IF v_variant_product <> p_product_id THEN
      RAISE EXCEPTION '선택한 옵션이 상품과 일치하지 않습니다.';
    END IF;
  END IF;

  v_reason := NULLIF(btrim(COALESCE(p_reason, '')), '');
  v_ref_type := NULLIF(btrim(COALESCE(p_reference_type, '')), '');

  IF p_movement_type = 'inbound' THEN
    v_qty_abs := COALESCE(p_quantity, 0);
    IF v_qty_abs <= 0 THEN
      RAISE EXCEPTION '입고 수량은 0보다 커야 합니다.';
    END IF;
    v_delta := v_qty_abs;

  ELSIF p_movement_type = 'adjustment' THEN
    IF p_quantity IS NULL
       OR p_quantity <> trunc(p_quantity)
       OR trunc(p_quantity) = 0 THEN
      RAISE EXCEPTION '조정 수량은 0이 아닌 정수여야 합니다.';
    END IF;
    v_delta := trunc(p_quantity);
    IF v_reason IS NULL THEN
      RAISE EXCEPTION '조정 사유를 입력해 주세요.';
    END IF;

  ELSIF p_movement_type = 'sale' THEN
    v_qty_abs := trunc(COALESCE(p_quantity, 0));
    IF v_qty_abs <= 0 THEN
      RAISE EXCEPTION '판매 차감 수량은 0보다 커야 합니다.';
    END IF;
    IF p_reference_id IS NULL THEN
      RAISE EXCEPTION '판매 참조(saleId)가 필요합니다.';
    END IF;
    IF v_ref_type IS NULL OR v_ref_type NOT IN ('sale', 'textbook_sale') THEN
      v_ref_type := 'sale';
    END IF;
    v_delta := -v_qty_abs;

  ELSIF p_movement_type = 'return' THEN
    v_qty_abs := trunc(COALESCE(p_quantity, 0));
    IF v_qty_abs <= 0 THEN
      RAISE EXCEPTION '반품 복구 수량은 0보다 커야 합니다.';
    END IF;
    IF p_reference_id IS NULL THEN
      RAISE EXCEPTION '반품 참조(saleReturnId)가 필요합니다.';
    END IF;
    IF v_ref_type IS NULL OR v_ref_type NOT IN ('sale_return', 'textbook_sale') THEN
      v_ref_type := 'sale_return';
    END IF;
    v_delta := v_qty_abs;

  ELSE
    RAISE EXCEPTION 'unsupported movement_type';
  END IF;

  -- 재고 행 확보 후 잠금 (동일 SKU 직렬화)
  IF p_variant_id IS NULL THEN
    INSERT INTO core.inventory (organization_id, product_id, variant_id, quantity)
    VALUES (p_organization_id, p_product_id, NULL, 0)
    ON CONFLICT (organization_id, product_id) WHERE (variant_id IS NULL AND product_id IS NOT NULL)
    DO NOTHING;

    SELECT * INTO v_inv
    FROM core.inventory
    WHERE organization_id = p_organization_id
      AND product_id = p_product_id
      AND variant_id IS NULL
    FOR UPDATE;
  ELSE
    INSERT INTO core.inventory (organization_id, product_id, variant_id, quantity)
    VALUES (p_organization_id, p_product_id, p_variant_id, 0)
    ON CONFLICT (organization_id, variant_id) WHERE (variant_id IS NOT NULL)
    DO NOTHING;

    SELECT * INTO v_inv
    FROM core.inventory
    WHERE organization_id = p_organization_id
      AND variant_id = p_variant_id
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION '재고 행을 준비하지 못했습니다.';
  END IF;

  v_after := v_inv.quantity + v_delta;
  IF v_after < 0 THEN
    IF p_movement_type = 'sale' THEN
      RAISE EXCEPTION '재고가 부족합니다. (현재 %)',
        trim(to_char(v_inv.quantity, 'FM999999999999990.999'));
    ELSIF p_movement_type = 'adjustment' THEN
      RAISE EXCEPTION '조정 후 재고가 음수가 됩니다. (현재 %, 조정 %)',
        trim(to_char(v_inv.quantity, 'FM999999999999990.999')),
        trim(to_char(v_delta, 'FM999999999999990.999'));
    ELSE
      RAISE EXCEPTION '재고가 음수가 됩니다.';
    END IF;
  END IF;

  INSERT INTO core.stock_movements (
    organization_id,
    product_id,
    variant_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    reason
  ) VALUES (
    p_organization_id,
    p_product_id,
    p_variant_id,
    p_movement_type,
    v_delta,
    v_ref_type,
    p_reference_id,
    v_reason
  )
  RETURNING * INTO v_mov;

  UPDATE core.inventory
  SET quantity = v_after,
      updated_at = now()
  WHERE id = v_inv.id
    AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '재고 갱신에 실패했습니다.';
  END IF;

  RETURN jsonb_build_object(
    'movement', jsonb_build_object(
      'id', v_mov.id,
      'organization_id', v_mov.organization_id,
      'product_id', v_mov.product_id,
      'variant_id', v_mov.variant_id,
      'movement_type', v_mov.movement_type,
      'quantity', v_mov.quantity,
      'reference_type', v_mov.reference_type,
      'reference_id', v_mov.reference_id,
      'reason', v_mov.reason,
      'created_at', v_mov.created_at
    ),
    'quantity_after', v_after
  );
END;
$$;

COMMENT ON FUNCTION core.apply_stock_movement(
  UUID, UUID, UUID, core.stock_movement_type, NUMERIC, TEXT, UUID, TEXT
) IS
  '재고 변경 원자 RPC. inventory FOR UPDATE + movement INSERT + quantity UPDATE. 음수 잔량 차단.';

GRANT EXECUTE ON FUNCTION core.apply_stock_movement(
  UUID, UUID, UUID, core.stock_movement_type, NUMERIC, TEXT, UUID, TEXT
) TO authenticated;
REVOKE EXECUTE ON FUNCTION core.apply_stock_movement(
  UUID, UUID, UUID, core.stock_movement_type, NUMERIC, TEXT, UUID, TEXT
) FROM anon;

COMMIT;
