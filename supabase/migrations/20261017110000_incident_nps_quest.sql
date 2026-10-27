-- ==============================================================================
-- Moa-v2 Capability Expansion: 3 New Domain Engines
-- 1) facility_incident_report (안전사고·기물파손 경위서 & 배상보험 청구 대장)
-- 2) nps_survey_collector (모바일 만족도·NPS 설문 조사 및 피드백 분석기)
-- 3) achievement_quest_badge (원생 성취 퀘스트 & 0원 W3C SVG 디지털 뱃지 수여 엔진)
-- ==============================================================================

-- 1. Facility Incident Reports & Timelines
CREATE TABLE IF NOT EXISTS core.facility_incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  incident_title text NOT NULL,
  incident_date timestamptz NOT NULL DEFAULT now(),
  incident_type text NOT NULL DEFAULT 'injury',
  severity text NOT NULL DEFAULT 'minor',
  location_in_facility text NOT NULL,
  involved_person_name text NOT NULL,
  involved_person_role text NOT NULL DEFAULT 'student',
  witness_name text,
  supervisor_name text,
  description text NOT NULL,
  injury_details text,
  emergency_action_taken text,
  guardian_notified_at timestamptz,
  hospital_transported boolean NOT NULL DEFAULT false,
  insurance_claimed boolean NOT NULL DEFAULT false,
  insurance_claim_number text,
  preventative_action text,
  status text NOT NULL DEFAULT 'open',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.facility_incident_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES core.facility_incident_reports(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  action_type text NOT NULL DEFAULT 'note',
  actor_name text NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. NPS Survey Campaigns & Responses
CREATE TABLE IF NOT EXISTS core.nps_survey_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_audience text NOT NULL DEFAULT 'all',
  description text,
  status text NOT NULL DEFAULT 'draft',
  started_at timestamptz,
  ended_at timestamptz,
  survey_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.nps_survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES core.nps_survey_campaigns(id) ON DELETE CASCADE,
  respondent_name text,
  respondent_phone text,
  is_anonymous boolean NOT NULL DEFAULT true,
  nps_score integer NOT NULL CHECK (nps_score >= 0 AND nps_score <= 10),
  sentiment_category text NOT NULL DEFAULT 'passive',
  instructor_rating integer CHECK (instructor_rating >= 1 AND instructor_rating <= 5),
  facility_rating integer CHECK (facility_rating >= 1 AND facility_rating <= 5),
  curriculum_rating integer CHECK (curriculum_rating >= 1 AND curriculum_rating <= 5),
  feedback_text text,
  action_status text NOT NULL DEFAULT 'unreviewed',
  action_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Achievement Quests & Member Progress
CREATE TABLE IF NOT EXISTS core.achievement_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'skill',
  target_count integer NOT NULL DEFAULT 1 CHECK (target_count > 0),
  unit text NOT NULL DEFAULT '회',
  badge_tier text NOT NULL DEFAULT 'bronze',
  badge_icon_name text NOT NULL DEFAULT 'star',
  reward_points integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.achievement_quest_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  quest_id uuid NOT NULL REFERENCES core.achievement_quests(id) ON DELETE CASCADE,
  member_name text NOT NULL,
  member_identifier text,
  current_progress integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  badge_issued boolean NOT NULL DEFAULT false,
  badge_issued_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================================================================
-- Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_facility_incident_reports_org ON core.facility_incident_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_facility_incident_timelines_incident ON core.facility_incident_timelines(incident_id);
CREATE INDEX IF NOT EXISTS idx_nps_survey_campaigns_org ON core.nps_survey_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_nps_survey_responses_campaign ON core.nps_survey_responses(campaign_id);
CREATE INDEX IF NOT EXISTS idx_achievement_quests_org ON core.achievement_quests(organization_id);
CREATE INDEX IF NOT EXISTS idx_achievement_quest_members_quest ON core.achievement_quest_members(quest_id);

-- ==============================================================================
-- RLS (Row Level Security)
-- ==============================================================================
ALTER TABLE core.facility_incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.facility_incident_timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.nps_survey_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.nps_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.achievement_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.achievement_quest_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_facility_incident_reports_all') THEN
    CREATE POLICY org_facility_incident_reports_all ON core.facility_incident_reports
      FOR ALL USING (core.is_org_member(organization_id)) WITH CHECK (core.is_org_member(organization_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_facility_incident_timelines_all') THEN
    CREATE POLICY org_facility_incident_timelines_all ON core.facility_incident_timelines
      FOR ALL USING (core.is_org_member(organization_id)) WITH CHECK (core.is_org_member(organization_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_nps_survey_campaigns_all') THEN
    CREATE POLICY org_nps_survey_campaigns_all ON core.nps_survey_campaigns
      FOR ALL USING (core.is_org_member(organization_id)) WITH CHECK (core.is_org_member(organization_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_nps_survey_responses_all') THEN
    CREATE POLICY org_nps_survey_responses_all ON core.nps_survey_responses
      FOR ALL USING (core.is_org_member(organization_id)) WITH CHECK (core.is_org_member(organization_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_achievement_quests_all') THEN
    CREATE POLICY org_achievement_quests_all ON core.achievement_quests
      FOR ALL USING (core.is_org_member(organization_id)) WITH CHECK (core.is_org_member(organization_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_achievement_quest_members_all') THEN
    CREATE POLICY org_achievement_quest_members_all ON core.achievement_quest_members
      FOR ALL USING (core.is_org_member(organization_id)) WITH CHECK (core.is_org_member(organization_id));
  END IF;
END $$;
