-- 매장별 창고 이름 유지 + 상품 안전재고
-- ensure_central 은 code=central 행만 보장하고, 이미 있는 이름은 덮어쓰지 않는다.

CREATE OR REPLACE FUNCTION core.ensure_central_stock_location_id(p_organization_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id required';
  END IF;

  SELECT id INTO v_id
  FROM core.stock_locations
  WHERE organization_id = p_organization_id
    AND code = 'central';

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO core.stock_locations (
    organization_id, name, code, department_id, is_active, metadata
  ) VALUES (
    p_organization_id,
    '중앙 창고',
    'central',
    NULL,
    true,
    jsonb_build_object('kind', 'central')
  )
  ON CONFLICT (organization_id, code) DO NOTHING;

  SELECT id INTO v_id
  FROM core.stock_locations
  WHERE organization_id = p_organization_id
    AND code = 'central';

  RETURN v_id;
END;
$$;

ALTER TABLE core.products
  ADD COLUMN IF NOT EXISTS safety_stock integer NOT NULL DEFAULT 0;

ALTER TABLE core.products
  DROP CONSTRAINT IF EXISTS products_safety_stock_check;

ALTER TABLE core.products
  ADD CONSTRAINT products_safety_stock_check CHECK (safety_stock >= 0);

COMMENT ON COLUMN core.products.safety_stock IS
  '안전재고 수량. 현재고가 이 값 이하면 재고 부족으로 표시한다. 0이면 기준 없음.';
