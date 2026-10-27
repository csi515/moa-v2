-- ==============================================================================
-- Moa-v2 Capability: Change Management (4M / ECN / ECO) Domain Schema
-- 
-- 1) core.change_orders: 엔지니어링 및 공정 4M(Man, Machine, Material, Method) 변경 통지서
-- 2) core.change_order_evaluations: 부서별(품질, 생산, 안전, 엔지니어링) 사전 영향도 평가서
-- 3) core.apply_change_order_atomic: 승인된 변경 사양 현장 적용 처리 원자적 RPC
-- ==============================================================================

-- 1. Change Orders Table
CREATE TABLE IF NOT EXISTS core.change_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  change_number text NOT NULL, -- e.g. "ECN-202610-001"
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('man', 'machine', 'material', 'method', 'spec')),
  reason text NOT NULL,
  before_description text NOT NULL,
  after_description text NOT NULL,
  risk_level text NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewing', 'approved', 'applied', 'rejected', 'cancelled')),
  effective_date date,
  requester_id uuid,
  requester_name text NOT NULL,
  approval_request_id uuid REFERENCES core.approval_requests(id) ON DELETE SET NULL,
  applied_at timestamptz,
  applied_by text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_change_orders_org_status
  ON core.change_orders (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_change_orders_org_category
  ON core.change_orders (organization_id, category);

COMMENT ON TABLE core.change_orders IS '엔지니어링/공정 4M(작업자, 설비, 원자재, 작업방법) 변경 통지서(ECN) 및 사양 변경 관리 대장';

-- 2. Change Order Evaluations Table
CREATE TABLE IF NOT EXISTS core.change_order_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  change_order_id uuid NOT NULL REFERENCES core.change_orders(id) ON DELETE CASCADE,
  evaluator_role text NOT NULL CHECK (evaluator_role IN ('quality', 'production', 'safety', 'procurement', 'engineering')),
  evaluator_name text NOT NULL,
  impact_assessment text NOT NULL,
  is_approved boolean NOT NULL DEFAULT true,
  risk_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_change_order_evaluations_org_order
  ON core.change_order_evaluations (organization_id, change_order_id);

COMMENT ON TABLE core.change_order_evaluations IS '4M 변경 시 품질/생산/안전 부서별 영향도 사전 평가 및 검토 의견 대장';

-- ==============================================================================
-- RLS (Row Level Security) 설정
-- ==============================================================================
ALTER TABLE core.change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.change_order_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "change_orders_tenant_select" ON core.change_orders;
CREATE POLICY "change_orders_tenant_select"
  ON core.change_orders FOR SELECT
  USING (core.is_org_member(organization_id));

DROP POLICY IF EXISTS "change_orders_tenant_insert" ON core.change_orders;
CREATE POLICY "change_orders_tenant_insert"
  ON core.change_orders FOR INSERT
  WITH CHECK (core.is_org_member(organization_id));

DROP POLICY IF EXISTS "change_orders_tenant_update" ON core.change_orders;
CREATE POLICY "change_orders_tenant_update"
  ON core.change_orders FOR UPDATE
  USING (core.is_org_member(organization_id));

DROP POLICY IF EXISTS "change_orders_tenant_delete" ON core.change_orders;
CREATE POLICY "change_orders_tenant_delete"
  ON core.change_orders FOR DELETE
  USING (core.is_org_member(organization_id));

DROP POLICY IF EXISTS "change_order_evaluations_tenant_select" ON core.change_order_evaluations;
CREATE POLICY "change_order_evaluations_tenant_select"
  ON core.change_order_evaluations FOR SELECT
  USING (core.is_org_member(organization_id));

DROP POLICY IF EXISTS "change_order_evaluations_tenant_insert" ON core.change_order_evaluations;
CREATE POLICY "change_order_evaluations_tenant_insert"
  ON core.change_order_evaluations FOR INSERT
  WITH CHECK (core.is_org_member(organization_id));

DROP POLICY IF EXISTS "change_order_evaluations_tenant_update" ON core.change_order_evaluations;
CREATE POLICY "change_order_evaluations_tenant_update"
  ON core.change_order_evaluations FOR UPDATE
  USING (core.is_org_member(organization_id));

DROP POLICY IF EXISTS "change_order_evaluations_tenant_delete" ON core.change_order_evaluations;
CREATE POLICY "change_order_evaluations_tenant_delete"
  ON core.change_order_evaluations FOR DELETE
  USING (core.is_org_member(organization_id));

-- ==============================================================================
-- 3. Atomic RPC: apply_change_order_atomic
-- 승인 완료된 4M 변경건을 현장에 적용하고, 감사 추적 상태를 기록
-- ==============================================================================
CREATE OR REPLACE FUNCTION core.apply_change_order_atomic(
  p_org_id uuid,
  p_change_order_id uuid,
  p_applied_by text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_result jsonb;
BEGIN
  -- 테넌트 소속 및 권한 확인
  IF NOT core.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: User is not an authorized member of organization %', p_org_id;
  END IF;

  -- 대상 변경서 조회 (동시성 락)
  SELECT * INTO v_order
  FROM core.change_orders
  WHERE id = p_change_order_id AND organization_id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: Change order % does not exist in org %', p_change_order_id, p_org_id;
  END IF;

  IF v_order.status NOT IN ('approved', 'reviewing') THEN
    RAISE EXCEPTION 'INVALID_STATUS: Only approved or reviewing change orders can be applied (current: %)', v_order.status;
  END IF;

  -- 상태를 applied로 갱신
  UPDATE core.change_orders
  SET
    status = 'applied',
    applied_at = now(),
    applied_by = p_applied_by,
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE id = p_change_order_id;

  v_result := jsonb_build_object(
    'success', true,
    'change_order_id', p_change_order_id,
    'change_number', v_order.change_number,
    'category', v_order.category,
    'status', 'applied',
    'applied_at', now(),
    'applied_by', p_applied_by
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION core.apply_change_order_atomic IS '4M 사양 변경서(ECN) 현장 최종 적용 처리 원자적 RPC';
