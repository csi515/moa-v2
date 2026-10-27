-- 20261016181000_trial_funnel_and_learning_journal.sql
-- 무료 체험 및 상담 리드 파이프라인 (trial_funnel) & 수업 일지/성장 포트폴리오 (learning_journal)

-- 1. 무료 체험 및 상담 리드 테이블
CREATE TABLE IF NOT EXISTS core.trial_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'other', -- 'instagram', 'naver', 'referral', 'walk_in', 'flyer', 'other'
  status TEXT NOT NULL DEFAULT 'new_inquiry', -- 'new_inquiry', 'consult_scheduled', 'trial_attended', 'converted', 'dropped'
  target_program TEXT,
  trial_date DATE,
  assigned_staff_id UUID,
  notes TEXT,
  drop_reason TEXT,
  converted_pass_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trial_leads_org_status
  ON core.trial_leads (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_trial_leads_trial_date
  ON core.trial_leads (organization_id, trial_date);

COMMENT ON TABLE core.trial_leads IS '무료 체험 및 신규 상담 리드 파이프라인 상태 관리 테이블';

-- 2. 수업 일지 및 성장 포트폴리오 피드 테이블
CREATE TABLE IF NOT EXISTS core.learning_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  author_staff_id UUID NOT NULL,
  lesson_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  practice_homework TEXT,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  parent_viewed_at TIMESTAMPTZ,
  parent_acknowledgement BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_journals_org_student
  ON core.learning_journals (organization_id, student_id, lesson_date DESC);

COMMENT ON TABLE core.learning_journals IS '원생 수업 일지, 성장 포트폴리오 및 학부모 안심 피드';

-- 3. 수업 일지 댓글 및 학부모 소통 테이블
CREATE TABLE IF NOT EXISTS core.learning_journal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES core.learning_journals(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_role TEXT NOT NULL, -- 'staff' | 'parent'
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_comments_journal
  ON core.learning_journal_comments (journal_id, created_at ASC);

COMMENT ON TABLE core.learning_journal_comments IS '수업 일지별 강사-학부모 실시간 양방향 코멘트';

-- RLS 활성화
ALTER TABLE core.trial_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.learning_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.learning_journal_comments ENABLE ROW LEVEL SECURITY;

-- 1. core.trial_leads RLS
DROP POLICY IF EXISTS trial_leads_select ON core.trial_leads;
CREATE POLICY trial_leads_select ON core.trial_leads
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM core.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS trial_leads_all ON core.trial_leads;
CREATE POLICY trial_leads_all ON core.trial_leads
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

-- 2. core.learning_journals RLS
DROP POLICY IF EXISTS learning_journals_select ON core.learning_journals;
CREATE POLICY learning_journals_select ON core.learning_journals
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM core.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS learning_journals_write ON core.learning_journals;
CREATE POLICY learning_journals_write ON core.learning_journals
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

-- 3. core.learning_journal_comments RLS
DROP POLICY IF EXISTS journal_comments_select ON core.learning_journal_comments;
CREATE POLICY journal_comments_select ON core.learning_journal_comments
  FOR SELECT TO authenticated
  USING (
    journal_id IN (
      SELECT id FROM core.learning_journals
      WHERE organization_id IN (
        SELECT organization_id FROM core.organization_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

DROP POLICY IF EXISTS journal_comments_insert ON core.learning_journal_comments;
CREATE POLICY journal_comments_insert ON core.learning_journal_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    journal_id IN (
      SELECT id FROM core.learning_journals
      WHERE organization_id IN (
        SELECT organization_id FROM core.organization_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON core.trial_leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.learning_journals TO authenticated;
GRANT SELECT, INSERT ON core.learning_journal_comments TO authenticated;
