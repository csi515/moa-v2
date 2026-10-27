-- Move piano.events to core.events to support cross-industry usage

BEGIN;

ALTER TABLE piano.events SET SCHEMA core;

-- The indexes and policies move with the table, but their names might imply piano
-- We can optionally rename them for clarity
ALTER INDEX core.idx_piano_events_org_date RENAME TO idx_core_events_org_date;

ALTER POLICY piano_events_select ON core.events RENAME TO core_events_select;
ALTER POLICY piano_events_insert ON core.events RENAME TO core_events_insert;
ALTER POLICY piano_events_update ON core.events RENAME TO core_events_update;
ALTER POLICY piano_events_delete ON core.events RENAME TO core_events_delete;

COMMIT;
