-- Transactional Outbox. 업무 TX와 외부 side effect를 분리한다.
-- 기존 confirm_reservation 의미(용량·반환값)를 유지하고 event만 함께 적재한다.

BEGIN;

CREATE TABLE core.outbox_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  location_id     UUID REFERENCES core.locations(id) ON DELETE SET NULL,
  aggregate_type  TEXT NOT NULL,
  aggregate_id    TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  dedupe_key      TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  status          TEXT NOT NULL DEFAULT 'pending',
  attempts        INT NOT NULL DEFAULT 0,
  available_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at    TIMESTAMPTZ,
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT outbox_events_aggregate_check
    CHECK (length(btrim(aggregate_type)) > 0 AND length(btrim(aggregate_id)) > 0),
  CONSTRAINT outbox_events_dedupe_check CHECK (length(btrim(dedupe_key)) > 0),
  CONSTRAINT uq_outbox_events_org_dedupe UNIQUE (organization_id, dedupe_key),
  CONSTRAINT outbox_events_attempts_check CHECK (attempts >= 0),
  CONSTRAINT outbox_events_status_check
    CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
  CONSTRAINT outbox_events_type_check CHECK (
    event_type IN (
      'reservation.confirmed',
      'reservation.requested',
      'booking.completed',
      'payment.completed',
      'refund.completed',
      'pass.purchased',
      'staff.assigned',
      'waitlist.notified'
    )
  )
);

COMMENT ON TABLE core.outbox_events IS
  '업무 TX에서 적재하는 외부 side effect 대기열. push/SMS/CRM은 worker가 처리한다.';
COMMENT ON COLUMN core.outbox_events.dedupe_key IS
  '비즈니스 이벤트 identity. organization_id 와 함께 UNIQUE. id 는 row identity.';
COMMENT ON COLUMN core.outbox_events.id IS
  'outbox row identity. 비즈니스 중복 방지에는 dedupe_key 를 쓴다.';

CREATE INDEX idx_outbox_events_claim
  ON core.outbox_events (organization_id, status, available_at);
CREATE INDEX idx_outbox_events_aggregate
  ON core.outbox_events (organization_id, aggregate_type, aggregate_id);

ALTER TABLE core.outbox_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY outbox_events_staff_select ON core.outbox_events
  FOR SELECT TO authenticated
  USING (core.is_org_staff_actor(organization_id));

GRANT SELECT ON core.outbox_events TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON core.outbox_events FROM authenticated, anon;

CREATE OR REPLACE FUNCTION core.outbox_dedupe_key(
  p_event_type TEXT,
  p_aggregate_type TEXT,
  p_aggregate_id TEXT
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT btrim(p_event_type) || E'\x1f' || btrim(p_aggregate_type) || E'\x1f' || btrim(p_aggregate_id);
$$;

-- worker만 상태를 바꾼다. 일반 authenticated 세션은 SELECT만 가능하다.
CREATE OR REPLACE FUNCTION core.require_outbox_worker()
RETURNS VOID
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF COALESCE(auth.role(), auth.jwt() ->> 'role', '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION core.enqueue_outbox_event(
  p_organization_id UUID,
  p_aggregate_type TEXT,
  p_aggregate_id TEXT,
  p_event_type TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_location_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = core, public
AS $$
DECLARE
  v_id UUID;
  v_location UUID;
  v_payload JSONB;
  v_dedupe TEXT;
BEGIN
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;

  v_location := NULL;
  IF p_location_id IS NOT NULL THEN
    v_location := core.assert_location_in_organization(p_organization_id, p_location_id, false);
  END IF;

  v_dedupe := core.outbox_dedupe_key(p_event_type, p_aggregate_type, p_aggregate_id);

  v_payload := COALESCE(p_payload, '{}'::jsonb) || jsonb_build_object(
    'organizationId', p_organization_id,
    'locationId', v_location,
    'aggregateType', btrim(p_aggregate_type),
    'aggregateId', btrim(p_aggregate_id),
    'eventType', p_event_type
  );

  INSERT INTO core.outbox_events (
    organization_id, location_id, aggregate_type, aggregate_id, event_type, dedupe_key, payload
  ) VALUES (
    p_organization_id, v_location, btrim(p_aggregate_type), btrim(p_aggregate_id),
    p_event_type, v_dedupe, v_payload
  )
  ON CONFLICT ON CONSTRAINT uq_outbox_events_org_dedupe DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT e.id INTO v_id
    FROM core.outbox_events e
    WHERE e.organization_id = p_organization_id
      AND e.dedupe_key = v_dedupe;
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION core.claim_outbox_events(
  p_organization_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS SETOF core.outbox_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  PERFORM core.require_outbox_worker();

  RETURN QUERY
  UPDATE core.outbox_events e
  SET status = 'processing',
      attempts = e.attempts + 1,
      available_at = now() + interval '5 minutes'
  FROM (
    SELECT id
    FROM core.outbox_events
    WHERE organization_id = p_organization_id
      AND available_at <= now()
      AND (
        status IN ('pending', 'failed')
        OR status = 'processing'
      )
      AND attempts < 8
    ORDER BY available_at
    LIMIT GREATEST(COALESCE(p_limit, 10), 1)
    FOR UPDATE SKIP LOCKED
  ) picked
  WHERE e.id = picked.id
  RETURNING e.*;
END;
$$;

CREATE OR REPLACE FUNCTION core.complete_outbox_event(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM core.outbox_events WHERE id = p_event_id) THEN
    RAISE EXCEPTION 'Outbox event not found';
  END IF;
  PERFORM core.require_outbox_worker();
  UPDATE core.outbox_events
  SET status = 'processed',
      processed_at = now(),
      last_error = NULL
  WHERE id = p_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION core.fail_outbox_event(
  p_event_id UUID,
  p_last_error TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_row core.outbox_events%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM core.outbox_events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Outbox event not found';
  END IF;
  PERFORM core.require_outbox_worker();
  IF v_row.attempts >= 8 THEN
    UPDATE core.outbox_events
    SET status = 'failed',
        last_error = NULLIF(btrim(COALESCE(p_last_error, '')), '')
    WHERE id = p_event_id;
  ELSE
    UPDATE core.outbox_events
    SET status = 'pending',
        last_error = NULLIF(btrim(COALESCE(p_last_error, '')), ''),
        available_at = now() + (LEAST(2 ^ LEAST(v_row.attempts, 6), 60) || ' minutes')::interval
    WHERE id = p_event_id;
  END IF;
END;
$$;

-- 파일럿: 예약 확정 시 outbox만 추가. 반환값·용량 규칙은 기존과 동일.
CREATE OR REPLACE FUNCTION core.confirm_reservation(
  p_reservation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_reservation RECORD;
  v_schedule RECORD;
  v_confirmed_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_reservation
  FROM core.reservations
  WHERE id = p_reservation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  IF NOT core.is_org_owner_or_admin(v_reservation.organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF v_reservation.status != 'requested' THEN
    RAISE EXCEPTION 'Reservation is not in requested status';
  END IF;

  SELECT s.max_capacity
  INTO v_schedule
  FROM core.schedules s
  WHERE s.id = v_reservation.schedule_id
  FOR UPDATE OF s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule not found';
  END IF;

  v_confirmed_count := core.count_schedule_holding(v_reservation.schedule_id, false);
  PERFORM core.assert_not_overbooked(v_schedule.max_capacity, v_confirmed_count);

  UPDATE core.reservations
  SET status = 'confirmed',
      confirmed_by = auth.uid(),
      confirmed_at = now(),
      updated_at = now()
  WHERE id = p_reservation_id;

  PERFORM core.enqueue_outbox_event(
    v_reservation.organization_id,
    'reservation',
    p_reservation_id::text,
    'reservation.confirmed',
    jsonb_build_object(
      'reservationId', p_reservation_id,
      'scheduleId', v_reservation.schedule_id
    ),
    NULL
  );

  RETURN true;
END;
$$;

COMMENT ON FUNCTION core.enqueue_outbox_event(UUID, TEXT, TEXT, TEXT, JSONB, UUID) IS
  '업무 DEFINER RPC 같은 TX에서만 호출. 같은 (org, dedupe_key) 는 한 행만 만든다.';
COMMENT ON FUNCTION core.claim_outbox_events(UUID, INT) IS
  'service_role worker 전용 claim. FOR UPDATE SKIP LOCKED. 비즈니스 중복은 dedupe_key UNIQUE 가 막는다.';
COMMENT ON FUNCTION core.confirm_reservation(UUID) IS
  '예약 확정. 용량 가드는 기존과 동일. 성공 시 reservation.confirmed outbox를 같은 TX에 적재.';

REVOKE ALL ON FUNCTION core.outbox_dedupe_key(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.outbox_dedupe_key(TEXT, TEXT, TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION core.require_outbox_worker() FROM PUBLIC;
REVOKE ALL ON FUNCTION core.require_outbox_worker() FROM anon, authenticated;
REVOKE ALL ON FUNCTION core.enqueue_outbox_event(UUID, TEXT, TEXT, TEXT, JSONB, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.enqueue_outbox_event(UUID, TEXT, TEXT, TEXT, JSONB, UUID) FROM anon, authenticated;
REVOKE ALL ON FUNCTION core.claim_outbox_events(UUID, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.claim_outbox_events(UUID, INT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION core.complete_outbox_event(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.complete_outbox_event(UUID) FROM anon, authenticated;
REVOKE ALL ON FUNCTION core.fail_outbox_event(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.fail_outbox_event(UUID, TEXT) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION core.claim_outbox_events(UUID, INT) TO service_role;
GRANT EXECUTE ON FUNCTION core.complete_outbox_event(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION core.fail_outbox_event(UUID, TEXT) TO service_role;

COMMIT;
