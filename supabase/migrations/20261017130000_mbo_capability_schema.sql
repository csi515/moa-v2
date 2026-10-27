-- ==============================================================================
-- Moa-v2 Capability Expansion: Management by Objectives (MBO) Domain Schema
-- 
-- 1) core.mbo_objectives: 회사·부서·개인 목표 계층 및 승인 상태 관리
-- 2) core.mbo_projects: 목표 실행 프로젝트 및 평가 기간 관리
-- 3) core.mbo_progress_logs: 일자별 성과·문제·대응 기록 및 증빙 첨부
-- 4) core.mbo_feedback_comments: 관리자 피드백, 코멘트 및 수정 요청
-- 5) core.mbo_evaluations: 최종 정량/정성 평가 (진행률과 점수 분리, 비공개 권한 격리)
-- ==============================================================================

-- 1. Objectives Hierarchy (Company -> Department -> Individual -> Project)
CREATE TABLE IF NOT EXISTS core.mbo_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES core.mbo_objectives(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'individual' CHECK (level IN ('company', 'department', 'individual', 'project')),
  department_name text,
  owner_id uuid,
  owner_name text NOT NULL,
  title text NOT NULL,
  description text,
  success_criteria text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'in_progress', 'completed', 'canceled')),
  start_date date NOT NULL,
  target_date date NOT NULL,
  weight integer NOT NULL DEFAULT 100 CHECK (weight >= 0 AND weight <= 100),
  progress_rate integer NOT NULL DEFAULT 0 CHECK (progress_rate >= 0 AND progress_rate <= 100),
  rejection_reason text,
  approved_by uuid,
  approved_at timestamptz,
  revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Projects (Action Plans linked to an Objective)
CREATE TABLE IF NOT EXISTS core.mbo_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  objective_id uuid NOT NULL REFERENCES core.mbo_objectives(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  owner_id uuid,
  owner_name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'in_progress', 'completed', 'canceled')),
  start_date date NOT NULL,
  target_date date NOT NULL,
  evaluation_period text NOT NULL DEFAULT '2026-Q1',
  progress_rate integer NOT NULL DEFAULT 0 CHECK (progress_rate >= 0 AND progress_rate <= 100),
  rejection_reason text,
  approved_by uuid,
  approved_at timestamptz,
  revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Progress Logs (Daily / Periodic Activity Updates)
CREATE TABLE IF NOT EXISTS core.mbo_progress_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES core.mbo_projects(id) ON DELETE CASCADE,
  author_id uuid,
  author_name text NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  progress_rate integer NOT NULL CHECK (progress_rate >= 0 AND progress_rate <= 100),
  achievements text NOT NULL,
  issues_and_actions text,
  next_steps text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Feedback Comments (Manager/Peer Guidance & Review)
CREATE TABLE IF NOT EXISTS core.mbo_feedback_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES core.mbo_projects(id) ON DELETE CASCADE,
  progress_log_id uuid REFERENCES core.mbo_progress_logs(id) ON DELETE CASCADE,
  author_id uuid,
  author_name text NOT NULL,
  author_role text NOT NULL DEFAULT 'manager',
  feedback_type text NOT NULL DEFAULT 'comment' CHECK (feedback_type IN ('comment', 'revision_request', 'praise')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Evaluations (Final Score, Grade, Qualitative Feedback with Confidentiality Isolation)
CREATE TABLE IF NOT EXISTS core.mbo_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES core.mbo_projects(id) ON DELETE CASCADE,
  target_user_id uuid,
  evaluator_id uuid,
  evaluator_name text NOT NULL,
  evaluation_type text NOT NULL DEFAULT 'manager' CHECK (evaluation_type IN ('self', 'peer', 'manager', 'final')),
  score numeric(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  grade text NOT NULL CHECK (grade IN ('S', 'A', 'B', 'C', 'D')),
  qualitative_feedback text NOT NULL,
  is_confidential boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================================================================
-- Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_mbo_objectives_org ON core.mbo_objectives(organization_id);
CREATE INDEX IF NOT EXISTS idx_mbo_objectives_parent ON core.mbo_objectives(parent_id);
CREATE INDEX IF NOT EXISTS idx_mbo_objectives_owner ON core.mbo_objectives(owner_id);
CREATE INDEX IF NOT EXISTS idx_mbo_objectives_status ON core.mbo_objectives(status);

CREATE INDEX IF NOT EXISTS idx_mbo_projects_org ON core.mbo_projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_mbo_projects_objective ON core.mbo_projects(objective_id);
CREATE INDEX IF NOT EXISTS idx_mbo_projects_owner ON core.mbo_projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_mbo_projects_status ON core.mbo_projects(status);

CREATE INDEX IF NOT EXISTS idx_mbo_progress_logs_org ON core.mbo_progress_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_mbo_progress_logs_project ON core.mbo_progress_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_mbo_progress_logs_date ON core.mbo_progress_logs(log_date);

CREATE INDEX IF NOT EXISTS idx_mbo_feedback_comments_org ON core.mbo_feedback_comments(organization_id);
CREATE INDEX IF NOT EXISTS idx_mbo_feedback_comments_project ON core.mbo_feedback_comments(project_id);

CREATE INDEX IF NOT EXISTS idx_mbo_evaluations_org ON core.mbo_evaluations(organization_id);
CREATE INDEX IF NOT EXISTS idx_mbo_evaluations_project ON core.mbo_evaluations(project_id);
CREATE INDEX IF NOT EXISTS idx_mbo_evaluations_target ON core.mbo_evaluations(target_user_id);

-- ==============================================================================
-- RLS (Row Level Security)
-- ==============================================================================
ALTER TABLE core.mbo_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.mbo_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.mbo_progress_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.mbo_feedback_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.mbo_evaluations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- 1. mbo_objectives: 테넌트 소속 인원 허용
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_mbo_objectives_all') THEN
    CREATE POLICY org_mbo_objectives_all ON core.mbo_objectives
      FOR ALL USING (core.is_org_member(organization_id)) WITH CHECK (core.is_org_member(organization_id));
  END IF;

  -- 2. mbo_projects: 테넌트 소속 인원 허용
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_mbo_projects_all') THEN
    CREATE POLICY org_mbo_projects_all ON core.mbo_projects
      FOR ALL USING (core.is_org_member(organization_id)) WITH CHECK (core.is_org_member(organization_id));
  END IF;

  -- 3. mbo_progress_logs: 테넌트 소속 인원 허용
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_mbo_progress_logs_all') THEN
    CREATE POLICY org_mbo_progress_logs_all ON core.mbo_progress_logs
      FOR ALL USING (core.is_org_member(organization_id)) WITH CHECK (core.is_org_member(organization_id));
  END IF;

  -- 4. mbo_feedback_comments: 테넌트 소속 인원 허용
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_mbo_feedback_comments_all') THEN
    CREATE POLICY org_mbo_feedback_comments_all ON core.mbo_feedback_comments
      FOR ALL USING (core.is_org_member(organization_id)) WITH CHECK (core.is_org_member(organization_id));
  END IF;

  -- 5. mbo_evaluations: 비공개 평가 권한 엄격 격리
  -- 비공개가 아니거나, 피평가자 본인이거나, 평가자 본인이거나, 관리자/오너인 경우만 조회/수정 허용
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_mbo_evaluations_select') THEN
    CREATE POLICY org_mbo_evaluations_select ON core.mbo_evaluations
      FOR SELECT USING (
        core.is_org_member(organization_id) AND (
          is_confidential = false OR
          target_user_id = auth.uid() OR
          evaluator_id = auth.uid() OR
          core.is_org_owner_or_admin(organization_id)
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_mbo_evaluations_write') THEN
    CREATE POLICY org_mbo_evaluations_write ON core.mbo_evaluations
      FOR INSERT WITH CHECK (
        core.is_org_member(organization_id) AND (
          evaluator_id = auth.uid() OR
          core.is_org_owner_or_admin(organization_id)
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_mbo_evaluations_modify') THEN
    CREATE POLICY org_mbo_evaluations_modify ON core.mbo_evaluations
      FOR UPDATE USING (
        core.is_org_member(organization_id) AND (
          evaluator_id = auth.uid() OR
          core.is_org_owner_or_admin(organization_id)
        )
      ) WITH CHECK (
        core.is_org_member(organization_id) AND (
          evaluator_id = auth.uid() OR
          core.is_org_owner_or_admin(organization_id)
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_mbo_evaluations_delete') THEN
    CREATE POLICY org_mbo_evaluations_delete ON core.mbo_evaluations
      FOR DELETE USING (
        core.is_org_member(organization_id) AND (
          evaluator_id = auth.uid() OR
          core.is_org_owner_or_admin(organization_id)
        )
      );
  END IF;
END $$;
