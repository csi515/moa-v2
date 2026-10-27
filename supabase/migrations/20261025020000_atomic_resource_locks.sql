-- =============================================================================
-- atomic_resource_locks: 자원 경합(예약 정원, 이용권 잔여, 재고) 비관적 락(FOR UPDATE) RPC 표준화
--
-- 목적:
--   1. 다중 동시 접근, 카운터 연타, 0.1초 차이 동시 요청으로 인한
--      - 정원 초과(Overbooking)
--      - 수강권 횟수 음수(-) 차감
--      - 재고 음수 판매
--      를 방지하기 위해 PostgreSQL 트랜잭션 및 비관적 행 잠금(SELECT ... FOR UPDATE)을 표준화함.
--   2. 테넌트 격리(p_tenant_id UUID 필수) 및 RLS 검증을 보장함.
--   3. 표준 예외 코드(CAPACITY_EXCEEDED, PASS_NOT_USABLE, INSUFFICIENT_STOCK) 규격화.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. 예약 타임슬롯 잠금 및 점유 RPC (core.book_schedule_slot with tenant isolation)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.book_schedule_slot(
  p_tenant_id UUID,
  p_schedule_id UUID,
  p_customer_id UUID,
  p_pass_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_schedule RECORD;
  v_customer RECORD;
  v_pass RECORD;
  v_booked_count INT;
  v_reservation_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_REQUIRED: 테넌트 식별자(p_tenant_id)가 필요합니다.';
  END IF;

  IF p_schedule_id IS NULL OR p_customer_id IS NULL THEN
    RAISE EXCEPTION 'SCHEDULE_OR_CUSTOMER_REQUIRED: 일정과 고객 식별자가 필요합니다.';
  END IF;

  -- 1) 타임슬롯 행 배타적 잠금(FOR UPDATE): 동시 접근 시 직렬화하여 오버부킹 원천 차단
  SELECT
    s.id,
    s.organization_id,
    s.is_bookable,
    s.max_capacity,
    s.starts_at,
    s.ends_at,
    o.is_active
  INTO v_schedule
  FROM core.schedules s
  JOIN core.organizations o ON o.id = s.organization_id
  WHERE s.id = p_schedule_id AND s.organization_id = p_tenant_id
  FOR UPDATE OF s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SCHEDULE_NOT_FOUND: 예약 대상을 찾을 수 없거나 테넌트가 일치하지 않습니다.';
  END IF;

  IF NOT v_schedule.is_active THEN
    RAISE EXCEPTION 'ORGANIZATION_INACTIVE: 비활성화된 사업장입니다.';
  END IF;

  IF NOT v_schedule.is_bookable THEN
    RAISE EXCEPTION 'SCHEDULE_NOT_BOOKABLE: 예약 가능한 일정이 아닙니다.';
  END IF;

  IF v_schedule.starts_at < now() THEN
    RAISE EXCEPTION 'CANNOT_BOOK_PAST_SCHEDULE: 지난 일정은 예약할 수 없습니다.';
  END IF;

  -- 2) 고객 소속 및 유효성 확인
  SELECT
    c.id,
    c.organization_id,
    c.name,
    c.phone
  INTO v_customer
  FROM core.customers c
  WHERE c.id = p_customer_id AND c.organization_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CUSTOMER_NOT_FOUND: 고객 정보를 찾을 수 없습니다.';
  END IF;

  -- 3) 중복 예약 방지 확인
  IF EXISTS (
    SELECT 1
    FROM core.reservations
    WHERE schedule_id = p_schedule_id
      AND customer_id = p_customer_id
      AND status IN ('requested', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'ALREADY_BOOKED: 해당 고객은 이미 이 일정에 예약되어 있습니다.';
  END IF;

  -- 4) 잔여석(capacity) 카운트 검증: 잠금 상태에서 확인하므로 Race Condition 차단
  SELECT COUNT(*)
  INTO v_booked_count
  FROM core.reservations
  WHERE schedule_id = p_schedule_id
    AND status IN ('requested', 'confirmed');

  IF v_booked_count >= v_schedule.max_capacity THEN
    RAISE EXCEPTION 'CAPACITY_EXCEEDED: 예약 정원(%명)이 모두 마감되었습니다.', v_schedule.max_capacity;
  END IF;

  -- 5) 수강권 원자적 차감 (p_pass_id 제공 시)
  IF p_pass_id IS NOT NULL THEN
    -- session_passes 확인
    SELECT
      p.id,
      p.organization_id,
      p.customer_id,
      p.total_sessions,
      p.used_sessions,
      p.status,
      p.expires_at
    INTO v_pass
    FROM core.session_passes p
    WHERE p.id = p_pass_id AND p.organization_id = p_tenant_id
    FOR UPDATE;

    IF FOUND THEN
      IF v_pass.customer_id <> p_customer_id THEN
        RAISE EXCEPTION 'PASS_OWNERSHIP_MISMATCH: 수강권 소유자가 일치하지 않습니다.';
      END IF;

      IF v_pass.status <> 'active' THEN
        RAISE EXCEPTION 'PASS_NOT_USABLE: 사용 가능한 활성 상태의 수강권이 아닙니다.';
      END IF;

      IF v_pass.expires_at IS NOT NULL AND v_pass.expires_at < now() THEN
        RAISE EXCEPTION 'PASS_NOT_USABLE: 유효기간이 만료된 수강권입니다.';
      END IF;

      IF v_pass.used_sessions >= v_pass.total_sessions THEN
        RAISE EXCEPTION 'PASS_NOT_USABLE: 잔여 수강권 횟수가 부족합니다.';
      END IF;

      UPDATE core.session_passes
      SET used_sessions = used_sessions + 1,
          status = CASE WHEN used_sessions + 1 >= total_sessions THEN 'exhausted' ELSE 'active' END,
          updated_at = now()
      WHERE id = p_pass_id;
    ELSE
      -- core.passes 확인
      SELECT
        cp.id,
        cp.tenant_id,
        cp.customer_id,
        cp.remaining_count,
        cp.status,
        cp.expires_at,
        cp.is_active
      INTO v_pass
      FROM core.passes cp
      WHERE cp.id = p_pass_id AND cp.tenant_id = p_tenant_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'PASS_NOT_FOUND: 수강권/이용권을 찾을 수 없습니다.';
      END IF;

      IF v_pass.customer_id <> p_customer_id THEN
        RAISE EXCEPTION 'PASS_OWNERSHIP_MISMATCH: 이용권 소유자가 일치하지 않습니다.';
      END IF;

      IF v_pass.is_active IS NOT TRUE OR v_pass.status = 'PAUSED' THEN
        RAISE EXCEPTION 'PASS_NOT_USABLE: 사용 가능한 활성 상태의 이용권이 아닙니다.';
      END IF;

      IF v_pass.expires_at < CURRENT_DATE THEN
        UPDATE core.passes SET status = 'EXPIRED', updated_at = now() WHERE id = p_pass_id;
        RAISE EXCEPTION 'PASS_NOT_USABLE: 유효기간이 만료된 이용권입니다.';
      END IF;

      IF v_pass.remaining_count <= 0 THEN
        UPDATE core.passes SET status = 'EXHAUSTED', updated_at = now() WHERE id = p_pass_id;
        RAISE EXCEPTION 'PASS_NOT_USABLE: 잔여 이용권 횟수가 부족합니다.';
      END IF;

      UPDATE core.passes
      SET remaining_count = remaining_count - 1,
          status = CASE WHEN remaining_count - 1 <= 0 THEN 'EXHAUSTED' ELSE 'ACTIVE' END,
          updated_at = now()
      WHERE id = p_pass_id;
    END IF;
  END IF;

  -- 6) 예약 레코드 생성 (단일 트랜잭션 보장)
  INSERT INTO core.reservations (
    organization_id,
    schedule_id,
    customer_id,
    session_pass_id,
    status,
    notes,
    created_at,
    updated_at
  ) VALUES (
    v_schedule.organization_id,
    p_schedule_id,
    p_customer_id,
    p_pass_id,
    'confirmed',
    '예약 비관적 락(FOR UPDATE) 원자적 생성',
    now(),
    now()
  )
  RETURNING id INTO v_reservation_id;

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'schedule_id', p_schedule_id,
    'customer_id', p_customer_id,
    'pass_id', p_pass_id,
    'booked_count', v_booked_count + 1,
    'max_capacity', v_schedule.max_capacity,
    'remaining_capacity', GREATEST(0, v_schedule.max_capacity - (v_booked_count + 1))
  );
END;
$$;

-- 기존 3인자 호출 호환 래퍼
CREATE OR REPLACE FUNCTION core.book_schedule_slot(
  p_schedule_id UUID,
  p_customer_id UUID,
  p_pass_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT organization_id INTO v_tenant_id
  FROM core.schedules
  WHERE id = p_schedule_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'SCHEDULE_NOT_FOUND: 예약 대상을 찾을 수 없습니다.';
  END IF;

  RETURN core.book_schedule_slot(v_tenant_id, p_schedule_id, p_customer_id, p_pass_id);
END;
$$;

-- public 노출 래퍼
CREATE OR REPLACE FUNCTION public.book_schedule_slot(
  p_tenant_id UUID,
  p_schedule_id UUID,
  p_customer_id UUID,
  p_pass_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
  SELECT core.book_schedule_slot(p_tenant_id, p_schedule_id, p_customer_id, p_pass_id);
$$;

GRANT EXECUTE ON FUNCTION core.book_schedule_slot(UUID, UUID, UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.book_schedule_slot(UUID, UUID, UUID, UUID) TO authenticated, anon;


-- -----------------------------------------------------------------------------
-- 2. 이용권 원자적 차감 RPC (core.deduct_pass_atomic with tenant isolation & FOR UPDATE)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.deduct_pass_atomic(
  p_tenant_id UUID,
  p_pass_id UUID,
  p_count INT DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_pass RECORD;
  v_new_count INT;
  v_new_status TEXT;
  v_deduct_count INT := GREATEST(1, COALESCE(p_count, 1));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_REQUIRED: 테넌트 식별자(p_tenant_id)가 필요합니다.';
  END IF;

  -- 1) 이용권 행 배타적 잠금(FOR UPDATE)
  SELECT * INTO v_pass
  FROM core.passes
  WHERE id = p_pass_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PASS_NOT_FOUND: 이용권을 찾을 수 없거나 테넌트가 일치하지 않습니다.';
  END IF;

  -- 2) 테넌트 소속 권한 확인
  IF NOT core.is_org_member(v_pass.tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- 3) 활성 상태 검증
  IF v_pass.is_active IS NOT TRUE OR v_pass.status = 'PAUSED' THEN
    RAISE EXCEPTION 'PASS_NOT_USABLE: 이용권이 활성 상태가 아니거나 일시정지되었습니다.';
  END IF;

  -- 4) 유효기간 검증
  IF v_pass.expires_at < CURRENT_DATE THEN
    UPDATE core.passes
    SET status = 'EXPIRED', updated_at = now()
    WHERE id = p_pass_id;
    RAISE EXCEPTION 'PASS_NOT_USABLE: 유효기간이 만료된 이용권입니다.';
  END IF;

  -- 5) 잔여 횟수 검증 (기간제 제외)
  IF v_pass.pass_type != 'PERIOD_BASED' AND v_pass.remaining_count < v_deduct_count THEN
    IF v_pass.remaining_count <= 0 THEN
      UPDATE core.passes
      SET status = 'EXHAUSTED', updated_at = now()
      WHERE id = p_pass_id;
    END IF;
    RAISE EXCEPTION 'PASS_NOT_USABLE: 잔여 횟수가 부족합니다. (현재 %회, 요청 %회)', v_pass.remaining_count, v_deduct_count;
  END IF;

  -- 6) 차감 적용
  IF v_pass.pass_type = 'PERIOD_BASED' THEN
    v_new_count := v_pass.remaining_count;
    v_new_status := 'ACTIVE';
  ELSE
    v_new_count := GREATEST(0, v_pass.remaining_count - v_deduct_count);
    v_new_status := CASE WHEN v_new_count = 0 THEN 'EXHAUSTED' ELSE 'ACTIVE' END;
  END IF;

  UPDATE core.passes
  SET remaining_count = v_new_count,
      status = v_new_status,
      updated_at = now()
  WHERE id = p_pass_id;

  RETURN jsonb_build_object(
    'success', true,
    'pass_id', p_pass_id,
    'remaining_count', v_new_count,
    'deducted_count', v_deduct_count,
    'status', v_new_status
  );
END;
$$;

-- 기존 1인자 호환 래퍼
CREATE OR REPLACE FUNCTION core.deduct_pass_atomic(p_pass_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_tenant UUID;
BEGIN
  SELECT tenant_id INTO v_tenant
  FROM core.passes
  WHERE id = p_pass_id;

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'PASS_NOT_FOUND: 이용권을 찾을 수 없습니다.';
  END IF;

  RETURN core.deduct_pass_atomic(v_tenant, p_pass_id, 1);
END;
$$;

-- public 노출 래퍼
CREATE OR REPLACE FUNCTION public.deduct_pass_atomic(
  p_tenant_id UUID,
  p_pass_id UUID,
  p_count INT DEFAULT 1
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
  SELECT core.deduct_pass_atomic(p_tenant_id, p_pass_id, p_count);
$$;

CREATE OR REPLACE FUNCTION public.deduct_pass_atomic(p_pass_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
  SELECT core.deduct_pass_atomic(p_pass_id);
$$;

GRANT EXECUTE ON FUNCTION core.deduct_pass_atomic(UUID, UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_pass_atomic(UUID, UUID, INT) TO authenticated;


-- -----------------------------------------------------------------------------
-- 3. 소매/교재 재고 원자적 차감 RPC (core.deduct_inventory_stock_atomic with FOR UPDATE)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.deduct_inventory_stock_atomic(
  p_tenant_id UUID,
  p_product_id UUID,
  p_quantity NUMERIC,
  p_variant_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT 'sale',
  p_reference_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_stock_location_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_qty_abs NUMERIC(14, 3);
  v_inv core.inventory%ROWTYPE;
  v_loc UUID;
  v_new_qty NUMERIC(14, 3);
  v_mov_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_REQUIRED: 테넌트 식별자(p_tenant_id)가 필요합니다.';
  END IF;

  IF p_product_id IS NULL THEN
    RAISE EXCEPTION 'PRODUCT_REQUIRED: 상품 식별자(p_product_id)가 필요합니다.';
  END IF;

  v_qty_abs := COALESCE(p_quantity, 0);
  IF v_qty_abs <= 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY: 차감 수량은 0보다 커야 합니다.';
  END IF;

  IF NOT core.is_org_member(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- 재고 보관 장소 확인
  v_loc := p_stock_location_id;
  IF v_loc IS NULL THEN
    v_loc := core.ensure_central_stock_location_id(p_tenant_id);
  END IF;

  -- 재고 행 준비 (없으면 0으로 생성 후 FOR UPDATE 잠금)
  IF p_variant_id IS NULL THEN
    INSERT INTO core.inventory (organization_id, product_id, variant_id, quantity, stock_location_id)
    VALUES (p_tenant_id, p_product_id, NULL, 0, v_loc)
    ON CONFLICT (organization_id, product_id, stock_location_id)
      WHERE (variant_id IS NULL AND product_id IS NOT NULL)
    DO NOTHING;

    SELECT * INTO v_inv
    FROM core.inventory
    WHERE organization_id = p_tenant_id
      AND product_id = p_product_id
      AND variant_id IS NULL
      AND stock_location_id = v_loc
    FOR UPDATE;
  ELSE
    INSERT INTO core.inventory (organization_id, product_id, variant_id, quantity, stock_location_id)
    VALUES (p_tenant_id, p_product_id, p_variant_id, 0, v_loc)
    ON CONFLICT (organization_id, variant_id, stock_location_id)
      WHERE (variant_id IS NOT NULL)
    DO NOTHING;

    SELECT * INTO v_inv
    FROM core.inventory
    WHERE organization_id = p_tenant_id
      AND variant_id = p_variant_id
      AND stock_location_id = v_loc
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVENTORY_ROW_FAILED: 재고 행을 조회하지 못했습니다.';
  END IF;

  -- 재고 부족 검증 (비관적 락으로 동시 차감 시 음수 방지)
  IF v_inv.quantity < v_qty_abs THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK: 재고가 부족합니다. (현재: %, 요청: %)', v_inv.quantity, v_qty_abs;
  END IF;

  v_new_qty := v_inv.quantity - v_qty_abs;

  -- 1) 재고 잔량 갱신
  UPDATE core.inventory
  SET quantity = v_new_qty,
      updated_at = now()
  WHERE id = v_inv.id;

  -- 2) 재고 이동 이력(stock_movements) 기록
  INSERT INTO core.stock_movements (
    organization_id,
    product_id,
    variant_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    reason,
    stock_location_id,
    created_at
  ) VALUES (
    p_tenant_id,
    p_product_id,
    p_variant_id,
    'sale',
    -v_qty_abs,
    COALESCE(p_reference_type, 'sale'),
    p_reference_id,
    p_reason,
    v_loc,
    now()
  )
  RETURNING id INTO v_mov_id;

  RETURN jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'variant_id', p_variant_id,
    'quantity_before', v_inv.quantity,
    'quantity_after', v_new_qty,
    'deducted', v_qty_abs,
    'movement_id', v_mov_id
  );
END;
$$;

-- public 노출 래퍼
CREATE OR REPLACE FUNCTION public.deduct_inventory_stock_atomic(
  p_tenant_id UUID,
  p_product_id UUID,
  p_quantity NUMERIC,
  p_variant_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT 'sale',
  p_reference_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_stock_location_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
  SELECT core.deduct_inventory_stock_atomic(
    p_tenant_id,
    p_product_id,
    p_quantity,
    p_variant_id,
    p_reference_type,
    p_reference_id,
    p_reason,
    p_stock_location_id
  );
$$;

GRANT EXECUTE ON FUNCTION core.deduct_inventory_stock_atomic(UUID, UUID, NUMERIC, UUID, TEXT, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_inventory_stock_atomic(UUID, UUID, NUMERIC, UUID, TEXT, UUID, TEXT, UUID) TO authenticated;

COMMIT;
