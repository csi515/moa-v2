-- Phase 1: Add personal/shared visibility and owner tracking to core.events

BEGIN;

ALTER TABLE core.events
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'core_events_visibility_check'
      AND conrelid = 'core.events'::regclass
  ) THEN
    ALTER TABLE core.events
      ADD CONSTRAINT core_events_visibility_check
      CHECK (visibility IN ('private', 'public'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_core_events_org_vis_owner
  ON core.events(organization_id, visibility, owner_user_id, start_date);

-- Drop existing overly-broad policies
DROP POLICY IF EXISTS core_events_select ON core.events;
DROP POLICY IF EXISTS core_events_insert ON core.events;
DROP POLICY IF EXISTS core_events_update ON core.events;
DROP POLICY IF EXISTS core_events_delete ON core.events;

-- SELECT: public org events OR own private events
CREATE POLICY core_events_select ON core.events
  FOR SELECT
  USING (
    core.is_org_member(organization_id)
    AND (visibility = 'public' OR owner_user_id = auth.uid())
  );

-- INSERT: org member creating for self (or legacy null owner)
CREATE POLICY core_events_insert ON core.events
  FOR INSERT
  WITH CHECK (
    core.is_org_member(organization_id)
    AND (owner_user_id IS NULL OR owner_user_id = auth.uid())
  );

-- UPDATE: private events -> owner only; public events -> owner or org admin
CREATE POLICY core_events_update ON core.events
  FOR UPDATE
  USING (
    core.is_org_member(organization_id)
    AND (
      (visibility = 'private' AND owner_user_id = auth.uid())
      OR (visibility = 'public' AND (owner_user_id = auth.uid() OR core.is_org_admin(organization_id)))
    )
  )
  WITH CHECK (
    core.is_org_member(organization_id)
    AND (
      (visibility = 'private' AND owner_user_id = auth.uid())
      OR (visibility = 'public' AND (owner_user_id = auth.uid() OR owner_user_id IS NULL OR core.is_org_admin(organization_id)))
    )
  );

-- DELETE: private events -> owner only; public events -> owner or org admin
CREATE POLICY core_events_delete ON core.events
  FOR DELETE
  USING (
    core.is_org_member(organization_id)
    AND (
      (visibility = 'private' AND owner_user_id = auth.uid())
      OR (visibility = 'public' AND (owner_user_id = auth.uid() OR core.is_org_admin(organization_id)))
    )
  );

COMMIT;
