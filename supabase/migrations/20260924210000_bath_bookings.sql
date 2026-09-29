-- Bath 예약. 겹침은 core.book_room_reservation_guarded + EXCLUDE 재사용.
-- 직원 겹침은 kind=staff bookable_resource로 동일 가드를 한 트랜잭션에서 호출한다.

CREATE TYPE bath.booking_kind AS ENUM ('room', 'scrub', 'massage', 'other');

CREATE TABLE bath.bookings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id             UUID NOT NULL REFERENCES core.customers(id) ON DELETE RESTRICT,
  reservation_id          UUID NOT NULL REFERENCES core.room_reservations(id) ON DELETE RESTRICT,
  staff_reservation_id    UUID REFERENCES core.room_reservations(id) ON DELETE SET NULL,
  service_id              UUID REFERENCES bath.services(id) ON DELETE SET NULL,
  resource_id             UUID NOT NULL REFERENCES core.bookable_resources(id) ON DELETE RESTRICT,
  staff_id                UUID REFERENCES core.staff(id) ON DELETE SET NULL,
  room_id                 UUID REFERENCES bath.rooms(id) ON DELETE SET NULL,
  kind                    bath.booking_kind NOT NULL,
  starts_at               TIMESTAMPTZ NOT NULL,
  ends_at                 TIMESTAMPTZ NOT NULL,
  status                  core.room_reservation_status NOT NULL DEFAULT 'approved',
  memo                    TEXT,
  idempotency_key         UUID NOT NULL,
  metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bath_bookings_time_check CHECK (ends_at > starts_at),
  UNIQUE (organization_id, idempotency_key)
);

COMMENT ON TABLE bath.bookings IS
  'Bath 예약 연결. 점유 원장은 room_reservations. 결제/입실 자동 연동 없음.';
COMMENT ON COLUMN bath.bookings.reservation_id IS '시설/객실 Resource Reservation.';
COMMENT ON COLUMN bath.bookings.staff_reservation_id IS '직원 자원 Reservation. 동일 EXCLUDE.';
COMMENT ON COLUMN bath.bookings.idempotency_key IS '동일 요청 재시도 시 기존 예약 반환.';

CREATE INDEX idx_bath_bookings_org_time
  ON bath.bookings (organization_id, starts_at);
CREATE INDEX idx_bath_bookings_org_customer
  ON bath.bookings (organization_id, customer_id, starts_at DESC);
CREATE INDEX idx_bath_bookings_org_resource
  ON bath.bookings (organization_id, resource_id, starts_at);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON bath.bookings
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE bath.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY bath_bookings_select ON bath.bookings
  FOR SELECT TO authenticated
  USING (
    core.is_org_staff_actor(organization_id)
    OR core.is_my_customer(organization_id, customer_id)
    OR core.parent_owns_customer(organization_id, customer_id)
  );

CREATE POLICY bath_bookings_staff_write ON bath.bookings
  FOR ALL TO authenticated
  USING (core.is_org_staff_actor(organization_id))
  WITH CHECK (core.is_org_staff_actor(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON bath.bookings TO authenticated;

CREATE OR REPLACE FUNCTION bath.booking_payload(p_booking bath.bookings)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT to_jsonb(p_booking);
$$;

CREATE OR REPLACE FUNCTION bath.ensure_staff_resource(
  p_organization_id UUID,
  p_staff_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bath, core, public
AS $$
DECLARE
  v_id UUID;
  v_name TEXT;
BEGIN
  v_name := 'staff:' || p_staff_id::text;
  SELECT r.id INTO v_id
  FROM core.bookable_resources r
  WHERE r.organization_id = p_organization_id
    AND r.kind = 'staff'
    AND r.name = v_name;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  BEGIN
    v_id := core.upsert_bookable_resource(
      p_organization_id,
      'staff',
      v_name,
      1,
      '00:00'::TIME,
      '23:59'::TIME,
      NULL,
      NULL
    );
    RETURN v_id;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT r.id INTO v_id
      FROM core.bookable_resources r
      WHERE r.organization_id = p_organization_id
        AND r.kind = 'staff'
        AND r.name = v_name;
      IF v_id IS NULL THEN
        RAISE;
      END IF;
      RETURN v_id;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION bath.resolve_booking_kind(
  p_service_id UUID,
  p_room_id UUID
)
RETURNS bath.booking_kind
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = bath, core, public
AS $$
DECLARE
  v_category bath.service_category;
BEGIN
  IF p_service_id IS NOT NULL THEN
    SELECT s.category INTO v_category FROM bath.services s WHERE s.id = p_service_id;
    IF v_category = 'scrub' THEN RETURN 'scrub'; END IF;
    IF v_category = 'massage' THEN RETURN 'massage'; END IF;
    RETURN 'other';
  END IF;
  IF p_room_id IS NOT NULL THEN
    RETURN 'room';
  END IF;
  RETURN 'other';
END;
$$;

CREATE OR REPLACE FUNCTION bath.create_booking(
  p_organization_id UUID,
  p_customer_id UUID,
  p_resource_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_service_id UUID DEFAULT NULL,
  p_staff_id UUID DEFAULT NULL,
  p_room_id UUID DEFAULT NULL,
  p_memo TEXT DEFAULT NULL,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bath, core, public
AS $$
DECLARE
  v_key UUID;
  v_existing bath.bookings%ROWTYPE;
  v_service bath.services%ROWTYPE;
  v_room bath.rooms%ROWTYPE;
  v_staff_resource UUID;
  v_reservation UUID;
  v_staff_reservation UUID;
  v_booking bath.bookings%ROWTYPE;
  v_kind bath.booking_kind;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_organization_id IS NULL OR p_customer_id IS NULL OR p_resource_id IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  IF p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'Invalid time range';
  END IF;

  v_key := COALESCE(p_idempotency_key, gen_random_uuid());
  PERFORM pg_advisory_xact_lock(
    hashtext('bath.bookings'),
    hashtext(p_organization_id::text || ':' || v_key::text)
  );

  SELECT * INTO v_existing
  FROM bath.bookings
  WHERE organization_id = p_organization_id
    AND idempotency_key = v_key
  FOR UPDATE;
  IF FOUND THEN
    RETURN bath.booking_payload(v_existing);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM core.customers c
    WHERE c.id = p_customer_id AND c.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Customer not found in organization';
  END IF;

  IF p_room_id IS NOT NULL THEN
    SELECT * INTO v_room FROM bath.rooms
    WHERE id = p_room_id AND organization_id = p_organization_id AND active;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Resource not found in organization';
    END IF;
    IF v_room.resource_id IS DISTINCT FROM p_resource_id THEN
      RAISE EXCEPTION 'Resource not found in organization';
    END IF;
  END IF;

  IF p_service_id IS NOT NULL THEN
    SELECT * INTO v_service FROM bath.services
    WHERE id = p_service_id AND organization_id = p_organization_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Service not found';
    END IF;
    IF v_service.active IS NOT TRUE THEN
      RAISE EXCEPTION 'Inactive service';
    END IF;
    IF v_service.requires_staff AND p_staff_id IS NULL THEN
      RAISE EXCEPTION 'Staff required';
    END IF;
    IF v_service.requires_resource AND EXISTS (
      SELECT 1 FROM bath.service_resources sr
      WHERE sr.service_id = v_service.id AND sr.organization_id = p_organization_id
    ) AND NOT EXISTS (
      SELECT 1 FROM bath.service_resources sr
      WHERE sr.service_id = v_service.id
        AND sr.organization_id = p_organization_id
        AND sr.resource_id = p_resource_id
    ) THEN
      RAISE EXCEPTION 'Resource not found in organization';
    END IF;
    IF v_service.requires_staff AND EXISTS (
      SELECT 1 FROM bath.service_staff ss
      WHERE ss.service_id = v_service.id AND ss.organization_id = p_organization_id
    ) AND p_staff_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM bath.service_staff ss
      WHERE ss.service_id = v_service.id
        AND ss.organization_id = p_organization_id
        AND ss.staff_id = p_staff_id
    ) THEN
      RAISE EXCEPTION 'Staff not found in organization';
    END IF;
  END IF;

  IF p_staff_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM core.staff s
    WHERE s.id = p_staff_id AND s.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Staff not found in organization';
  END IF;

  v_kind := bath.resolve_booking_kind(p_service_id, p_room_id);

  v_reservation := core.book_room_reservation_guarded(
    p_organization_id,
    p_resource_id,
    p_customer_id,
    auth.uid(),
    p_starts_at,
    p_ends_at,
    'approved'::core.room_reservation_status,
    p_memo,
    auth.uid()
  );

  IF p_staff_id IS NOT NULL THEN
    v_staff_resource := bath.ensure_staff_resource(p_organization_id, p_staff_id);
    v_staff_reservation := core.book_room_reservation_guarded(
      p_organization_id,
      v_staff_resource,
      p_customer_id,
      auth.uid(),
      p_starts_at,
      p_ends_at,
      'approved'::core.room_reservation_status,
      p_memo,
      auth.uid()
    );
  END IF;

  BEGIN
    INSERT INTO bath.bookings (
      organization_id, customer_id, reservation_id, staff_reservation_id,
      service_id, resource_id, staff_id, room_id, kind,
      starts_at, ends_at, status, memo, idempotency_key
    ) VALUES (
      p_organization_id, p_customer_id, v_reservation, v_staff_reservation,
      p_service_id, p_resource_id, p_staff_id, p_room_id, v_kind,
      p_starts_at, p_ends_at, 'approved', NULLIF(btrim(COALESCE(p_memo, '')), ''), v_key
    )
    RETURNING * INTO v_booking;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE;
  END;

  RETURN bath.booking_payload(v_booking);
END;
$$;

CREATE OR REPLACE FUNCTION bath.cancel_reservation_if_open(p_reservation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bath, core, public
AS $$
BEGIN
  IF p_reservation_id IS NULL THEN
    RETURN;
  END IF;
  UPDATE core.room_reservations
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_reservation_id
    AND status IN ('pending', 'approved');
END;
$$;

CREATE OR REPLACE FUNCTION bath.cancel_booking(
  p_organization_id UUID,
  p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bath, core, public
AS $$
DECLARE
  v_booking bath.bookings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_booking FROM bath.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  IF v_booking.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;
  IF v_booking.status = 'cancelled' THEN
    RETURN bath.booking_payload(v_booking);
  END IF;
  IF v_booking.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Booking not cancellable';
  END IF;

  PERFORM bath.cancel_reservation_if_open(v_booking.reservation_id);
  PERFORM bath.cancel_reservation_if_open(v_booking.staff_reservation_id);

  UPDATE bath.bookings
  SET status = 'cancelled', updated_at = now()
  WHERE id = v_booking.id AND organization_id = p_organization_id
  RETURNING * INTO v_booking;

  RETURN bath.booking_payload(v_booking);
END;
$$;

CREATE OR REPLACE FUNCTION bath.set_booking_status(
  p_organization_id UUID,
  p_booking_id UUID,
  p_status core.room_reservation_status
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bath, core, public
AS $$
DECLARE
  v_booking bath.bookings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  IF p_status = 'cancelled' THEN
    RETURN bath.cancel_booking(p_organization_id, p_booking_id);
  END IF;

  SELECT * INTO v_booking FROM bath.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  IF v_booking.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;
  IF v_booking.status = p_status THEN
    RETURN bath.booking_payload(v_booking);
  END IF;
  IF v_booking.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Booking not transition';
  END IF;
  IF p_status NOT IN ('approved', 'completed', 'rejected') THEN
    RAISE EXCEPTION 'Booking not transition';
  END IF;

  UPDATE core.room_reservations
  SET status = p_status, updated_at = now()
  WHERE id IN (v_booking.reservation_id, v_booking.staff_reservation_id)
    AND status IN ('pending', 'approved');

  UPDATE bath.bookings
  SET status = p_status, updated_at = now()
  WHERE id = v_booking.id AND organization_id = p_organization_id
  RETURNING * INTO v_booking;

  RETURN bath.booking_payload(v_booking);
END;
$$;

REVOKE ALL ON FUNCTION bath.booking_payload(bath.bookings) FROM PUBLIC;
REVOKE ALL ON FUNCTION bath.ensure_staff_resource(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION bath.resolve_booking_kind(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION bath.cancel_reservation_if_open(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION bath.create_booking(UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION bath.cancel_booking(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION bath.set_booking_status(UUID, UUID, core.room_reservation_status) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION bath.create_booking(UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION bath.cancel_booking(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION bath.set_booking_status(UUID, UUID, core.room_reservation_status) TO authenticated;
