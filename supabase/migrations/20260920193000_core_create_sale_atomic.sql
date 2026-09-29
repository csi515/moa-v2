-- Core 판매 원자 처리 RPC
-- sales + sale_items + stock_movements + inventory 를 단일 트랜잭션으로 처리.
-- 재고는 FOR UPDATE 잠금 후 합산 수량 검증 → 부족 시 전체 rollback.
-- 기존 테이블 스키마는 변경하지 않는다.

BEGIN;

CREATE OR REPLACE FUNCTION core.create_sale(
  p_organization_id UUID,
  p_customer_id UUID DEFAULT NULL,
  p_payment_method core.payment_method DEFAULT 'cash',
  p_points_used NUMERIC DEFAULT 0,
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_sale core.sales%ROWTYPE;
  v_items_out JSONB;
  v_lines JSONB := '[]'::jsonb;
  v_item JSONB;
  v_idx INT;
  v_n INT;
  v_product_id UUID;
  v_variant_id UUID;
  v_snapshot TEXT;
  v_qty NUMERIC(14, 3);
  v_unit NUMERIC(14, 2);
  v_discount NUMERIC(14, 2);
  v_line_amount NUMERIC(14, 2);
  v_total NUMERIC(14, 2) := 0;
  v_points NUMERIC(14, 2);
  v_product_org UUID;
  v_variant_product UUID;
  v_agg RECORD;
  v_inv RECORD;
  v_available NUMERIC(14, 3);
  v_shortfall_detail TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- sales/inventory 쓰기 RLS(is_org_admin)과 동일한 권한 게이트
  IF NOT core.is_org_admin(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION '판매할 상품을 담아 주세요.';
  END IF;

  v_n := jsonb_array_length(p_items);
  IF v_n IS NULL OR v_n < 1 THEN
    RAISE EXCEPTION '판매할 상품을 담아 주세요.';
  END IF;

  IF p_customer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM core.customers c
    WHERE c.id = p_customer_id
      AND c.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Customer not found in organization';
  END IF;

  FOR v_idx IN 0 .. (v_n - 1) LOOP
    v_item := p_items -> v_idx;
    IF v_item IS NULL OR jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION '판매 라인이 올바르지 않습니다.';
    END IF;

    BEGIN
      v_product_id := NULLIF(btrim(COALESCE(v_item->>'product_id', '')), '')::UUID;
    EXCEPTION
      WHEN invalid_text_representation THEN
        RAISE EXCEPTION '판매 상품이 없습니다.';
    END;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION '판매 상품이 없습니다.';
    END IF;

    IF v_item->>'variant_id' IS NULL
       OR btrim(v_item->>'variant_id') = ''
       OR lower(btrim(v_item->>'variant_id')) = 'null' THEN
      v_variant_id := NULL;
    ELSE
      BEGIN
        v_variant_id := btrim(v_item->>'variant_id')::UUID;
      EXCEPTION
        WHEN invalid_text_representation THEN
          RAISE EXCEPTION 'variant % not found', v_item->>'variant_id';
      END;
    END IF;

    v_snapshot := btrim(COALESCE(v_item->>'product_name_snapshot', ''));
    IF v_snapshot = '' THEN
      v_snapshot := '상품';
    END IF;

    v_qty := COALESCE((v_item->>'quantity')::NUMERIC, 0);
    v_unit := COALESCE((v_item->>'unit_price')::NUMERIC, -1);
    v_discount := GREATEST(0, COALESCE((v_item->>'discount_amount')::NUMERIC, 0));

    IF v_qty IS NULL OR v_qty <= 0 OR v_qty <> trunc(v_qty) THEN
      RAISE EXCEPTION '수량은 1 이상의 정수여야 합니다.';
    END IF;
    IF v_unit IS NULL OR v_unit < 0 THEN
      RAISE EXCEPTION '단가가 올바르지 않습니다.';
    END IF;

    SELECT p.organization_id
      INTO v_product_org
    FROM core.products p
    WHERE p.id = v_product_id;

    IF v_product_org IS NULL THEN
      RAISE EXCEPTION 'product % not found', v_product_id;
    END IF;
    IF v_product_org <> p_organization_id THEN
      RAISE EXCEPTION 'product organization_id mismatch';
    END IF;

    IF v_variant_id IS NOT NULL THEN
      SELECT v.product_id
        INTO v_variant_product
      FROM core.product_variants v
      WHERE v.id = v_variant_id;

      IF v_variant_product IS NULL THEN
        RAISE EXCEPTION 'variant % not found', v_variant_id;
      END IF;
      IF v_variant_product <> v_product_id THEN
        RAISE EXCEPTION 'variant does not belong to product';
      END IF;
    END IF;

    v_line_amount := GREATEST(0, (v_qty * v_unit) - v_discount);
    v_total := v_total + v_line_amount;

    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object(
        'ord', v_idx,
        'product_id', v_product_id,
        'variant_id', v_variant_id,
        'product_name_snapshot', v_snapshot,
        'quantity', v_qty,
        'unit_price', v_unit,
        'discount_amount', v_discount,
        'line_amount', v_line_amount
      )
    );
  END LOOP;

  v_points := GREATEST(0, FLOOR(COALESCE(p_points_used, 0)));
  IF v_points > v_total THEN
    RAISE EXCEPTION '사용 포인트는 결제금액을 초과할 수 없습니다.';
  END IF;
  IF v_points > 0 AND p_customer_id IS NULL THEN
    RAISE EXCEPTION '포인트를 사용하려면 고객을 선택해 주세요.';
  END IF;

  -- 동일 product+variant 합산 기준으로 재고 잠금·검증 (데드락 방지: 키 정렬)
  FOR v_agg IN
    SELECT
      (x->>'product_id')::UUID AS product_id,
      CASE
        WHEN x->>'variant_id' IS NULL OR x->>'variant_id' = '' THEN NULL
        ELSE (x->>'variant_id')::UUID
      END AS variant_id,
      SUM((x->>'quantity')::NUMERIC) AS required,
      MIN(x->>'product_name_snapshot') AS label
    FROM jsonb_array_elements(v_lines) AS x
    GROUP BY 1, 2
    ORDER BY 1, 2 NULLS FIRST
  LOOP
    SELECT i.id, i.quantity
      INTO v_inv
    FROM core.inventory i
    WHERE i.organization_id = p_organization_id
      AND i.product_id = v_agg.product_id
      AND i.variant_id IS NOT DISTINCT FROM v_agg.variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      v_available := 0;
    ELSE
      v_available := COALESCE(v_inv.quantity, 0);
    END IF;

    IF v_available < v_agg.required THEN
      v_shortfall_detail := format(
        '%s(필요 %s, 재고 %s)',
        v_agg.label,
        trim(to_char(v_agg.required, 'FM999999999999990.999')),
        trim(to_char(v_available, 'FM999999999999990.999'))
      );
      RAISE EXCEPTION '재고가 부족합니다: %', v_shortfall_detail;
    END IF;
  END LOOP;

  INSERT INTO core.sales (
    organization_id,
    customer_id,
    total_amount,
    points_used,
    payment_method,
    status
  ) VALUES (
    p_organization_id,
    p_customer_id,
    v_total,
    v_points,
    p_payment_method,
    'completed'
  )
  RETURNING * INTO v_sale;

  INSERT INTO core.sale_items (
    sale_id,
    product_id,
    variant_id,
    product_name_snapshot,
    quantity,
    unit_price,
    discount_amount,
    line_amount
  )
  SELECT
    v_sale.id,
    (x->>'product_id')::UUID,
    CASE
      WHEN x->>'variant_id' IS NULL OR x->>'variant_id' = '' THEN NULL
      ELSE (x->>'variant_id')::UUID
    END,
    x->>'product_name_snapshot',
    (x->>'quantity')::NUMERIC,
    (x->>'unit_price')::NUMERIC,
    (x->>'discount_amount')::NUMERIC,
    (x->>'line_amount')::NUMERIC
  FROM jsonb_array_elements(v_lines) AS x
  ORDER BY (x->>'ord')::INT;

  -- 라인별 movement(기존 applyDeductions 동작 유지)
  INSERT INTO core.stock_movements (
    organization_id,
    product_id,
    variant_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    reason
  )
  SELECT
    p_organization_id,
    (x->>'product_id')::UUID,
    CASE
      WHEN x->>'variant_id' IS NULL OR x->>'variant_id' = '' THEN NULL
      ELSE (x->>'variant_id')::UUID
    END,
    'sale'::core.stock_movement_type,
    -((x->>'quantity')::NUMERIC),
    'sale',
    v_sale.id,
    NULL
  FROM jsonb_array_elements(v_lines) AS x
  ORDER BY (x->>'ord')::INT;

  -- 합산 수량만큼 inventory 1회 차감 (이미 FOR UPDATE된 행)
  UPDATE core.inventory i
  SET quantity = i.quantity - a.required
  FROM (
    SELECT
      (x->>'product_id')::UUID AS product_id,
      CASE
        WHEN x->>'variant_id' IS NULL OR x->>'variant_id' = '' THEN NULL
        ELSE (x->>'variant_id')::UUID
      END AS variant_id,
      SUM((x->>'quantity')::NUMERIC) AS required
    FROM jsonb_array_elements(v_lines) AS x
    GROUP BY 1, 2
  ) a
  WHERE i.organization_id = p_organization_id
    AND i.product_id = a.product_id
    AND i.variant_id IS NOT DISTINCT FROM a.variant_id;

  -- 동시성/로직 오류로 음수가 되면 전체 rollback
  IF EXISTS (
    SELECT 1
    FROM core.inventory i
    WHERE i.organization_id = p_organization_id
      AND i.quantity < 0
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_lines) AS x
        WHERE (x->>'product_id')::UUID = i.product_id
          AND (
            CASE
              WHEN x->>'variant_id' IS NULL OR x->>'variant_id' = '' THEN NULL
              ELSE (x->>'variant_id')::UUID
            END
          ) IS NOT DISTINCT FROM i.variant_id
      )
  ) THEN
    RAISE EXCEPTION '재고가 부족합니다';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', si.id,
        'sale_id', si.sale_id,
        'product_id', si.product_id,
        'variant_id', si.variant_id,
        'product_name_snapshot', si.product_name_snapshot,
        'quantity', si.quantity,
        'unit_price', si.unit_price,
        'discount_amount', si.discount_amount,
        'line_amount', si.line_amount
      )
      ORDER BY si.id
    ),
    '[]'::jsonb
  )
  INTO v_items_out
  FROM core.sale_items si
  WHERE si.sale_id = v_sale.id;

  RETURN jsonb_build_object(
    'id', v_sale.id,
    'organization_id', v_sale.organization_id,
    'customer_id', v_sale.customer_id,
    'total_amount', v_sale.total_amount,
    'points_used', v_sale.points_used,
    'payment_method', v_sale.payment_method,
    'status', v_sale.status,
    'created_at', v_sale.created_at,
    'items', v_items_out
  );
END;
$$;

COMMENT ON FUNCTION core.create_sale(UUID, UUID, core.payment_method, NUMERIC, JSONB) IS
  '판매+재고 차감 원자 RPC. inventory FOR UPDATE, 동일 SKU 합산 검증, 부족 시 전체 rollback.';

REVOKE ALL ON FUNCTION core.create_sale(UUID, UUID, core.payment_method, NUMERIC, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.create_sale(UUID, UUID, core.payment_method, NUMERIC, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION core.create_sale(UUID, UUID, core.payment_method, NUMERIC, JSONB) TO authenticated;

COMMIT;
