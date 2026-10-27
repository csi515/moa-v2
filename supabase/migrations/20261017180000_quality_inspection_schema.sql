-- ==============================================================================
-- Moa-v2 Capability: Quality Inspection (QA/QC) Domain Schema
-- 
-- 1) core.quality_inspection_standards: 제품/공정별 품질 검사 규격 및 허용 공차 기준
-- 2) core.quality_inspection_records: 로트별 정량 측정치, 합격/불합격 자동 판정 및 부적합 대장
-- 3) core.record_quality_inspection_atomic: 원자적 품질 측정 및 판정 RPC
-- ==============================================================================

-- 1. Quality Inspection Standards Table
CREATE TABLE IF NOT EXISTS core.quality_inspection_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  process_stage text NOT NULL DEFAULT 'final' CHECK (process_stage IN ('inbound', 'in_process', 'final', 'outgoing')),
  inspection_item text NOT NULL, -- e.g. "치수(외경)", "인장강도", "당도(Brix)", "유효성분 함량"
  unit text NOT NULL DEFAULT 'mm',
  target_value numeric(12, 3),
  min_threshold numeric(12, 3),
  max_threshold numeric(12, 3),
  sample_size integer NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quality_standards_org_stage
  ON core.quality_inspection_standards (organization_id, process_stage);

COMMENT ON TABLE core.quality_inspection_standards IS '공정/품목별 품질 검사 규격, 공차(Min/Max) 및 샘플링 기준표';

-- 2. Quality Inspection Records Table
CREATE TABLE IF NOT EXISTS core.quality_inspection_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  standard_id uuid REFERENCES core.quality_inspection_standards(id) ON DELETE SET NULL,
  lot_number text NOT NULL,
  sample_values jsonb NOT NULL DEFAULT '[]'::jsonb, -- 개별 샘플 실측치 배열 (e.g. [10.2, 10.1, 10.3])
  mean_value numeric(12, 3) NOT NULL,
  judgment text NOT NULL DEFAULT 'pass' CHECK (judgment IN ('pass', 'fail', 'conditional_pass')),
  defect_count integer NOT NULL DEFAULT 0,
  inspector_id uuid,
  inspector_name text NOT NULL,
  incident_report_id uuid REFERENCES core.facility_incident_reports(id) ON DELETE SET NULL,
  notes text,
  inspected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quality_records_org_lot
  ON core.quality_inspection_records (organization_id, lot_number);

CREATE INDEX IF NOT EXISTS idx_quality_records_judgment
  ON core.quality_inspection_records (organization_id, judgment);

COMMENT ON TABLE core.quality_inspection_records IS '품목 로트별 실측 측정값, 합격/불합격 판정 및 부적합(CAPA) 연계 대장';

-- ==============================================================================
-- RLS (Row Level Security) 설정
-- ==============================================================================
ALTER TABLE core.quality_inspection_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.quality_inspection_records ENABLE ROW LEVEL SECURITY;

-- 1. quality_inspection_standards RLS
DROP POLICY IF EXISTS quality_standards_org_isolation ON core.quality_inspection_standards;
CREATE POLICY quality_standards_org_isolation ON core.quality_inspection_standards
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

-- 2. quality_inspection_records RLS
DROP POLICY IF EXISTS quality_records_org_isolation ON core.quality_inspection_records;
CREATE POLICY quality_records_org_isolation ON core.quality_inspection_records
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
-- 원자적 품질 측정 및 판정 RPC: core.record_quality_inspection_atomic
-- ==============================================================================
CREATE OR REPLACE FUNCTION core.record_quality_inspection_atomic(
  p_organization_id uuid,
  p_standard_id uuid,
  p_lot_number text,
  p_sample_values jsonb,
  p_inspector_name text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, pg_temp
AS $$
DECLARE
  v_std core.quality_inspection_standards%ROWTYPE;
  v_val numeric;
  v_sum numeric := 0;
  v_count integer := 0;
  v_defects integer := 0;
  v_mean numeric := 0;
  v_judgment text := 'pass';
  v_record_id uuid;
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

  -- 1. 검사 규격 조회
  SELECT * INTO v_std
  FROM core.quality_inspection_standards
  WHERE id = p_standard_id;

  -- 2. 샘플 측정값 분석 및 평균/불량 판정
  FOR v_val IN SELECT jsonb_array_elements_text(p_sample_values)::numeric
  LOOP
    v_sum := v_sum + v_val;
    v_count := v_count + 1;

    IF (v_std.min_threshold IS NOT NULL AND v_val < v_std.min_threshold) OR
       (v_std.max_threshold IS NOT NULL AND v_val > v_std.max_threshold) THEN
      v_defects := v_defects + 1;
    END IF;
  END LOOP;

  IF v_count > 0 THEN
    v_mean := round(v_sum / v_count, 3);
  END IF;

  IF v_defects > 0 THEN
    v_judgment := 'fail';
  ELSE
    v_judgment := 'pass';
  END IF;

  -- 3. 검사 기록 생성
  INSERT INTO core.quality_inspection_records (
    organization_id,
    standard_id,
    lot_number,
    sample_values,
    mean_value,
    judgment,
    defect_count,
    inspector_name,
    notes
  ) VALUES (
    p_organization_id,
    p_standard_id,
    p_lot_number,
    p_sample_values,
    v_mean,
    v_judgment,
    v_defects,
    p_inspector_name,
    p_notes
  ) RETURNING id INTO v_record_id;

  RETURN jsonb_build_object(
    'success', true,
    'record_id', v_record_id,
    'mean_value', v_mean,
    'judgment', v_judgment,
    'defect_count', v_defects
  );
END;
$$;
