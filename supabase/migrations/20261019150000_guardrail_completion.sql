-- moa-lint:strict
-- Guardrail completion. token_version, safe_transfer name check, and audit_logs already exist.

BEGIN;

CREATE TABLE IF NOT EXISTS core.booking_seat_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  remaining INTEGER NOT NULL DEFAULT 0 CHECK (remaining >= 0),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_seat_locks_active
  ON core.booking_seat_locks (organization_id, id)
  WHERE deleted_at IS NULL;

ALTER TABLE core.booking_seat_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booking_seat_locks_member ON core.booking_seat_locks;
CREATE POLICY booking_seat_locks_member ON core.booking_seat_locks
  FOR ALL TO authenticated
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

CREATE OR REPLACE FUNCTION core.lock_booking_seat(p_lock_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
DECLARE
  v_left INTEGER;
BEGIN
  SELECT remaining INTO v_left
  FROM core.booking_seat_locks
  WHERE id = p_lock_id AND deleted_at IS NULL
  FOR UPDATE;
  IF v_left IS NULL OR v_left < 1 THEN
    RAISE EXCEPTION 'overbooking blocked';
  END IF;
  UPDATE core.booking_seat_locks
  SET remaining = remaining - 1
  WHERE id = p_lock_id;
  RETURN v_left - 1;
END;
$$;

ALTER TABLE core.idempotency_keys
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '10 minutes');

ALTER TABLE core.customers
  ADD COLUMN IF NOT EXISTS merged_into_id UUID;

CREATE OR REPLACE FUNCTION core.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs are immutable';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON core.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON core.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION core.prevent_audit_log_mutation();

COMMIT;
