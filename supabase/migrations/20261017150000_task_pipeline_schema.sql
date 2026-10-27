-- ==============================================================================
-- Moa-v2 Capability: Task Pipeline & Work Order Domain Schema
-- 
-- 1) core.task_orders: 맞춤제작/수선/정비/공정 작업 주문 대장 (work_order 통합)
-- 2) core.task_order_timelines: 공정 단계 전이 불변 이력 및 소요시간 추적 로그
-- 3) core.transition_task_order_stage_atomic: 원자적 단계 전이 및 타임라인 로깅 RPC
-- ==============================================================================

-- 1. Task Orders Table
CREATE TABLE IF NOT EXISTS core.task_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  order_type text NOT NULL DEFAULT 'custom_order' CHECK (order_type IN ('custom_order', 'repair', 'manufacturing', 'maintenance', 'inspection')),
  title text NOT NULL,
  customer_id uuid REFERENCES core.customers(id) ON DELETE SET NULL,
  customer_name text,
  customer_phone text,
  target_item_name text,
  current_stage text NOT NULL DEFAULT 'RECEIVED' CHECK (current_stage IN ('RECEIVED', 'IN_PROGRESS', 'PARTS_WAITING', 'INSPECTION', 'READY_FOR_PICKUP', 'COMPLETED', 'ON_HOLD', 'CANCELLED')),
  stage_entered_at timestamptz NOT NULL DEFAULT now(),
  assigned_staff_id uuid REFERENCES core.staff(id) ON DELETE SET NULL,
  assigned_staff_name text,
  sla_hours integer NOT NULL DEFAULT 24,
  labor_fee numeric(12, 2) NOT NULL DEFAULT 0,
  parts_cost numeric(12, 2) NOT NULL DEFAULT 0,
  total_amount numeric(12, 2) NOT NULL DEFAULT 0,
  diagnosis text,
  hold_reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_task_orders_org_number UNIQUE (organization_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_task_orders_org_stage
  ON core.task_orders (organization_id, current_stage);

CREATE INDEX IF NOT EXISTS idx_task_orders_org_type
  ON core.task_orders (organization_id, order_type);

CREATE INDEX IF NOT EXISTS idx_task_orders_org_cust
  ON core.task_orders (organization_id, customer_id);

COMMENT ON TABLE core.task_orders IS '전사 작업 공정 파이프라인 및 주문제작/정비 작업 주문 대장';

-- 2. Task Order Timelines Table
CREATE TABLE IF NOT EXISTS core.task_order_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  task_order_id uuid NOT NULL REFERENCES core.task_orders(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  changed_by_user_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_order_timelines_order
  ON core.task_order_timelines (organization_id, task_order_id);

COMMENT ON TABLE core.task_order_timelines IS '작업 주문 공정 단계 전이 불변 이력 및 타임라인 로그';

-- ==============================================================================
-- RLS (Row Level Security) 설정
-- ==============================================================================
ALTER TABLE core.task_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.task_order_timelines ENABLE ROW LEVEL SECURITY;

-- 1. task_orders RLS
DROP POLICY IF EXISTS task_orders_org_isolation ON core.task_orders;
CREATE POLICY task_orders_org_isolation ON core.task_orders
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

-- 2. task_order_timelines RLS
DROP POLICY IF EXISTS task_order_timelines_org_isolation ON core.task_order_timelines;
CREATE POLICY task_order_timelines_org_isolation ON core.task_order_timelines
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

-- ==============================================================================
-- 원자적 작업 공정 단계 전이 RPC: core.transition_task_order_stage_atomic
-- ==============================================================================
CREATE OR REPLACE FUNCTION core.transition_task_order_stage_atomic(
  p_order_id uuid,
  p_target_stage text,
  p_hold_reason text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, pg_temp
AS $$
DECLARE
  v_order core.task_orders%ROWTYPE;
  v_from_stage text;
BEGIN
  -- 1. 대상 주문 조회 및 잠금
  SELECT * INTO v_order
  FROM core.task_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '작업 주문을 찾을 수 없습니다.');
  END IF;

  -- 테넌트 접근 권한 검증
  IF NOT EXISTS (
    SELECT 1 FROM core.organization_members
    WHERE organization_id = v_order.organization_id
      AND user_id = auth.uid()
      AND is_active = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', '권한이 없습니다.');
  END IF;

  v_from_stage := v_order.current_stage;

  -- 2. 주문 상태 갱신
  UPDATE core.task_orders
  SET current_stage = p_target_stage,
      stage_entered_at = now(),
      hold_reason = CASE WHEN p_target_stage = 'ON_HOLD' THEN p_hold_reason ELSE hold_reason END,
      updated_at = now()
  WHERE id = p_order_id;

  -- 3. 불변 타임라인 이력 기록
  INSERT INTO core.task_order_timelines (
    organization_id,
    task_order_id,
    from_stage,
    to_stage,
    changed_by_user_id,
    note
  ) VALUES (
    v_order.organization_id,
    p_order_id,
    v_from_stage,
    p_target_stage,
    auth.uid(),
    p_note
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'from_stage', v_from_stage,
    'to_stage', p_target_stage
  );
END;
$$;
