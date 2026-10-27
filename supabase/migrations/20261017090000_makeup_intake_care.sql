-- 20261017090000_makeup_intake_care.sql
-- 3대 확장 Capability: makeup_lesson_pass, intake_assessment, daily_care_report

-- ============================================================================
-- 1. makeup_lesson_pass (결석 보강 티켓 & 보강 슬롯 매칭 엔진)
-- ============================================================================
CREATE TABLE IF NOT EXISTS core.makeup_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  origin_reason TEXT NOT NULL DEFAULT 'absence', -- 'absence', 'advance_request', 'instructor_cancel'
  origin_date DATE NOT NULL,
  expires_at DATE NOT NULL, -- 발급일 + 기본 30일
  status TEXT NOT NULL DEFAULT 'available', -- 'available', 'reserved', 'used', 'expired', 'canceled'
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.makeup_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  instructor_id UUID,
  instructor_name TEXT NOT NULL,
  room_name TEXT NOT NULL,
  slot_date DATE NOT NULL,
  start_time TEXT NOT NULL, -- 예: "15:00"
  end_time TEXT NOT NULL,   -- 예: "15:50"
  capacity INT NOT NULL DEFAULT 1,
  reserved_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'full', 'closed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.makeup_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  token_id UUID NOT NULL REFERENCES core.makeup_tokens(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES core.makeup_slots(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved', -- 'reserved', 'attended', 'absent', 'canceled'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_makeup_tokens_org_student
  ON core.makeup_tokens (organization_id, student_id, status);

CREATE INDEX IF NOT EXISTS idx_makeup_slots_org_date
  ON core.makeup_slots (organization_id, slot_date, status);

CREATE INDEX IF NOT EXISTS idx_makeup_reservations_slot
  ON core.makeup_reservations (organization_id, slot_id);

-- ============================================================================
-- 2. intake_assessment (사전 문진표 & 첫 방문 고객 맞춤 진단서)
-- ============================================================================
CREATE TABLE IF NOT EXISTS core.intake_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- "신규 회원 맞춤 체형 및 운동 목적 설문"
  industry_target TEXT NOT NULL DEFAULT 'general', -- 'fitness', 'pilates', 'beauty', 'counseling', 'pet', 'general'
  question_sections JSONB NOT NULL DEFAULT '[]', -- [{ id, title, questions: [...] }]
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.intake_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES core.intake_templates(id) ON DELETE CASCADE,
  customer_id UUID,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  answers JSONB NOT NULL DEFAULT '{}',
  risk_flags JSONB NOT NULL DEFAULT '[]', -- ['herniated_disc', 'metal_allergy', 'pregnancy']
  has_critical_condition BOOLEAN NOT NULL DEFAULT false,
  summary_notes TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_templates_org
  ON core.intake_templates (organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_intake_submissions_org_customer
  ON core.intake_submissions (organization_id, customer_name, has_critical_condition);

-- ============================================================================
-- 3. daily_care_report (돌봄/활동 일일 알림장 & 타임라인 피드)
-- ============================================================================
CREATE TABLE IF NOT EXISTS core.daily_care_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL,
  subject_name TEXT NOT NULL,
  subject_type TEXT NOT NULL DEFAULT 'student', -- 'student', 'pet', 'child'
  log_date DATE NOT NULL,
  meal_status TEXT NOT NULL DEFAULT 'all', -- 'all', 'half', 'little', 'none'
  potty_status TEXT NOT NULL DEFAULT 'normal', -- 'normal', 'soft', 'constipation', 'none'
  nap_minutes INT NOT NULL DEFAULT 0,
  medication_given BOOLEAN NOT NULL DEFAULT false,
  condition_rating INT NOT NULL DEFAULT 5, -- 1..5
  summary_comment TEXT NOT NULL DEFAULT '',
  dispatch_status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'dispatched'
  dispatched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.care_timeline_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  care_log_id UUID NOT NULL REFERENCES core.daily_care_logs(id) ON DELETE CASCADE,
  entry_time TEXT NOT NULL, -- "11:30"
  category TEXT NOT NULL, -- 'meal', 'potty', 'activity', 'nap', 'medication', 'safety'
  note TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_care_logs_org_date
  ON core.daily_care_logs (organization_id, log_date DESC);

CREATE INDEX IF NOT EXISTS idx_care_timeline_log
  ON core.care_timeline_entries (care_log_id, entry_time);

-- ============================================================================
-- Row Level Security (RLS) & Policies
-- ============================================================================
ALTER TABLE core.makeup_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.makeup_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.makeup_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.intake_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.intake_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.daily_care_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.care_timeline_entries ENABLE ROW LEVEL SECURITY;

-- 1. makeup_tokens
DROP POLICY IF EXISTS makeup_tokens_org_access ON core.makeup_tokens;
CREATE POLICY makeup_tokens_org_access ON core.makeup_tokens
  FOR ALL
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

-- 2. makeup_slots
DROP POLICY IF EXISTS makeup_slots_org_access ON core.makeup_slots;
CREATE POLICY makeup_slots_org_access ON core.makeup_slots
  FOR ALL
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

-- 3. makeup_reservations
DROP POLICY IF EXISTS makeup_reservations_org_access ON core.makeup_reservations;
CREATE POLICY makeup_reservations_org_access ON core.makeup_reservations
  FOR ALL
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

-- 4. intake_templates
DROP POLICY IF EXISTS intake_templates_org_access ON core.intake_templates;
CREATE POLICY intake_templates_org_access ON core.intake_templates
  FOR ALL
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

-- 5. intake_submissions
DROP POLICY IF EXISTS intake_submissions_org_access ON core.intake_submissions;
CREATE POLICY intake_submissions_org_access ON core.intake_submissions
  FOR ALL
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

-- 6. daily_care_logs
DROP POLICY IF EXISTS daily_care_logs_org_access ON core.daily_care_logs;
CREATE POLICY daily_care_logs_org_access ON core.daily_care_logs
  FOR ALL
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

-- 7. care_timeline_entries
DROP POLICY IF EXISTS care_timeline_entries_org_access ON core.care_timeline_entries;
CREATE POLICY care_timeline_entries_org_access ON core.care_timeline_entries
  FOR ALL
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));
