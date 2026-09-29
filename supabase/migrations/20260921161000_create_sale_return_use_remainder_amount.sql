-- create_sale_return: 부분 반품 금액을 compute_return_line_amount로 통일 (재고 로직 변경 없음)

CREATE OR REPLACE FUNCTION core.create_sale_return(
  p_organization_id UUID,
  p_sale_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_sale core.sales%ROWTYPE;
  v_return core.sale_returns%ROWTYPE;
  v_items_out JSONB;
  v_agg JSONB := '{}'::jsonb;
  v_lines JSONB := '[]'::jsonb;
  v_item JSONB;
  v_idx INT;
  v_n INT;
  v_sale_item_id UUID;
  v_qty NUMERIC(14, 3);
  v_key TEXT;
  v_src RECORD;
  v_already NUMERIC(14, 3);
  v_remaining NUMERIC(14, 3);
  v_line_amount NUMERIC(14, 2);
  v_total NUMERIC(14, 2) := 0;
  v_rec RECORD;
  v_inv RECORD;
  v_product_id UUID;
  v_variant_id UUID;
  v_delta NUMERIC(14, 3);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT core.is_org_admin(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_sale_id IS NULL THEN
    RAISE EXCEPTION '사업장·판매 정보가 필요합니다.';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION '반품할 상품을 선택해 주세요.';
  END IF;

  v_n := jsonb_array_length(p_items);
  IF v_n IS NULL OR v_n < 1 THEN
    RAISE EXCEPTION '반품할 상품을 선택해 주세요.';
  END IF;

  SELECT *
    INTO v_sale
  FROM core.sales s
  WHERE s.id = p_sale_id
    AND s.organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '판매 내역을 찾을 수 없습니다.';
  END IF;

  PERFORM 1
  FROM core.sale_items si
  WHERE si.sale_id = p_sale_id
  ORDER BY si.id
  FOR UPDATE OF si;

  -- 동일 sale_item_id 합산
  FOR v_idx IN 0 .. (v_n - 1) LOOP
    v_item := p_items -> v_idx;
    IF v_item IS NULL OR jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION '반품 라인이 올바르지 않습니다.';
    END IF;

    BEGIN
      v_sale_item_id := NULLIF(btrim(COALESCE(v_item->>'sale_item_id', '')), '')::UUID;
    EXCEPTION
      WHEN invalid_text_representation THEN
        RAISE EXCEPTION '원본 판매 상품을 찾을 수 없습니다.';
    END;

    IF v_sale_item_id IS NULL THEN
      RAISE EXCEPTION '원본 판매 상품을 찾을 수 없습니다.';
    END IF;

    v_qty := COALESCE((v_item->>'quantity')::NUMERIC, 0);
    IF v_qty IS NULL OR v_qty <= 0 OR v_qty <> trunc(v_qty) THEN
      RAISE EXCEPTION '반품 수량은 1 이상의 정수여야 합니다.';
    END IF;

    v_key := v_sale_item_id::TEXT;
    v_agg := jsonb_set(
      v_agg,
      ARRAY[v_key],
      to_jsonb(COALESCE((v_agg->>v_key)::NUMERIC, 0) + v_qty),
      true
    );
  END LOOP;

  FOR v_rec IN
    SELECT key AS sale_item_id_text, value::TEXT::NUMERIC AS quantity
    FROM jsonb_each(v_agg)
    ORDER BY 1
  LOOP
    v_sale_item_id := v_rec.sale_item_id_text::UUID;
    v_qty := v_rec.quantity;

    SELECT
      si.id,
      si.product_id,
      si.variant_id,
      si.product_name_snapshot,
      si.quantity,
      si.unit_price,
      si.discount_amount
      INTO v_src
    FROM core.sale_items si
    WHERE si.id = v_sale_item_id
      AND si.sale_id = p_sale_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION '원본 판매 상품을 찾을 수 없습니다.';
    END IF;

    SELECT COALESCE(SUM(sri.quantity), 0)
      INTO v_already
    FROM core.sale_return_items sri
    JOIN core.sale_returns sr ON sr.id = sri.sale_return_id
    WHERE sr.sale_id = p_sale_id
      AND sri.sale_item_id = v_sale_item_id;

    v_remaining := COALESCE(v_src.quantity, 0) - COALESCE(v_already, 0);
    IF v_qty > v_remaining THEN
      RAISE EXCEPTION '%',
        format(
          '"%s" 반품 가능 수량은 %s개입니다.',
          v_src.product_name_snapshot,
          trim(to_char(GREATEST(0, v_remaining), 'FM999999999999990'))
        );
    END IF;

    v_line_amount := core.compute_return_line_amount(
      v_qty,
      v_src.quantity,
      v_src.unit_price,
      v_src.discount_amount,
      v_already
    );
    v_total := v_total + v_line_amount;

    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object(
        'sale_item_id', v_sale_item_id,
        'product_id', v_src.product_id,
        'variant_id', v_src.variant_id,
        'product_name_snapshot', v_src.product_name_snapshot,
        'quantity', v_qty,
        'unit_price', v_src.unit_price,
        'line_amount', v_line_amount
      )
    );
  END LOOP;

  INSERT INTO core.sale_returns (
    organization_id,
    sale_id,
    total_amount,
    reason
  ) VALUES (
    p_organization_id,
    p_sale_id,
    v_total,
    NULLIF(btrim(COALESCE(p_reason, '')), '')
  )
  RETURNING * INTO v_return;

  INSERT INTO core.sale_return_items (
    sale_return_id,
    sale_item_id,
    product_id,
    variant_id,
    product_name_snapshot,
    quantity,
    unit_price,
    line_amount
  )
  SELECT
    v_return.id,
    (x->>'sale_item_id')::UUID,
    CASE
      WHEN x->>'product_id' IS NULL OR x->>'product_id' = '' THEN NULL
      ELSE (x->>'product_id')::UUID
    END,
    CASE
      WHEN x->>'variant_id' IS NULL OR x->>'variant_id' = '' THEN NULL
      ELSE (x->>'variant_id')::UUID
    END,
    x->>'product_name_snapshot',
    (x->>'quantity')::NUMERIC,
    (x->>'unit_price')::NUMERIC,
    (x->>'line_amount')::NUMERIC
  FROM jsonb_array_elements(v_lines) x
  ORDER BY (x->>'sale_item_id');

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
    'return'::core.stock_movement_type,
    (x->>'quantity')::NUMERIC,
    'sale_return',
    v_return.id,
    NULL
  FROM jsonb_array_elements(v_lines) x
  WHERE x->>'product_id' IS NOT NULL
    AND x->>'product_id' <> ''
  ORDER BY (x->>'sale_item_id');

  FOR v_rec IN
    SELECT
      (x->>'product_id')::UUID AS product_id,
      CASE
        WHEN x->>'variant_id' IS NULL OR x->>'variant_id' = '' THEN NULL
        ELSE (x->>'variant_id')::UUID
      END AS variant_id,
      SUM((x->>'quantity')::NUMERIC) AS qty
    FROM jsonb_array_elements(v_lines) x
    WHERE x->>'product_id' IS NOT NULL
      AND x->>'product_id' <> ''
    GROUP BY 1, 2
    ORDER BY 1, 2 NULLS FIRST
  LOOP
    v_product_id := v_rec.product_id;
    v_variant_id := v_rec.variant_id;
    v_delta := v_rec.qty;

    SELECT i.id, i.quantity
      INTO v_inv
    FROM core.inventory i
    WHERE i.organization_id = p_organization_id
      AND i.product_id = v_product_id
      AND i.variant_id IS NOT DISTINCT FROM v_variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      INSERT INTO core.inventory (
        organization_id,
        product_id,
        variant_id,
        quantity
      ) VALUES (
        p_organization_id,
        v_product_id,
        v_variant_id,
        v_delta
      );
    ELSE
      UPDATE core.inventory
      SET quantity = quantity + v_delta
      WHERE id = v_inv.id;
    END IF;
  END LOOP;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', sri.id,
        'sale_return_id', sri.sale_return_id,
        'sale_item_id', sri.sale_item_id,
        'product_id', sri.product_id,
        'variant_id', sri.variant_id,
        'product_name_snapshot', sri.product_name_snapshot,
        'quantity', sri.quantity,
        'unit_price', sri.unit_price,
        'line_amount', sri.line_amount
      )
      ORDER BY sri.id
    ),
    '[]'::jsonb
  )
  INTO v_items_out
  FROM core.sale_return_items sri
  WHERE sri.sale_return_id = v_return.id;

  RETURN jsonb_build_object(
    'id', v_return.id,
    'organization_id', v_return.organization_id,
    'sale_id', v_return.sale_id,
    'total_amount', v_return.total_amount,
    'reason', v_return.reason,
    'created_at', v_return.created_at,
    'items', v_items_out
  );
END;
$$;

COMMENT ON FUNCTION core.create_sale_return(UUID, UUID, TEXT, JSONB) IS
  '반품+재고 복구 원자 RPC. 부분 반품 금액은 compute_return_line_amount(누적 FLOOR+잔여 흡수).';
