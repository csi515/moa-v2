-- ==============================================================================
-- Moa-v2 Capability: Cross-Department Approval Workflow Domain Schema
-- 
-- 1) core.approval_templates: 결재 양식 템플릿 (지출/구매/휴가/작업승인 등)
-- 2) core.approval_requests: 결재 기안 문서 및 전체 승인 상태
-- 3) core.approval_steps: 단계별 결재자(검토/결재/합의), 서명 및 의견
-- 4) core.process_approval_step_atomic: 원자적 결재/반려 처리 RPC
-- ==============================================================================

-- 1. Approval Templates (양식 템플릿)
CREATE TABLE IF NOT EXISTS core.approval_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'expense', 'purchase', 'leave', 'work_order', 'it_change')),
  description text,
  form_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_templates_org_cat
  ON core.approval_templates (organization_id, category);

COMMENT ON TABLE core.approval_templates IS '부서별 전자결재 양식 템플릿 및 기본 결재선 설정';

-- 2. Approval Requests (결재 기안 문서)
CREATE TABLE IF NOT EXISTS core.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  template_id uuid REFERENCES core.approval_templates(id) ON DELETE SET NULL,
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  requester_id uuid,
  requester_name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'canceled')),
  current_step_order integer NOT NULL DEFAULT 1,
  total_steps integer NOT NULL DEFAULT 1,
  entity_type text, -- 다형성 연계: 'expense', 'purchase_order', 'task_order', 'general'
  entity_id text,
  final_approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_org_status
  ON core.approval_requests (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_approval_requests_requester
  ON core.approval_requests (organization_id, requester_id);

CREATE INDEX IF NOT EXISTS idx_approval_requests_entity
  ON core.approval_requests (organization_id, entity_type, entity_id);

COMMENT ON TABLE core.approval_requests IS '전사 공통 전자결재 기안 문서 및 최종 진행 상태 대장';

-- 3. Approval Steps (단계별 결재선)
CREATE TABLE IF NOT EXISTS core.approval_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES core.approval_requests(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  step_type text NOT NULL DEFAULT 'approval' CHECK (step_type IN ('review', 'approval', 'consensus')),
  approver_id uuid,
  approver_name text NOT NULL,
  approver_role text,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'pending', 'approved', 'rejected', 'skipped')),
  comment text,
  signature_url text, -- 모바일 터치 전자서명 Data URL
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_approval_step_order UNIQUE (request_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_approval_steps_approver
  ON core.approval_steps (organization_id, approver_id, status);

COMMENT ON TABLE core.approval_steps IS '기안 문서별 다단계 결재선(검토·승인·합의), 서명 및 심사의견';

-- ==============================================================================
-- RLS (Row Level Security) 설정
-- ==============================================================================
ALTER TABLE core.approval_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.approval_steps ENABLE ROW LEVEL SECURITY;

-- 1. approval_templates RLS
DROP POLICY IF EXISTS approval_templates_org_isolation ON core.approval_templates;
CREATE POLICY approval_templates_org_isolation ON core.approval_templates
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

-- 2. approval_requests RLS
DROP POLICY IF EXISTS approval_requests_org_isolation ON core.approval_requests;
CREATE POLICY approval_requests_org_isolation ON core.approval_requests
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

-- 3. approval_steps RLS
DROP POLICY IF EXISTS approval_steps_org_isolation ON core.approval_steps;
CREATE POLICY approval_steps_org_isolation ON core.approval_steps
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
-- 원자적 결재 처리 RPC: core.process_approval_step_atomic
-- ==============================================================================
CREATE OR REPLACE FUNCTION core.process_approval_step_atomic(
  p_request_id uuid,
  p_step_id uuid,
  p_action text, -- 'approve' | 'reject'
  p_comment text DEFAULT NULL,
  p_signature_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, pg_temp
AS $$
DECLARE
  v_req core.approval_requests%ROWTYPE;
  v_step core.approval_steps%ROWTYPE;
  v_next_step core.approval_steps%ROWTYPE;
  v_caller_uid uuid;
BEGIN
  v_caller_uid := auth.uid();

  -- 1. 결재 문서 검증
  SELECT * INTO v_req FROM core.approval_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'APPROVAL_REQUEST_NOT_FOUND');
  END IF;

  IF v_req.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_REQUEST_STATUS');
  END IF;

  -- 2. 단계 검증
  SELECT * INTO v_step FROM core.approval_steps WHERE id = p_step_id AND request_id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'APPROVAL_STEP_NOT_FOUND');
  END IF;

  IF v_step.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_STEP_STATUS');
  END IF;

  -- 3. 승인 처리
  IF p_action = 'approve' THEN
    UPDATE core.approval_steps
    SET status = 'approved',
        comment = p_comment,
        signature_url = p_signature_url,
        processed_at = now()
    WHERE id = p_step_id;

    -- 다음 결재 단계 확인
    SELECT * INTO v_next_step
    FROM core.approval_steps
    WHERE request_id = p_request_id AND step_order = v_step.step_order + 1;

    IF FOUND THEN
      -- 다음 단계 활성화
      UPDATE core.approval_steps SET status = 'pending' WHERE id = v_next_step.id;
      UPDATE core.approval_requests
      SET current_step_order = v_step.step_order + 1,
          updated_at = now()
      WHERE id = p_request_id;
    ELSE
      -- 모든 단계 승인 완료 -> 최종 승인
      UPDATE core.approval_requests
      SET status = 'approved',
          final_approved_at = now(),
          updated_at = now()
      WHERE id = p_request_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'action', 'approved', 'is_final', NOT FOUND);

  -- 4. 반려 처리
  ELSIF p_action = 'reject' THEN
    UPDATE core.approval_steps
    SET status = 'rejected',
        comment = p_comment,
        processed_at = now()
    WHERE id = p_step_id;

    -- 이후 단계 취소/스킵
    UPDATE core.approval_steps
    SET status = 'skipped'
    WHERE request_id = p_request_id AND step_order > v_step.step_order;

    -- 문서 상태 반려
    UPDATE core.approval_requests
    SET status = 'rejected',
        rejected_at = now(),
        rejection_reason = p_comment,
        updated_at = now()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true, 'action', 'rejected');

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_ACTION');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION core.process_approval_step_atomic TO authenticated;
