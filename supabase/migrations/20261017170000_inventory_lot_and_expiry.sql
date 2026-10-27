-- ==============================================================================
-- Moa-v2 Capability: Inventory Lot Tracking, Expiry Date & Warehouse Location Schema
-- 
-- 1) core.stock_movements: 로트 번호, 유효기간, 창고 이동 구역 컬럼 확장
-- 2) core.stock_lots: 품목 로트별 잔여 수량 및 유효기간 추적 대장
-- 3) core.apply_stock_movement_lot_atomic: 로트 및 유효기간 동기화 원자적 재고 입출고 RPC
-- ==============================================================================

-- 1. Alter core.stock_movements to add lot & location tracking columns
ALTER TABLE core.stock_movements
  ADD COLUMN IF NOT EXISTS lot_number text,
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS source_location_id uuid,
  ADD COLUMN IF NOT EXISTS destination_location_id uuid;

CREATE INDEX IF NOT EXISTS idx_stock_movements_lot
  ON core.stock_movements (organization_id, lot_number)
  WHERE lot_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_expiry
  ON core.stock_movements (organization_id, expiry_date)
  WHERE expiry_date IS NOT NULL;

-- 2. Stock Lots Table (로트별 재고 대장)
CREATE TABLE IF NOT EXISTS core.stock_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES core.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES core.product_variants(id) ON DELETE CASCADE,
  lot_number text NOT NULL,
  expiry_date date,
  quantity numeric(14, 3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  location_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_stock_lots_org_prod_lot UNIQUE (organization_id, product_id, lot_number)
);

CREATE INDEX IF NOT EXISTS idx_stock_lots_org_expiry
  ON core.stock_lots (organization_id, expiry_date ASC);

COMMENT ON TABLE core.stock_lots IS '품목 로트별 실시간 잔여 재고 및 유효기간(FEFO) 추적 대장';

-- RLS
ALTER TABLE core.stock_lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stock_lots_org_isolation ON core.stock_lots;
CREATE POLICY stock_lots_org_isolation ON core.stock_lots
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM core.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM core.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 3. 원자적 로트 입출고 RPC: core.apply_stock_movement_lot_atomic
CREATE OR REPLACE FUNCTION core.apply_stock_movement_lot_atomic(
  p_organization_id uuid,
  p_product_id uuid,
  p_variant_id uuid,
  p_movement_type core.stock_movement_type,
  p_quantity numeric,
  p_lot_number text DEFAULT NULL,
  p_expiry_date date DEFAULT NULL,
  p_location_name text DEFAULT NULL,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, pg_temp
AS $$
DECLARE
  v_mov_id uuid;
  v_lot core.stock_lots%ROWTYPE;
BEGIN
  -- 권한 검증
  IF NOT EXISTS (
    SELECT 1 FROM core.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND is_active = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', '권한이 없습니다.');
  END IF;

  -- 1. stock_movements 이력 기록
  INSERT INTO core.stock_movements (
    organization_id,
    product_id,
    variant_id,
    movement_type,
    quantity,
    lot_number,
    expiry_date,
    reference_type,
    reference_id,
    reason
  ) VALUES (
    p_organization_id,
    p_product_id,
    p_variant_id,
    p_movement_type,
    p_quantity,
    p_lot_number,
    p_expiry_date,
    p_reference_type,
    p_reference_id,
    p_reason
  ) RETURNING id INTO v_mov_id;

  -- 2. 로트 번호가 제공된 경우 stock_lots 업서트/갱신
  IF p_lot_number IS NOT NULL AND p_lot_number <> '' THEN
    INSERT INTO core.stock_lots (
      organization_id,
      product_id,
      variant_id,
      lot_number,
      expiry_date,
      quantity,
      location_name
    ) VALUES (
      p_organization_id,
      p_product_id,
      p_variant_id,
      p_lot_number,
      p_expiry_date,
      GREATEST(0, p_quantity),
      p_location_name
    )
    ON CONFLICT (organization_id, product_id, lot_number)
    DO UPDATE SET
      quantity = GREATEST(0, core.stock_lots.quantity + p_quantity),
      expiry_date = COALESCE(EXCLUDED.expiry_date, core.stock_lots.expiry_date),
      location_name = COALESCE(EXCLUDED.location_name, core.stock_lots.location_name),
      updated_at = now();
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'movement_id', v_mov_id,
    'lot_number', p_lot_number,
    'quantity', p_quantity
  );
END;
$$;
