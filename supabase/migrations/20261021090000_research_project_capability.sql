-- ==============================================================================
-- Capability: research_project (연구과제 생명주기)
-- - 담당/부담당, 연구 예산, 기간, 산출물, 1~n차 게이트 승인
-- - MBO(mbo_projects)와 독립 SoT. project_categories는 선택 참조
-- ==============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS core.research_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  code VARCHAR(64),
  title TEXT NOT NULL,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'gate_review', 'completed', 'suspended', 'canceled')),
  category_id UUID REFERENCES core.project_categories(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget_planned NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (budget_planned >= 0),
  budget_spent NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (budget_spent >= 0),
  progress_rate INTEGER NOT NULL DEFAULT 0 CHECK (progress_rate >= 0 AND progress_rate <= 100),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_projects_title_not_blank CHECK (length(btrim(title)) > 0),
  CONSTRAINT research_projects_date_range CHECK (end_date >= start_date),
  CONSTRAINT research_projects_budget_spent_lte_planned CHECK (budget_spent <= budget_planned)
);

CREATE TABLE IF NOT EXISTS core.research_project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES core.research_projects(id) ON DELETE CASCADE,
  member_id UUID,
  member_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('lead', 'co_lead', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_project_members_name_not_blank CHECK (length(btrim(member_name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_research_project_one_lead
  ON core.research_project_members (project_id)
  WHERE role = 'lead';

CREATE TABLE IF NOT EXISTS core.research_project_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES core.research_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'submitted', 'accepted', 'rejected')),
  evidence_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_project_deliverables_title_not_blank CHECK (length(btrim(title)) > 0)
);

CREATE TABLE IF NOT EXISTS core.research_project_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES core.research_projects(id) ON DELETE CASCADE,
  gate_order INTEGER NOT NULL CHECK (gate_order >= 1),
  title TEXT NOT NULL,
  criteria TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
  decided_by UUID,
  decided_by_name TEXT,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_project_gates_title_not_blank CHECK (length(btrim(title)) > 0),
  CONSTRAINT uq_research_project_gates_order UNIQUE (project_id, gate_order)
);

CREATE INDEX IF NOT EXISTS idx_research_projects_org_status
  ON core.research_projects (organization_id, status, start_date);
CREATE INDEX IF NOT EXISTS idx_research_projects_org_category
  ON core.research_projects (organization_id, category_id);
CREATE INDEX IF NOT EXISTS idx_research_project_members_project
  ON core.research_project_members (project_id, role);
CREATE INDEX IF NOT EXISTS idx_research_project_deliverables_project
  ON core.research_project_deliverables (project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_research_project_gates_project
  ON core.research_project_gates (project_id, gate_order);

COMMENT ON TABLE core.research_projects IS
  '연구과제 SoT. MBO 평가용 mbo_projects와 독립.';
COMMENT ON TABLE core.research_project_gates IS
  '연구과제 단계 게이트(1~n차). 이전 게이트 승인 후에만 다음 차수 승인 가능(도메인 규칙).';

ALTER TABLE core.research_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.research_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.research_project_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.research_project_gates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS research_projects_member_all ON core.research_projects;
CREATE POLICY research_projects_member_all ON core.research_projects
  FOR ALL TO authenticated
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

DROP POLICY IF EXISTS research_project_members_member_all ON core.research_project_members;
CREATE POLICY research_project_members_member_all ON core.research_project_members
  FOR ALL TO authenticated
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

DROP POLICY IF EXISTS research_project_deliverables_member_all ON core.research_project_deliverables;
CREATE POLICY research_project_deliverables_member_all ON core.research_project_deliverables
  FOR ALL TO authenticated
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

DROP POLICY IF EXISTS research_project_gates_member_all ON core.research_project_gates;
CREATE POLICY research_project_gates_member_all ON core.research_project_gates
  FOR ALL TO authenticated
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON core.research_projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.research_project_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.research_project_deliverables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.research_project_gates TO authenticated;

COMMIT;
