-- 공통 고객 이용 세션. 결제/예약에 종속하지 않는다.
-- 업종 전용 테이블을 만들지 않는다.

CREATE TYPE core.customer_session_status AS ENUM ('active', 'completed', 'cancelled');

CREATE TABLE core.customer_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES core.customers(id) ON DELETE RESTRICT,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at          TIMESTAMPTZ,
  status            core.customer_session_status NOT NULL DEFAULT 'active',
  source            TEXT NOT NULL DEFAULT 'walk_in',
  context           TEXT,
  staff_id          UUID REFERENCES core.staff(id) ON DELETE SET NULL,
  booking_id        UUID,
  reservation_id    UUID REFERENCES core.room_reservations(id) ON DELETE SET NULL,
  pass_id           UUID REFERENCES core.session_passes(id) ON DELETE SET NULL,
  payment_id        UUID REFERENCES core.payments(id) ON DELETE SET NULL,
  resource_id       UUID REFERENCES core.bookable_resources(id) ON DELETE SET NULL,
  memo              TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customer_sessions_time_check CHECK (
    ended_at IS NULL OR ended_at >= started_at
  ),
  CONSTRAINT customer_sessions_status_check CHECK (
    (status = 'active' AND ended_at IS NULL)
    OR (status IN ('completed', 'cancelled') AND ended_at IS NOT NULL)
  )
);

COMMENT ON TABLE core.customer_sessions IS
  '현장 이용 세션. 예약 없이 입장 가능. 결제/이용권 차감 없음.';
COMMENT ON COLUMN core.customer_sessions.booking_id IS '선택 연결. 업종 예약 원장이 다를 수 있어 FK 없음.';
COMMENT ON COLUMN core.customer_sessions.source IS 'walk_in/booking/kiosk/other. Core는 업종 분기하지 않는다.';

CREATE INDEX idx_customer_sessions_org_started
  ON core.customer_sessions (organization_id, started_at DESC);
CREATE INDEX idx_customer_sessions_org_customer
  ON core.customer_sessions (organization_id, customer_id, started_at DESC);
CREATE INDEX idx_customer_sessions_org_status
  ON core.customer_sessions (organization_id, status);

CREATE UNIQUE INDEX uq_customer_sessions_active_customer
  ON core.customer_sessions (organization_id, customer_id)
  WHERE status = 'active';

CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.customer_sessions
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE core.customer_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY customer_sessions_select ON core.customer_sessions
  FOR SELECT TO authenticated
  USING (
    core.is_org_staff_actor(organization_id)
    OR core.is_my_customer(organization_id, customer_id)
    OR core.parent_owns_customer(organization_id, customer_id)
  );

CREATE POLICY customer_sessions_staff_write ON core.customer_sessions
  FOR ALL TO authenticated
  USING (core.is_org_staff_actor(organization_id))
  WITH CHECK (core.is_org_staff_actor(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON core.customer_sessions TO authenticated;

CREATE OR REPLACE FUNCTION core.customer_session_payload(
  p_row core.customer_sessions,
  p_action TEXT
)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT to_jsonb(p_row) || jsonb_build_object('action', p_action);
$$;

CREATE OR REPLACE FUNCTION core.start_customer_session(
  p_organization_id UUID,
  p_customer_id UUID,
  p_staff_id UUID DEFAULT NULL,
  p_source TEXT DEFAULT 'walk_in',
  p_context TEXT DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL,
  p_reservation_id UUID DEFAULT NULL,
  p_pass_id UUID DEFAULT NULL,
  p_payment_id UUID DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_memo TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_existing core.customer_sessions%ROWTYPE;
  v_created core.customer_sessions%ROWTYPE;
  v_source TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_organization_id IS NULL OR p_customer_id IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_source := lower(btrim(COALESCE(p_source, 'walk_in')));
  IF v_source = '' THEN
    v_source := 'walk_in';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('customer_sessions'),
    hashtext(p_organization_id::text || ':' || p_customer_id::text)
  );

  IF NOT EXISTS (
    SELECT 1 FROM core.customers c
    WHERE c.id = p_customer_id AND c.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Customer not found in organization';
  END IF;

  IF p_staff_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM core.staff s
    WHERE s.id = p_staff_id AND s.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Staff not found in organization';
  END IF;

  IF p_pass_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM core.session_passes sp
    WHERE sp.id = p_pass_id
      AND sp.organization_id = p_organization_id
      AND sp.customer_id = p_customer_id
  ) THEN
    RAISE EXCEPTION 'Pass not found for customer';
  END IF;

  IF p_resource_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM core.bookable_resources r
    WHERE r.id = p_resource_id AND r.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Resource not found in organization';
  END IF;

  IF p_reservation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM core.room_reservations rr
    WHERE rr.id = p_reservation_id AND rr.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Reservation not found in organization';
  END IF;

  IF p_payment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM core.payments p
    WHERE p.id = p_payment_id
      AND p.organization_id = p_organization_id
      AND p.customer_id = p_customer_id
  ) THEN
    RAISE EXCEPTION 'Payment not found for customer';
  END IF;

  SELECT * INTO v_existing
  FROM core.customer_sessions
  WHERE organization_id = p_organization_id
    AND customer_id = p_customer_id
    AND status = 'active'
  FOR UPDATE;
  IF FOUND THEN
    RETURN core.customer_session_payload(v_existing, 'idempotent');
  END IF;

  BEGIN
    INSERT INTO core.customer_sessions (
      organization_id, customer_id, staff_id, source, context,
      booking_id, reservation_id, pass_id, payment_id, resource_id,
      memo, metadata, status, started_at
    ) VALUES (
      p_organization_id, p_customer_id, p_staff_id, v_source,
      NULLIF(btrim(COALESCE(p_context, '')), ''),
      p_booking_id, p_reservation_id, p_pass_id, p_payment_id, p_resource_id,
      NULLIF(btrim(COALESCE(p_memo, '')), ''),
      COALESCE(p_metadata, '{}'::jsonb),
      'active',
      now()
    )
    RETURNING * INTO v_created;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT * INTO v_existing
      FROM core.customer_sessions
      WHERE organization_id = p_organization_id
        AND customer_id = p_customer_id
        AND status = 'active';
      IF NOT FOUND THEN
        RAISE;
      END IF;
      RETURN core.customer_session_payload(v_existing, 'idempotent');
  END;

  RETURN core.customer_session_payload(v_created, 'created');
END;
$$;

CREATE OR REPLACE FUNCTION core.finish_customer_session(
  p_organization_id UUID,
  p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_row core.customer_sessions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_row FROM core.customer_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  IF v_row.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;
  IF v_row.status = 'completed' THEN
    RETURN core.customer_session_payload(v_row, 'idempotent');
  END IF;
  IF v_row.status <> 'active' THEN
    RAISE EXCEPTION 'Session not active';
  END IF;

  UPDATE core.customer_sessions
  SET status = 'completed', ended_at = now(), updated_at = now()
  WHERE id = v_row.id AND organization_id = p_organization_id
  RETURNING * INTO v_row;

  RETURN core.customer_session_payload(v_row, 'completed');
END;
$$;

CREATE OR REPLACE FUNCTION core.cancel_customer_session(
  p_organization_id UUID,
  p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_row core.customer_sessions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_row FROM core.customer_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  IF v_row.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;
  IF v_row.status = 'cancelled' THEN
    RETURN core.customer_session_payload(v_row, 'idempotent');
  END IF;
  IF v_row.status <> 'active' THEN
    RAISE EXCEPTION 'Session not cancellable';
  END IF;

  UPDATE core.customer_sessions
  SET status = 'cancelled', ended_at = now(), updated_at = now()
  WHERE id = v_row.id AND organization_id = p_organization_id
  RETURNING * INTO v_row;

  RETURN core.customer_session_payload(v_row, 'cancelled');
END;
$$;

REVOKE ALL ON FUNCTION core.customer_session_payload(core.customer_sessions, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.start_customer_session(UUID, UUID, UUID, TEXT, TEXT, UUID, UUID, UUID, UUID, UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.finish_customer_session(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.cancel_customer_session(UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION core.start_customer_session(UUID, UUID, UUID, TEXT, TEXT, UUID, UUID, UUID, UUID, UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION core.finish_customer_session(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.cancel_customer_session(UUID, UUID) TO authenticated;
