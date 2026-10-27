-- ==============================================================================
-- Moa-v2 Capability: Purchase Requisition (PR) and Vendor Quotes Domain Schema
-- 
-- 1) core.purchase_requisitions: 현장 구매 요청서 및 승인/발주 연계 대장
-- 2) core.vendor_quotes: 공급업체별 견적 비교 대사표 및 최종 업체 선정
-- 3) core.select_vendor_quote_atomic: 원자적 최적 견적 선정 RPC
-- ==============================================================================

-- 1. Purchase Requisitions Table
CREATE TABLE IF NOT EXISTS core.purchase_requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  pr_number text NOT NULL,
  title text NOT NULL,
  requester_id uuid,
  requester_name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'ordered', 'received')),
  approval_request_id uuid REFERENCES core.approval_requests(id) ON DELETE SET NULL,
  needed_by_date date,
  total_estimated_amount numeric(12, 2) NOT NULL DEFAULT 0,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  justification text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_purchase_reqs_org_number UNIQUE (organization_id, pr_number)
);

CREATE INDEX IF NOT EXISTS idx_purchase_reqs_org_status
  ON core.purchase_requisitions (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_purchase_reqs_approval
  ON core.purchase_requisitions (organization_id, approval_request_id);

COMMENT ON TABLE core.purchase_requisitions IS '현장 구매 요청서(PR) 및 전자결재/발주 연계 대장';

-- 2. Vendor Quotes Table
CREATE TABLE IF NOT EXISTS core.vendor_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  pr_id uuid NOT NULL REFERENCES core.purchase_requisitions(id) ON DELETE CASCADE,
  vendor_id uuid,
  vendor_name text NOT NULL,
  quoted_amount numeric(12, 2) NOT NULL,
  lead_time_days integer NOT NULL DEFAULT 3,
  is_selected boolean NOT NULL DEFAULT false,
  quote_file_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_quotes_pr
  ON core.vendor_quotes (organization_id, pr_id);

COMMENT ON TABLE core.vendor_quotes IS '구매 요청 건별 복수 공급업체 견적 비교 대사표';

-- ==============================================================================
-- RLS (Row Level Security) 설정
-- ==============================================================================
ALTER TABLE core.purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.vendor_quotes ENABLE ROW LEVEL SECURITY;

-- 1. purchase_requisitions RLS
DROP POLICY IF EXISTS purchase_requisitions_org_isolation ON core.purchase_requisitions;
CREATE POLICY purchase_requisitions_org_isolation ON core.purchase_requisitions
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

-- 2. vendor_quotes RLS
DROP POLICY IF EXISTS vendor_quotes_org_isolation ON core.vendor_quotes;
CREATE POLICY vendor_quotes_org_isolation ON core.vendor_quotes
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
-- 원자적 견적 채택 RPC: core.select_vendor_quote_atomic
-- ==============================================================================
CREATE OR REPLACE FUNCTION core.select_vendor_quote_atomic(
  p_pr_id uuid,
  p_quote_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, pg_temp
AS $$
DECLARE
  v_pr core.purchase_requisitions%ROWTYPE;
  v_quote core.vendor_quotes%ROWTYPE;
BEGIN
  -- 1. PR 검증 및 잠금
  SELECT * INTO v_pr
  FROM core.purchase_requisitions
  WHERE id = p_pr_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '구매 요청서를 찾을 수 없습니다.');
  END IF;

  -- 테넌트 접근 권한 검증
  IF NOT EXISTS (
    SELECT 1 FROM core.organization_members
    WHERE organization_id = v_pr.organization_id
      AND user_id = auth.uid()
      AND is_active = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', '권한이 없습니다.');
  END IF;

  -- 2. 견적 존재 여부 확인
  SELECT * INTO v_quote
  FROM core.vendor_quotes
  WHERE id = p_quote_id AND pr_id = p_pr_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '해당 견적을 찾을 수 없습니다.');
  END IF;

  -- 3. 기존 선정 초기화 후 신규 견적 선정
  UPDATE core.vendor_quotes
  SET is_selected = (id = p_quote_id)
  WHERE pr_id = p_pr_id;

  RETURN jsonb_build_object(
    'success', true,
    'pr_id', p_pr_id,
    'selected_quote_id', p_quote_id,
    'vendor_name', v_quote.vendor_name,
    'quoted_amount', v_quote.quoted_amount
  );
END;
$$;
