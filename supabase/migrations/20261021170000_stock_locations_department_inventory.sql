-- ==============================================================================
-- 부서별 재고: stock_locations + inventory 잔량 분리 + transfer RPC
-- - core.locations(영업 지점)과 분리된 자재 창고 개념
-- - 기존 org 단일 잔량은 code='central' 위치로 이관
-- - 판매/반품 RPC는 central 위치를 사용 (소매 호환)
-- ==============================================================================

BEGIN;

-- 1) transfer 이동 유형
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'core'
      AND t.typname = 'stock_movement_type'
      AND e.enumlabel = 'transfer'
  ) THEN
    ALTER TYPE core.stock_movement_type ADD VALUE 'transfer';
  END IF;
END $$;

-- 2) stock_locations
CREATE TABLE IF NOT EXISTS core.stock_locations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  code              TEXT NOT NULL,
  department_id     UUID REFERENCES core.departments(id) ON DELETE SET NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT stock_locations_name_check CHECK (length(btrim(name)) > 0),
  CONSTRAINT stock_locations_code_check CHECK (length(btrim(code)) > 0),
  CONSTRAINT uq_stock_locations_org_code UNIQUE (organization_id, code)
);

COMMENT ON TABLE core.stock_locations IS
  '자재·부서 창고. core.locations(영업 지점)과 분리. department_id NULL = 전사(central) 공유.';

CREATE INDEX IF NOT EXISTS idx_stock_locations_org_active
  ON core.stock_locations (organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_stock_locations_org_department
  ON core.stock_locations (organization_id, department_id);

DROP TRIGGER IF EXISTS set_updated_at ON core.stock_locations;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON core.stock_locations
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE core.stock_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stock_locations_member_select ON core.stock_locations;
CREATE POLICY stock_locations_member_select ON core.stock_locations
  FOR SELECT TO authenticated
  USING (
    core.is_org_member(organization_id)
    OR core.is_org_staff_actor(organization_id)
  );

DROP POLICY IF EXISTS stock_locations_admin_write ON core.stock_locations;
CREATE POLICY stock_locations_admin_write ON core.stock_locations
  FOR ALL TO authenticated
  USING (core.is_org_owner_or_admin(organization_id))
  WITH CHECK (core.is_org_owner_or_admin(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON core.stock_locations TO authenticated;

-- 3) central 위치 확보 헬퍼
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
  ON CONFLICT (organization_id, code) DO UPDATE
    SET name = EXCLUDED.name
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION core.ensure_central_stock_location_id(UUID) IS
  '조직당 code=central 자재 창고를 보장하고 id를 반환.';

GRANT EXECUTE ON FUNCTION core.ensure_central_stock_location_id(UUID) TO authenticated;

-- 기존 재고/조직에 central 위치 시드
INSERT INTO core.stock_locations (organization_id, name, code, department_id, is_active, metadata)
SELECT DISTINCT o.id, '중앙 창고', 'central', NULL::uuid, true, jsonb_build_object('kind', 'central')
FROM core.organizations o
WHERE EXISTS (
  SELECT 1 FROM core.inventory i WHERE i.organization_id = o.id
)
ON CONFLICT (organization_id, code) DO NOTHING;

INSERT INTO core.stock_locations (organization_id, name, code, department_id, is_active, metadata)
SELECT o.id, '중앙 창고', 'central', NULL::uuid, true, jsonb_build_object('kind', 'central')
FROM core.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM core.stock_locations sl
  WHERE sl.organization_id = o.id AND sl.code = 'central'
)
ON CONFLICT (organization_id, code) DO NOTHING;

-- 4) inventory.stock_location_id
ALTER TABLE core.inventory
  ADD COLUMN IF NOT EXISTS stock_location_id UUID;

UPDATE core.inventory i
SET stock_location_id = sl.id
FROM core.stock_locations sl
WHERE i.organization_id = sl.organization_id
  AND sl.code = 'central'
  AND i.stock_location_id IS NULL;

-- 잔여 NULL 방어: org별 central 재생성 후 재할당
DO $$
DECLARE
  r RECORD;
  v_loc UUID;
BEGIN
  FOR r IN
    SELECT DISTINCT organization_id
    FROM core.inventory
    WHERE stock_location_id IS NULL
  LOOP
    v_loc := core.ensure_central_stock_location_id(r.organization_id);
    UPDATE core.inventory
    SET stock_location_id = v_loc
    WHERE organization_id = r.organization_id
      AND stock_location_id IS NULL;
  END LOOP;
END $$;

ALTER TABLE core.inventory
  ALTER COLUMN stock_location_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_stock_location_id_fkey'
  ) THEN
    ALTER TABLE core.inventory
      ADD CONSTRAINT inventory_stock_location_id_fkey
      FOREIGN KEY (stock_location_id) REFERENCES core.stock_locations(id) ON DELETE RESTRICT;
  END IF;
END $$;

DROP INDEX IF EXISTS core.uq_inventory_org_product_no_variant;
DROP INDEX IF EXISTS core.uq_inventory_org_variant;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_org_product_location_no_variant
  ON core.inventory (organization_id, product_id, stock_location_id)
  WHERE variant_id IS NULL AND product_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_org_variant_location
  ON core.inventory (organization_id, variant_id, stock_location_id)
  WHERE variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_org_location
  ON core.inventory (organization_id, stock_location_id);

-- 5) stock_movements location 컬럼
ALTER TABLE core.stock_movements
  ADD COLUMN IF NOT EXISTS stock_location_id UUID;

UPDATE core.stock_movements m
SET stock_location_id = sl.id
FROM core.stock_locations sl
WHERE m.organization_id = sl.organization_id
  AND sl.code = 'central'
  AND m.stock_location_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_stock_location_id_fkey'
  ) THEN
    ALTER TABLE core.stock_movements
      ADD CONSTRAINT stock_movements_stock_location_id_fkey
      FOREIGN KEY (stock_location_id) REFERENCES core.stock_locations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 기존 source/destination 을 stock_locations FK로 정리 (데이터 없으면 NULL 유지)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_source_stock_location_fkey'
  ) THEN
    ALTER TABLE core.stock_movements
      ADD CONSTRAINT stock_movements_source_stock_location_fkey
      FOREIGN KEY (source_location_id) REFERENCES core.stock_locations(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN others THEN
    -- 기존 UUID가 locations(지점) 등을 가리키면 FK 추가 실패 → 컬럼만 유지
    RAISE NOTICE 'skip source_location_id FK: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_dest_stock_location_fkey'
  ) THEN
    ALTER TABLE core.stock_movements
      ADD CONSTRAINT stock_movements_dest_stock_location_fkey
      FOREIGN KEY (destination_location_id) REFERENCES core.stock_locations(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'skip destination_location_id FK: %', SQLERRM;
END $$;

-- 6) stock_lots location (훅)
ALTER TABLE core.stock_lots
  ADD COLUMN IF NOT EXISTS stock_location_id UUID;

UPDATE core.stock_lots l
SET stock_location_id = sl.id
FROM core.stock_locations sl
WHERE l.organization_id = sl.organization_id
  AND sl.code = 'central'
  AND l.stock_location_id IS NULL;

-- 7) apply_stock_movement — location 인식 (구 시그니처 DROP 후 재생성)
DROP FUNCTION IF EXISTS core.apply_stock_movement(
  UUID, UUID, UUID, core.stock_movement_type, NUMERIC, TEXT, UUID, TEXT
);

CREATE OR REPLACE FUNCTION core.apply_stock_movement(
  p_organization_id UUID,
  p_product_id UUID,
  p_variant_id UUID,
  p_movement_type core.stock_movement_type,
  p_quantity NUMERIC,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_stock_location_id UUID DEFAULT NULL
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
  v_loc UUID;
  v_loc_org UUID;
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

  IF p_movement_type = 'transfer' THEN
    RAISE EXCEPTION 'transfer는 transfer_stock_between_locations를 사용하세요.';
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

  v_loc := p_stock_location_id;
  IF v_loc IS NULL THEN
    v_loc := core.ensure_central_stock_location_id(p_organization_id);
  ELSE
    SELECT organization_id INTO v_loc_org
    FROM core.stock_locations
    WHERE id = v_loc AND is_active = true;
    IF v_loc_org IS NULL OR v_loc_org <> p_organization_id THEN
      RAISE EXCEPTION '유효하지 않은 재고 위치입니다.';
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

  IF p_variant_id IS NULL THEN
    INSERT INTO core.inventory (organization_id, product_id, variant_id, quantity, stock_location_id)
    VALUES (p_organization_id, p_product_id, NULL, 0, v_loc)
    ON CONFLICT (organization_id, product_id, stock_location_id)
      WHERE (variant_id IS NULL AND product_id IS NOT NULL)
    DO NOTHING;

    SELECT * INTO v_inv
    FROM core.inventory
    WHERE organization_id = p_organization_id
      AND product_id = p_product_id
      AND variant_id IS NULL
      AND stock_location_id = v_loc
    FOR UPDATE;
  ELSE
    INSERT INTO core.inventory (organization_id, product_id, variant_id, quantity, stock_location_id)
    VALUES (p_organization_id, p_product_id, p_variant_id, 0, v_loc)
    ON CONFLICT (organization_id, variant_id, stock_location_id)
      WHERE (variant_id IS NOT NULL)
    DO NOTHING;

    SELECT * INTO v_inv
    FROM core.inventory
    WHERE organization_id = p_organization_id
      AND variant_id = p_variant_id
      AND stock_location_id = v_loc
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
    reason,
    stock_location_id
  ) VALUES (
    p_organization_id,
    p_product_id,
    p_variant_id,
    p_movement_type,
    v_delta,
    v_ref_type,
    p_reference_id,
    v_reason,
    v_loc
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
      'stock_location_id', v_mov.stock_location_id,
      'created_at', v_mov.created_at
    ),
    'quantity_after', v_after,
    'stock_location_id', v_loc
  );
END;
$$;

COMMENT ON FUNCTION core.apply_stock_movement(
  UUID, UUID, UUID, core.stock_movement_type, NUMERIC, TEXT, UUID, TEXT, UUID
) IS
  '재고 변경 원자 RPC(위치 단위). p_stock_location_id NULL이면 central.';

GRANT EXECUTE ON FUNCTION core.apply_stock_movement(
  UUID, UUID, UUID, core.stock_movement_type, NUMERIC, TEXT, UUID, TEXT, UUID
) TO authenticated;
REVOKE EXECUTE ON FUNCTION core.apply_stock_movement(
  UUID, UUID, UUID, core.stock_movement_type, NUMERIC, TEXT, UUID, TEXT, UUID
) FROM anon;

-- 8) 위치 간 이동 원자 RPC
CREATE OR REPLACE FUNCTION core.transfer_stock_between_locations(
  p_organization_id UUID,
  p_product_id UUID,
  p_variant_id UUID,
  p_from_location_id UUID,
  p_to_location_id UUID,
  p_quantity NUMERIC,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_qty NUMERIC(14, 3);
  v_from_org UUID;
  v_to_org UUID;
  v_from core.inventory%ROWTYPE;
  v_to core.inventory%ROWTYPE;
  v_after_from NUMERIC(14, 3);
  v_after_to NUMERIC(14, 3);
  v_mov_out core.stock_movements%ROWTYPE;
  v_mov_in core.stock_movements%ROWTYPE;
  v_reason TEXT;
  v_product_org UUID;
  v_variant_product UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT core.is_org_admin(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_qty := trunc(COALESCE(p_quantity, 0));
  IF v_qty <= 0 THEN
    RAISE EXCEPTION '이동 수량은 0보다 커야 합니다.';
  END IF;

  IF p_from_location_id IS NULL OR p_to_location_id IS NULL THEN
    RAISE EXCEPTION '출발·도착 창고를 선택해 주세요.';
  END IF;
  IF p_from_location_id = p_to_location_id THEN
    RAISE EXCEPTION '출발과 도착 창고가 같습니다.';
  END IF;

  SELECT organization_id INTO v_from_org
  FROM core.stock_locations
  WHERE id = p_from_location_id AND is_active = true;
  SELECT organization_id INTO v_to_org
  FROM core.stock_locations
  WHERE id = p_to_location_id AND is_active = true;

  IF v_from_org IS NULL OR v_from_org <> p_organization_id
     OR v_to_org IS NULL OR v_to_org <> p_organization_id THEN
    RAISE EXCEPTION '유효하지 않은 재고 위치입니다.';
  END IF;

  SELECT organization_id INTO v_product_org
  FROM core.products WHERE id = p_product_id;
  IF v_product_org IS NULL OR v_product_org <> p_organization_id THEN
    RAISE EXCEPTION '상품을 찾을 수 없습니다.';
  END IF;

  IF p_variant_id IS NOT NULL THEN
    SELECT product_id INTO v_variant_product
    FROM core.product_variants WHERE id = p_variant_id;
    IF v_variant_product IS NULL OR v_variant_product <> p_product_id THEN
      RAISE EXCEPTION '선택한 옵션이 상품과 일치하지 않습니다.';
    END IF;
  END IF;

  v_reason := COALESCE(
    NULLIF(btrim(COALESCE(p_reason, '')), ''),
    '부서 창고 이동'
  );

  -- 출발 잠금
  IF p_variant_id IS NULL THEN
    SELECT * INTO v_from
    FROM core.inventory
    WHERE organization_id = p_organization_id
      AND product_id = p_product_id
      AND variant_id IS NULL
      AND stock_location_id = p_from_location_id
    FOR UPDATE;
  ELSE
    SELECT * INTO v_from
    FROM core.inventory
    WHERE organization_id = p_organization_id
      AND variant_id = p_variant_id
      AND stock_location_id = p_from_location_id
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION '출발 창고 재고가 없습니다.';
  END IF;

  v_after_from := v_from.quantity - v_qty;
  IF v_after_from < 0 THEN
    RAISE EXCEPTION '재고가 부족합니다. (현재 %)',
      trim(to_char(v_from.quantity, 'FM999999999999990.999'));
  END IF;

  -- 도착 행 확보
  IF p_variant_id IS NULL THEN
    INSERT INTO core.inventory (organization_id, product_id, variant_id, quantity, stock_location_id)
    VALUES (p_organization_id, p_product_id, NULL, 0, p_to_location_id)
    ON CONFLICT (organization_id, product_id, stock_location_id)
      WHERE (variant_id IS NULL AND product_id IS NOT NULL)
    DO NOTHING;

    SELECT * INTO v_to
    FROM core.inventory
    WHERE organization_id = p_organization_id
      AND product_id = p_product_id
      AND variant_id IS NULL
      AND stock_location_id = p_to_location_id
    FOR UPDATE;
  ELSE
    INSERT INTO core.inventory (organization_id, product_id, variant_id, quantity, stock_location_id)
    VALUES (p_organization_id, p_product_id, p_variant_id, 0, p_to_location_id)
    ON CONFLICT (organization_id, variant_id, stock_location_id)
      WHERE (variant_id IS NOT NULL)
    DO NOTHING;

    SELECT * INTO v_to
    FROM core.inventory
    WHERE organization_id = p_organization_id
      AND variant_id = p_variant_id
      AND stock_location_id = p_to_location_id
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION '도착 창고 재고 행을 준비하지 못했습니다.';
  END IF;

  v_after_to := v_to.quantity + v_qty;

  UPDATE core.inventory
  SET quantity = v_after_from, updated_at = now()
  WHERE id = v_from.id;

  UPDATE core.inventory
  SET quantity = v_after_to, updated_at = now()
  WHERE id = v_to.id;

  INSERT INTO core.stock_movements (
    organization_id, product_id, variant_id, movement_type, quantity,
    reference_type, reason, stock_location_id,
    source_location_id, destination_location_id
  ) VALUES (
    p_organization_id, p_product_id, p_variant_id, 'transfer', -v_qty,
    'stock_transfer', v_reason, p_from_location_id,
    p_from_location_id, p_to_location_id
  )
  RETURNING * INTO v_mov_out;

  INSERT INTO core.stock_movements (
    organization_id, product_id, variant_id, movement_type, quantity,
    reference_type, reason, stock_location_id,
    source_location_id, destination_location_id
  ) VALUES (
    p_organization_id, p_product_id, p_variant_id, 'transfer', v_qty,
    'stock_transfer', v_reason, p_to_location_id,
    p_from_location_id, p_to_location_id
  )
  RETURNING * INTO v_mov_in;

  RETURN jsonb_build_object(
    'from_quantity_after', v_after_from,
    'to_quantity_after', v_after_to,
    'quantity', v_qty,
    'from_location_id', p_from_location_id,
    'to_location_id', p_to_location_id,
    'out_movement_id', v_mov_out.id,
    'in_movement_id', v_mov_in.id
  );
END;
$$;

COMMENT ON FUNCTION core.transfer_stock_between_locations(
  UUID, UUID, UUID, UUID, UUID, NUMERIC, TEXT
) IS
  '부서/창고 간 재고 이동 원자 RPC. 출고·입고 transfer movement 2건.';

GRANT EXECUTE ON FUNCTION core.transfer_stock_between_locations(
  UUID, UUID, UUID, UUID, UUID, NUMERIC, TEXT
) TO authenticated;

-- 9) create_sale / create_sale_return — central 위치만 사용하도록 패치
-- (판매는 소매 중앙 창고 잔량을 차감)
CREATE OR REPLACE FUNCTION core.create_sale(
  p_organization_id uuid,
  p_customer_id uuid DEFAULT NULL::uuid,
  p_payment_method core.payment_method DEFAULT 'cash'::core.payment_method,
  p_points_used numeric DEFAULT 0,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'public'
AS $function$
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
  v_redeem JSONB;
  v_points_enabled BOOLEAN;
  v_central UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT core.is_org_staff_actor(p_organization_id) THEN
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
    SELECT 1 FROM core.customers c
    WHERE c.id = p_customer_id AND c.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Customer not found in organization';
  END IF;

  v_central := core.ensure_central_stock_location_id(p_organization_id);

  FOR v_idx IN 0 .. (v_n - 1) LOOP
    v_item := p_items -> v_idx;
    IF v_item IS NULL OR jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION '판매 라인이 올바르지 않습니다.';
    END IF;

    BEGIN
      v_product_id := NULLIF(btrim(COALESCE(v_item->>'product_id', '')), '')::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION '판매 상품이 없습니다.';
    END;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION '판매 상품이 없습니다.';
    END IF;

    IF v_item->>'variant_id' IS NULL OR btrim(v_item->>'variant_id') = '' OR lower(btrim(v_item->>'variant_id')) = 'null' THEN
      v_variant_id := NULL;
    ELSE
      BEGIN
        v_variant_id := btrim(v_item->>'variant_id')::UUID;
      EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'variant % not found', v_item->>'variant_id';
      END;
    END IF;

    v_snapshot := btrim(COALESCE(v_item->>'product_name_snapshot', ''));
    IF v_snapshot = '' THEN v_snapshot := '상품'; END IF;

    v_qty := COALESCE((v_item->>'quantity')::NUMERIC, 0);
    v_unit := COALESCE((v_item->>'unit_price')::NUMERIC, -1);
    v_discount := GREATEST(0, COALESCE((v_item->>'discount_amount')::NUMERIC, 0));

    IF v_qty IS NULL OR v_qty <= 0 OR v_qty <> trunc(v_qty) THEN
      RAISE EXCEPTION '수량은 1 이상의 정수여야 합니다.';
    END IF;
    IF v_unit IS NULL OR v_unit < 0 THEN
      RAISE EXCEPTION '단가가 올바르지 않습니다.';
    END IF;

    SELECT p.organization_id INTO v_product_org FROM core.products p WHERE p.id = v_product_id;
    IF v_product_org IS NULL THEN RAISE EXCEPTION 'product % not found', v_product_id; END IF;
    IF v_product_org <> p_organization_id THEN RAISE EXCEPTION 'product organization_id mismatch'; END IF;

    IF v_variant_id IS NOT NULL THEN
      SELECT v.product_id INTO v_variant_product FROM core.product_variants v WHERE v.id = v_variant_id;
      IF v_variant_product IS NULL THEN RAISE EXCEPTION 'variant % not found', v_variant_id; END IF;
      IF v_variant_product <> v_product_id THEN RAISE EXCEPTION 'variant does not belong to product'; END IF;
    END IF;

    v_line_amount := GREATEST(0, (v_qty * v_unit) - v_discount);
    v_total := v_total + v_line_amount;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'ord', v_idx, 'product_id', v_product_id, 'variant_id', v_variant_id,
      'product_name_snapshot', v_snapshot, 'quantity', v_qty, 'unit_price', v_unit,
      'discount_amount', v_discount, 'line_amount', v_line_amount
    ));
  END LOOP;

  v_points := GREATEST(0, FLOOR(COALESCE(p_points_used, 0)));
  IF v_points > v_total THEN RAISE EXCEPTION '사용 포인트는 결제금액을 초과할 수 없습니다.'; END IF;
  IF v_points > 0 AND p_customer_id IS NULL THEN RAISE EXCEPTION '포인트를 사용하려면 고객을 선택해 주세요.'; END IF;

  FOR v_agg IN
    SELECT (x->>'product_id')::UUID AS product_id,
      CASE WHEN x->>'variant_id' IS NULL OR x->>'variant_id' = '' THEN NULL ELSE (x->>'variant_id')::UUID END AS variant_id,
      SUM((x->>'quantity')::NUMERIC) AS required,
      MIN(x->>'product_name_snapshot') AS label
    FROM jsonb_array_elements(v_lines) AS x
    GROUP BY 1, 2 ORDER BY 1, 2 NULLS FIRST
  LOOP
    SELECT i.id, i.quantity INTO v_inv FROM core.inventory i
    WHERE i.organization_id = p_organization_id AND i.product_id = v_agg.product_id
      AND i.variant_id IS NOT DISTINCT FROM v_agg.variant_id
      AND i.stock_location_id = v_central
    FOR UPDATE;
    IF NOT FOUND THEN v_available := 0; ELSE v_available := COALESCE(v_inv.quantity, 0); END IF;
    IF v_available < v_agg.required THEN
      RAISE EXCEPTION '재고가 부족합니다: %', format('%s(필요 %s, 재고 %s)', v_agg.label,
        trim(to_char(v_agg.required, 'FM999999999999990.999')),
        trim(to_char(v_available, 'FM999999999999990.999')));
    END IF;
  END LOOP;

  INSERT INTO core.sales (organization_id, customer_id, total_amount, points_used, payment_method, status)
  VALUES (p_organization_id, p_customer_id, v_total, v_points, p_payment_method, 'completed')
  RETURNING * INTO v_sale;

  INSERT INTO core.sale_items (sale_id, product_id, variant_id, product_name_snapshot, quantity, unit_price, discount_amount, line_amount)
  SELECT v_sale.id, (x->>'product_id')::UUID,
    CASE WHEN x->>'variant_id' IS NULL OR x->>'variant_id' = '' THEN NULL ELSE (x->>'variant_id')::UUID END,
    x->>'product_name_snapshot', (x->>'quantity')::NUMERIC, (x->>'unit_price')::NUMERIC,
    (x->>'discount_amount')::NUMERIC, (x->>'line_amount')::NUMERIC
  FROM jsonb_array_elements(v_lines) AS x ORDER BY (x->>'ord')::INT;

  INSERT INTO core.stock_movements (
    organization_id, product_id, variant_id, movement_type, quantity,
    reference_type, reference_id, reason, stock_location_id
  )
  SELECT p_organization_id, (x->>'product_id')::UUID,
    CASE WHEN x->>'variant_id' IS NULL OR x->>'variant_id' = '' THEN NULL ELSE (x->>'variant_id')::UUID END,
    'sale'::core.stock_movement_type, -((x->>'quantity')::NUMERIC), 'sale', v_sale.id, NULL, v_central
  FROM jsonb_array_elements(v_lines) AS x ORDER BY (x->>'ord')::INT;

  UPDATE core.inventory i SET quantity = i.quantity - a.required
  FROM (
    SELECT (x->>'product_id')::UUID AS product_id,
      CASE WHEN x->>'variant_id' IS NULL OR x->>'variant_id' = '' THEN NULL ELSE (x->>'variant_id')::UUID END AS variant_id,
      SUM((x->>'quantity')::NUMERIC) AS required
    FROM jsonb_array_elements(v_lines) AS x GROUP BY 1, 2
  ) a
  WHERE i.organization_id = p_organization_id AND i.product_id = a.product_id
    AND i.variant_id IS NOT DISTINCT FROM a.variant_id
    AND i.stock_location_id = v_central;

  IF EXISTS (
    SELECT 1 FROM core.inventory i
    WHERE i.organization_id = p_organization_id AND i.quantity < 0
      AND i.stock_location_id = v_central
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_lines) AS x
        WHERE (x->>'product_id')::UUID = i.product_id
          AND (CASE WHEN x->>'variant_id' IS NULL OR x->>'variant_id' = '' THEN NULL ELSE (x->>'variant_id')::UUID END)
            IS NOT DISTINCT FROM i.variant_id
      )
  ) THEN
    RAISE EXCEPTION '재고가 부족합니다';
  END IF;

  IF v_points > 0 THEN
    SELECT COALESCE((o.settings->'features'->'points'->>'enabled') = 'true', false)
      INTO v_points_enabled FROM core.organizations o WHERE o.id = p_organization_id;
    IF NOT COALESCE(v_points_enabled, false) THEN
      RAISE EXCEPTION '포인트 사용이 비활성화되어 있습니다.';
    END IF;
    v_redeem := core.apply_point_redeem_for_sale(
      p_organization_id, p_customer_id, v_sale.id, v_points, v_total
    );
    IF COALESCE((v_redeem->>'skipped')::boolean, false) THEN
      RAISE EXCEPTION '포인트 사용 처리에 실패했습니다 (%).', COALESCE(v_redeem->>'reason', 'unknown');
    END IF;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', si.id, 'sale_id', si.sale_id, 'product_id', si.product_id, 'variant_id', si.variant_id,
    'product_name_snapshot', si.product_name_snapshot, 'quantity', si.quantity,
    'unit_price', si.unit_price, 'discount_amount', si.discount_amount, 'line_amount', si.line_amount
  ) ORDER BY si.id), '[]'::jsonb)
  INTO v_items_out FROM core.sale_items si WHERE si.sale_id = v_sale.id;

  RETURN jsonb_build_object(
    'id', v_sale.id, 'organization_id', v_sale.organization_id, 'customer_id', v_sale.customer_id,
    'total_amount', v_sale.total_amount, 'points_used', v_sale.points_used,
    'payment_method', v_sale.payment_method, 'status', v_sale.status,
    'created_at', v_sale.created_at, 'items', v_items_out
  );
END;
$function$;

CREATE OR REPLACE FUNCTION core.create_sale_return(
  p_organization_id uuid,
  p_sale_id uuid,
  p_reason text DEFAULT NULL::text,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core', 'public'
AS $function$
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
  v_central UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT core.is_org_staff_actor(p_organization_id) THEN
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

  v_central := core.ensure_central_stock_location_id(p_organization_id);

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
    reason,
    stock_location_id
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
    NULL,
    v_central
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
      AND i.stock_location_id = v_central
    FOR UPDATE;

    IF NOT FOUND THEN
      INSERT INTO core.inventory (
        organization_id,
        product_id,
        variant_id,
        quantity,
        stock_location_id
      ) VALUES (
        p_organization_id,
        v_product_id,
        v_variant_id,
        v_delta,
        v_central
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
$function$;

COMMIT;
