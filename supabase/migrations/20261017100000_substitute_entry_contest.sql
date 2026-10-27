-- 20261017100000_substitute_entry_contest.sql
-- 3대 확장 Capability: substitute_dispatch, entry_pass_ticket, event_contest_hub

-- ============================================================================
-- 1. substitute_dispatch (강사·직원 대진/대강 요청 & 원클릭 승인 마켓)
-- ============================================================================
CREATE TABLE IF NOT EXISTS core.substitute_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  requester_staff_id UUID NOT NULL,
  requester_name TEXT NOT NULL,
  class_name TEXT NOT NULL, -- 예: "초등 바이엘B반", "화목 저녁 필라테스"
  target_date DATE NOT NULL,
  start_time TEXT NOT NULL,  -- 예: "16:00"
  end_time TEXT NOT NULL,    -- 예: "16:50"
  reason TEXT NOT NULL DEFAULT 'personal', -- 'illness', 'family_event', 'personal', 'vacation'
  reason_detail TEXT,
  pay_rate_type TEXT NOT NULL DEFAULT 'hourly', -- 'hourly', 'fixed_per_class'
  offered_fee NUMERIC NOT NULL DEFAULT 30000,
  assigned_staff_id UUID,
  assigned_name TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'applied', 'approved', 'rejected', 'completed', 'canceled'
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.substitute_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES core.substitute_requests(id) ON DELETE CASCADE,
  candidate_staff_id UUID NOT NULL,
  candidate_name TEXT NOT NULL,
  bid_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'selected', 'rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_requests_org_date
  ON core.substitute_requests (organization_id, target_date, status);

CREATE INDEX IF NOT EXISTS idx_sub_bids_request
  ON core.substitute_bids (request_id, status);

-- ============================================================================
-- 2. entry_pass_ticket (모바일 일일 입장권 & 0원 W3C SVG QR 티켓 검표기)
-- ============================================================================
CREATE TABLE IF NOT EXISTS core.entry_pass_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL UNIQUE, -- 예: "TICK-20261017-001"
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  ticket_type TEXT NOT NULL DEFAULT 'standard', -- 'adult', 'child', 'allday', 'two_hours', 'standard'
  valid_date DATE NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'issued', -- 'issued', 'checked_in', 'checked_out', 'expired', 'canceled'
  security_hash TEXT NOT NULL,
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.entry_pass_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES core.entry_pass_tickets(id) ON DELETE SET NULL,
  ticket_number TEXT NOT NULL,
  scanner_staff_id UUID,
  scan_action TEXT NOT NULL DEFAULT 'check_in', -- 'check_in', 'check_out', 'verify'
  scan_result TEXT NOT NULL, -- 'valid', 'already_used', 'expired', 'invalid'
  scan_message TEXT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entry_tickets_org_date
  ON core.entry_pass_tickets (organization_id, valid_date, status);

CREATE INDEX IF NOT EXISTS idx_entry_scans_ticket
  ON core.entry_pass_scans (organization_id, ticket_number, scanned_at DESC);

-- ============================================================================
-- 3. event_contest_hub (원내 발표회·대회 참가 접수 및 큐시트/심사 엔진)
-- ============================================================================
CREATE TABLE IF NOT EXISTS core.event_contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- 예: "제15회 모아 피아노 정기 정기 연주회 & 콩쿠르"
  event_category TEXT NOT NULL DEFAULT 'concert', -- 'concert', 'contest', 'exhibition', 'tournament'
  event_date DATE NOT NULL,
  venue_name TEXT NOT NULL, -- 예: "본원 그랜드 콘서트홀"
  entry_fee NUMERIC NOT NULL DEFAULT 0,
  registration_deadline DATE NOT NULL,
  rubric_criteria JSONB NOT NULL DEFAULT '[]', -- [{ id, name, maxScore }]
  status TEXT NOT NULL DEFAULT 'open', -- 'draft', 'open', 'in_progress', 'completed', 'archived'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.event_contest_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  contest_id UUID NOT NULL REFERENCES core.event_contests(id) ON DELETE CASCADE,
  participant_id UUID,
  participant_name TEXT NOT NULL,
  performance_piece TEXT NOT NULL, -- 예: "쇼팽 왈츠 Op.64 No.2"
  entry_order INT NOT NULL DEFAULT 1, -- 등번호 및 큐시트 순서
  score_details JSONB NOT NULL DEFAULT '{}',
  final_score NUMERIC NOT NULL DEFAULT 0,
  award_title TEXT, -- 예: "대상 (Grand Prize)", "금상", "특별상"
  certificate_issued BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'registered', -- 'registered', 'confirmed', 'performed', 'absent'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_contests_org_date
  ON core.event_contests (organization_id, event_date DESC);

CREATE INDEX IF NOT EXISTS idx_contest_entries_order
  ON core.event_contest_entries (contest_id, entry_order ASC);

-- ============================================================================
-- Row Level Security (RLS) & Policies
-- ============================================================================
ALTER TABLE core.substitute_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.substitute_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.entry_pass_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.entry_pass_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.event_contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.event_contest_entries ENABLE ROW LEVEL SECURITY;

-- 1. substitute_requests
DROP POLICY IF EXISTS substitute_requests_org_access ON core.substitute_requests;
CREATE POLICY substitute_requests_org_access ON core.substitute_requests
  FOR ALL
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

-- 2. substitute_bids
DROP POLICY IF EXISTS substitute_bids_org_access ON core.substitute_bids;
CREATE POLICY substitute_bids_org_access ON core.substitute_bids
  FOR ALL
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

-- 3. entry_pass_tickets
DROP POLICY IF EXISTS entry_pass_tickets_org_access ON core.entry_pass_tickets;
CREATE POLICY entry_pass_tickets_org_access ON core.entry_pass_tickets
  FOR ALL
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

-- 4. entry_pass_scans
DROP POLICY IF EXISTS entry_pass_scans_org_access ON core.entry_pass_scans;
CREATE POLICY entry_pass_scans_org_access ON core.entry_pass_scans
  FOR ALL
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

-- 5. event_contests
DROP POLICY IF EXISTS event_contests_org_access ON core.event_contests;
CREATE POLICY event_contests_org_access ON core.event_contests
  FOR ALL
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

-- 6. event_contest_entries
DROP POLICY IF EXISTS event_contest_entries_org_access ON core.event_contest_entries;
CREATE POLICY event_contest_entries_org_access ON core.event_contest_entries
  FOR ALL
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));
