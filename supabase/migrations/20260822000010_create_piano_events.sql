-- Phase 7: Piano academy calendar events

CREATE TABLE piano.events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE,
  event_type        TEXT NOT NULL DEFAULT 'other',
  description       TEXT,
  color             TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_piano_events_org_date ON piano.events(organization_id, start_date);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON piano.events
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE piano.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY piano_events_select ON piano.events
  FOR SELECT USING (core.is_org_member(organization_id));
CREATE POLICY piano_events_insert ON piano.events
  FOR INSERT WITH CHECK (core.is_org_member(organization_id));
CREATE POLICY piano_events_update ON piano.events
  FOR UPDATE USING (core.is_org_member(organization_id));
CREATE POLICY piano_events_delete ON piano.events
  FOR DELETE USING (core.is_org_member(organization_id));
