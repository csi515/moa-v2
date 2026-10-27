-- 20261016140000_workplace_policy_and_operations.sql
-- 사규 관리 (workplace_policy), 현장 소통 건의함 (feedbacks), 교대 인수인계 (handover_notes), 안전사고 감사일지 (incident_logs)

-- 1. 매장 내규·사규 테이블
CREATE TABLE IF NOT EXISTS core.workplace_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'service_code', -- 'service_code', 'safety_rule', 'dormitory_rule', 'compensation', 'general'
  content TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workplace_policies_org_cat
  ON core.workplace_policies (organization_id, category);

CREATE INDEX IF NOT EXISTS idx_workplace_policies_mandatory
  ON core.workplace_policies (organization_id, is_mandatory);

COMMENT ON TABLE core.workplace_policies IS '사업장 복무 규정, 안전 수칙, 내규 및 버전 이력';

-- 2. 직원 필수 확인/서약 불변 감사 로그
CREATE TABLE IF NOT EXISTS core.policy_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES core.workplace_policies(id) ON DELETE CASCADE,
  policy_version INT NOT NULL,
  staff_id UUID NOT NULL,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signature_data_url TEXT NOT NULL, -- 모바일 터치 자필 서명 (SVG/Data URL)
  ip_address TEXT,
  user_agent TEXT,
  CONSTRAINT uq_policy_staff_version UNIQUE(policy_id, staff_id, policy_version)
);

CREATE INDEX IF NOT EXISTS idx_policy_ack_org_staff
  ON core.policy_acknowledgements (organization_id, staff_id);

COMMENT ON TABLE core.policy_acknowledgements IS '직원 사규 전자서약 불변 감사 로그 (수정/삭제 불가)';

-- 3. 현장 소통 건의함 (고객 VOC 및 직원 개선 건의 통합)
CREATE TABLE IF NOT EXISTS core.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL, -- 'customer' | 'staff'
  author_id UUID,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'in_progress' | 'resolved'
  is_internal_only BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_org_status
  ON core.feedbacks (organization_id, status);

COMMENT ON TABLE core.feedbacks IS '고객 VOC 및 직원 현장 개선 건의 통합 테이블';

-- 4. 교대 인수인계장 (오전/오후/마감 모바일 서명 확인)
CREATE TABLE IF NOT EXISTS core.handover_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift_type TEXT NOT NULL DEFAULT 'morning', -- 'morning', 'middle', 'evening', 'night'
  writer_staff_id UUID NOT NULL,
  content TEXT NOT NULL,
  checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  confirmed_by_next_shift_staff_id UUID,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_handover_notes_org_date
  ON core.handover_notes (organization_id, shift_date DESC);

COMMENT ON TABLE core.handover_notes IS '오전/오후 교대 근무 인수인계장 및 다음 근무자 서명 확인';

-- 5. 비공개 안전사고 감사 일지
CREATE TABLE IF NOT EXISTS core.incident_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  severity TEXT NOT NULL DEFAULT 'minor', -- 'minor', 'moderate', 'critical'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reporter_staff_id UUID,
  involved_customer_id UUID,
  actions_taken TEXT,
  preventive_measures TEXT,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incident_logs_org_occurred
  ON core.incident_logs (organization_id, occurred_at DESC);

COMMENT ON TABLE core.incident_logs IS '현장 안전사고 및 특이사항 비공개 감사 일지';

-- Row Level Security (RLS) 활성화
ALTER TABLE core.workplace_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.policy_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.handover_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.incident_logs ENABLE ROW LEVEL SECURITY;

-- 1. core.workplace_policies RLS
DROP POLICY IF EXISTS workplace_policies_select ON core.workplace_policies;
CREATE POLICY workplace_policies_select ON core.workplace_policies
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM core.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS workplace_policies_write ON core.workplace_policies;
CREATE POLICY workplace_policies_write ON core.workplace_policies
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM core.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM core.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

-- 2. core.policy_acknowledgements RLS (불변 서약 로그: UPDATE/DELETE 금지)
DROP POLICY IF EXISTS policy_ack_select ON core.policy_acknowledgements;
CREATE POLICY policy_ack_select ON core.policy_acknowledgements
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM core.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS policy_ack_insert ON core.policy_acknowledgements;
CREATE POLICY policy_ack_insert ON core.policy_acknowledgements
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM core.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 3. core.feedbacks RLS
DROP POLICY IF EXISTS feedbacks_select ON core.feedbacks;
CREATE POLICY feedbacks_select ON core.feedbacks
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM core.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS feedbacks_insert ON core.feedbacks;
CREATE POLICY feedbacks_insert ON core.feedbacks
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM core.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS feedbacks_update ON core.feedbacks;
CREATE POLICY feedbacks_update ON core.feedbacks
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM core.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

-- 4. core.handover_notes RLS
DROP POLICY IF EXISTS handover_notes_select ON core.handover_notes;
CREATE POLICY handover_notes_select ON core.handover_notes
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM core.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS handover_notes_write ON core.handover_notes;
CREATE POLICY handover_notes_write ON core.handover_notes
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

-- 5. core.incident_logs RLS (비공개: 직원 및 관리자만 열람/기록 가능)
DROP POLICY IF EXISTS incident_logs_all ON core.incident_logs;
CREATE POLICY incident_logs_all ON core.incident_logs
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

GRANT SELECT, INSERT, UPDATE, DELETE ON core.workplace_policies TO authenticated;
GRANT SELECT, INSERT ON core.policy_acknowledgements TO authenticated;
REVOKE UPDATE, DELETE ON core.policy_acknowledgements FROM authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON core.feedbacks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON core.handover_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON core.incident_logs TO authenticated;
