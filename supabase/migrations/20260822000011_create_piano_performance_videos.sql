-- Phase 8: Student performance videos (YouTube links)

CREATE TABLE piano.performance_videos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  youtube_url       TEXT NOT NULL,
  recorded_date     DATE,
  event_type        TEXT NOT NULL DEFAULT 'other',
  song_title        TEXT,
  memo              TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_piano_performance_videos_org_customer
  ON piano.performance_videos(organization_id, customer_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON piano.performance_videos
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE piano.performance_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY piano_performance_videos_select ON piano.performance_videos
  FOR SELECT USING (core.is_org_member(organization_id));
CREATE POLICY piano_performance_videos_insert ON piano.performance_videos
  FOR INSERT WITH CHECK (core.is_org_member(organization_id));
CREATE POLICY piano_performance_videos_update ON piano.performance_videos
  FOR UPDATE USING (core.is_org_member(organization_id));
CREATE POLICY piano_performance_videos_delete ON piano.performance_videos
  FOR DELETE USING (core.is_org_member(organization_id));
