-- 20261016190000_level_turnaround_restock.sql
-- 3대 확장 Capability: level_assessment, space_turnaround, supply_restock

-- ============================================================================
-- 1. level_assessment (정기 승급·승품 심사 및 모바일 합격증)
-- ============================================================================
CREATE TABLE IF NOT EXISTS core.level_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- 예: "2026년 제2회 정기 승품·승단 심사"
  target_program TEXT NOT NULL, -- "태권도", "피아노", "검도", "수영"
  assessment_date DATE NOT NULL,
  passing_score NUMERIC NOT NULL DEFAULT 70,
  rubric_items JSONB NOT NULL DEFAULT '[]', -- 채점 항목 [{ id, name, maxScore, weight }]
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES core.level_assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  current_level TEXT NOT NULL, -- 예: "파란띠", "바이엘 4권", "초급"
  target_level TEXT NOT NULL,  -- 예: "밤띠", "체르니 100", "중급"
  scores JSONB NOT NULL DEFAULT '{}', -- { [rubricId]: score }
  total_score NUMERIC NOT NULL DEFAULT 0,
  is_passed BOOLEAN NOT NULL DEFAULT false,
  certificate_number TEXT, -- 발급 고유 번호 (예: CERT-2026-001)
  evaluator_feedback TEXT,
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assessment_org_date
  ON core.level_assessments (organization_id, assessment_date DESC);

CREATE INDEX IF NOT EXISTS idx_assessment_results_assessment
  ON core.assessment_results (assessment_id, is_passed);

-- ============================================================================
-- 2. space_turnaround (공간 블록 대여 & 15분 정비/청소 버퍼)
-- ============================================================================
CREATE TABLE IF NOT EXISTS core.space_turnarounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  room_id UUID NOT NULL,
  room_name TEXT NOT NULL,
  booking_id UUID,
  service_start_at TIMESTAMPTZ NOT NULL,
  service_end_at TIMESTAMPTZ NOT NULL,
  buffer_minutes INT NOT NULL DEFAULT 15,
  buffer_end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_service', -- 'in_service', 'cleaning_needed', 'cleaning_in_progress', 'ready_for_next'
  cleaner_staff_id UUID,
  checklist JSONB NOT NULL DEFAULT '[]', -- [{ id, item, done }]
  cleaned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_turnaround_room_status
  ON core.space_turnarounds (organization_id, room_id, status);

CREATE INDEX IF NOT EXISTS idx_turnaround_buffer_end
  ON core.space_turnarounds (organization_id, buffer_end_at);

-- ============================================================================
-- 3. supply_restock (소모품/비품 안전재고 감지 및 원터치 간이 발주서)
-- ============================================================================
CREATE TABLE IF NOT EXISTS core.supply_restock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general', -- 'stationery', 'sanitary', 'lesson_material', 'beverage', 'general'
  current_quantity INT NOT NULL DEFAULT 0,
  safety_threshold INT NOT NULL DEFAULT 5, -- 최소 안전재고
  optimal_order_quantity INT NOT NULL DEFAULT 10, -- 1회 권장 발주량
  unit TEXT NOT NULL DEFAULT 'EA', -- 'EA', 'BOX', 'PACK', 'KG'
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  vendor_name TEXT NOT NULL,
  vendor_contact TEXT,
  status TEXT NOT NULL DEFAULT 'sufficient', -- 'sufficient', 'restock_needed', 'order_placed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL, -- 예: PO-20261016-001
  vendor_name TEXT NOT NULL,
  vendor_contact TEXT,
  order_items JSONB NOT NULL DEFAULT '[]', -- [{ itemId, itemName, quantity, unitCost, subtotal }]
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'received', 'cancelled'
  memo TEXT,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supply_restock_org_status
  ON core.supply_restock_items (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_po_org_vendor
  ON core.purchase_orders (organization_id, vendor_name, status);

-- ============================================================================
-- RLS 정책 설정 (Row Level Security)
-- ============================================================================
ALTER TABLE core.level_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.space_turnarounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.supply_restock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.purchase_orders ENABLE ROW LEVEL SECURITY;

-- 1. level_assessments RLS
DROP POLICY IF EXISTS level_assessments_all ON core.level_assessments;
CREATE POLICY level_assessments_all ON core.level_assessments
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

-- 2. assessment_results RLS
DROP POLICY IF EXISTS assessment_results_all ON core.assessment_results;
CREATE POLICY assessment_results_all ON core.assessment_results
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

-- 3. space_turnarounds RLS
DROP POLICY IF EXISTS space_turnarounds_all ON core.space_turnarounds;
CREATE POLICY space_turnarounds_all ON core.space_turnarounds
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

-- 4. supply_restock_items RLS
DROP POLICY IF EXISTS supply_restock_items_all ON core.supply_restock_items;
CREATE POLICY supply_restock_items_all ON core.supply_restock_items
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

-- 5. purchase_orders RLS
DROP POLICY IF EXISTS purchase_orders_all ON core.purchase_orders;
CREATE POLICY purchase_orders_all ON core.purchase_orders
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

GRANT SELECT, INSERT, UPDATE, DELETE ON core.level_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.assessment_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.space_turnarounds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.supply_restock_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.purchase_orders TO authenticated;
