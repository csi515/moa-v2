-- Practice rooms + room reservations with overlap exclusion + RLS + RPCs
-- Coexists with staff PracticeRoomBooking synced via core.schedules (kind=practice_room)

BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$ BEGIN
  CREATE TYPE core.room_reservation_status AS ENUM (
    'pending',
    'approved',
    'cancelled',
    'rejected',
    'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- practice_rooms
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.practice_rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  capacity        INT NOT NULL DEFAULT 1 CHECK (capacity >= 1),
  open_time       TIME NOT NULL DEFAULT '09:00',
  close_time      TIME NOT NULL DEFAULT '22:00',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  memo            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_practice_rooms_org
  ON core.practice_rooms(organization_id)
  WHERE is_active;

COMMENT ON TABLE core.practice_rooms IS '학원 연습실 마스터 (성인/수강생 예약용)';

-- ---------------------------------------------------------------------------
-- room_reservations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.room_reservations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  room_id         UUID NOT NULL REFERENCES core.practice_rooms(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  requested_by    UUID NOT NULL REFERENCES core.profiles(id) ON DELETE CASCADE,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  status          core.room_reservation_status NOT NULL DEFAULT 'pending',
  memo            TEXT,
  reviewed_by     UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT room_reservations_time_check CHECK (ends_at > starts_at),
  -- same-calendar-day for v1 (overnight blocked at app + check)
  CONSTRAINT room_reservations_same_day CHECK (
    (starts_at AT TIME ZONE 'Asia/Seoul')::date
      = (ends_at AT TIME ZONE 'Asia/Seoul')::date
  )
);

CREATE INDEX IF NOT EXISTS idx_room_reservations_org_time
  ON core.room_reservations(organization_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_room_reservations_customer
  ON core.room_reservations(customer_id, starts_at DESC);

CREATE INDEX IF NOT EXISTS idx_room_reservations_pending
  ON core.room_reservations(organization_id, status)
  WHERE status = 'pending';

-- Prevent overlapping active reservations for the same room
ALTER TABLE core.room_reservations
  DROP CONSTRAINT IF EXISTS room_reservations_no_overlap;

ALTER TABLE core.room_reservations
  ADD CONSTRAINT room_reservations_no_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status IN ('pending', 'approved'));

COMMENT ON TABLE core.room_reservations IS
  '연습실 예약. pending/approved 구간은 EXCLUDE로 중복 차단.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE core.practice_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.room_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS practice_rooms_select ON core.practice_rooms;
CREATE POLICY practice_rooms_select ON core.practice_rooms
  FOR SELECT TO authenticated
  USING (
    core.is_org_member(organization_id)
    OR core.is_org_owner_or_admin(organization_id)
  );

DROP POLICY IF EXISTS practice_rooms_write ON core.practice_rooms;
CREATE POLICY practice_rooms_write ON core.practice_rooms
  FOR ALL TO authenticated
  USING (core.is_org_owner_or_admin(organization_id))
  WITH CHECK (core.is_org_owner_or_admin(organization_id));

DROP POLICY IF EXISTS room_reservations_select ON core.room_reservations;
CREATE POLICY room_reservations_select ON core.room_reservations
  FOR SELECT TO authenticated
  USING (
    core.is_org_owner_or_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, true)
    OR requested_by = auth.uid()
    OR core.is_my_customer(organization_id, customer_id)
  );

DROP POLICY IF EXISTS room_reservations_insert ON core.room_reservations;
CREATE POLICY room_reservations_insert ON core.room_reservations
  FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND core.is_my_customer(organization_id, customer_id)
  );

DROP POLICY IF EXISTS room_reservations_update_self ON core.room_reservations;
CREATE POLICY room_reservations_update_self ON core.room_reservations
  FOR UPDATE TO authenticated
  USING (requested_by = auth.uid())
  WITH CHECK (requested_by = auth.uid());

DROP POLICY IF EXISTS room_reservations_update_staff ON core.room_reservations;
CREATE POLICY room_reservations_update_staff ON core.room_reservations
  FOR UPDATE TO authenticated
  USING (core.is_org_owner_or_admin(organization_id))
  WITH CHECK (core.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Helpers: operating hours / holiday block (settings.closedDates optional)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.assert_room_slot_allowed(
  p_room_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_room core.practice_rooms%ROWTYPE;
  v_local_start TIME;
  v_local_end TIME;
  v_date DATE;
  v_settings JSONB;
BEGIN
  SELECT * INTO v_room FROM core.practice_rooms WHERE id = p_room_id AND is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Practice room not found or inactive';
  END IF;

  IF p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'Invalid time range';
  END IF;

  -- Overnight not allowed in v1
  IF (p_starts_at AT TIME ZONE 'Asia/Seoul')::date
       <> (p_ends_at AT TIME ZONE 'Asia/Seoul')::date THEN
    RAISE EXCEPTION 'Overnight reservations are not allowed';
  END IF;

  v_local_start := (p_starts_at AT TIME ZONE 'Asia/Seoul')::time;
  v_local_end := (p_ends_at AT TIME ZONE 'Asia/Seoul')::time;
  v_date := (p_starts_at AT TIME ZONE 'Asia/Seoul')::date;

  IF v_local_start < v_room.open_time OR v_local_end > v_room.close_time THEN
    RAISE EXCEPTION 'Outside room operating hours (% - %)', v_room.open_time, v_room.close_time;
  END IF;

  SELECT settings INTO v_settings
  FROM core.organizations
  WHERE id = v_room.organization_id;

  IF v_settings IS NOT NULL
     AND v_settings->'closedDates' IS NOT NULL
     AND v_settings->'closedDates' ? v_date::TEXT THEN
    RAISE EXCEPTION 'Academy is closed on %', v_date;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.request_room_reservation(
  p_org_id UUID,
  p_room_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_memo TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_customer_id UUID;
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT core.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  v_customer_id := core.get_my_student_customer_id(p_org_id);
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'No linked student customer for this organization';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM core.practice_rooms r
    WHERE r.id = p_room_id AND r.organization_id = p_org_id AND r.is_active
  ) THEN
    RAISE EXCEPTION 'Invalid practice room';
  END IF;

  PERFORM core.assert_room_slot_allowed(p_room_id, p_starts_at, p_ends_at);

  INSERT INTO core.room_reservations (
    organization_id,
    room_id,
    customer_id,
    requested_by,
    starts_at,
    ends_at,
    status,
    memo
  ) VALUES (
    p_org_id,
    p_room_id,
    v_customer_id,
    auth.uid(),
    p_starts_at,
    p_ends_at,
    'pending',
    NULLIF(trim(COALESCE(p_memo, '')), '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Time slot already reserved';
END;
$$;

CREATE OR REPLACE FUNCTION core.cancel_my_room_reservation(p_reservation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_row core.room_reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM core.room_reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  IF v_row.requested_by <> auth.uid() AND NOT core.is_org_owner_or_admin(v_row.organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF v_row.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Reservation cannot be cancelled';
  END IF;

  UPDATE core.room_reservations
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_reservation_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION core.review_room_reservation(
  p_reservation_id UUID,
  p_approve BOOLEAN,
  p_memo TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_row core.room_reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM core.room_reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  IF NOT core.is_org_owner_or_admin(v_row.organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending reservations can be reviewed';
  END IF;

  IF p_approve THEN
    PERFORM core.assert_room_slot_allowed(v_row.room_id, v_row.starts_at, v_row.ends_at);
  END IF;

  UPDATE core.room_reservations
  SET
    status = CASE WHEN p_approve THEN 'approved'::core.room_reservation_status
                  ELSE 'rejected'::core.room_reservation_status END,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    memo = COALESCE(NULLIF(trim(COALESCE(p_memo, '')), ''), memo),
    updated_at = now()
  WHERE id = p_reservation_id;

  RETURN true;
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Time slot conflicts with another reservation';
END;
$$;

CREATE OR REPLACE FUNCTION core.list_org_practice_rooms(p_org_id UUID)
RETURNS SETOF core.practice_rooms
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT *
  FROM core.practice_rooms
  WHERE organization_id = p_org_id
    AND (
      core.is_org_member(p_org_id)
      OR core.is_org_owner_or_admin(p_org_id)
    )
  ORDER BY name;
$$;

CREATE OR REPLACE FUNCTION core.upsert_practice_room(
  p_org_id UUID,
  p_name TEXT,
  p_capacity INT DEFAULT 1,
  p_open_time TIME DEFAULT '09:00',
  p_close_time TIME DEFAULT '22:00',
  p_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT core.is_org_owner_or_admin(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE core.practice_rooms
    SET name = trim(p_name),
        capacity = GREATEST(1, COALESCE(p_capacity, 1)),
        open_time = COALESCE(p_open_time, open_time),
        close_time = COALESCE(p_close_time, close_time),
        updated_at = now()
    WHERE id = p_id AND organization_id = p_org_id
    RETURNING id INTO v_id;
    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
  END IF;

  INSERT INTO core.practice_rooms (
    organization_id, name, capacity, open_time, close_time
  ) VALUES (
    p_org_id, trim(p_name), GREATEST(1, COALESCE(p_capacity, 1)),
    COALESCE(p_open_time, '09:00'::TIME),
    COALESCE(p_close_time, '22:00'::TIME)
  )
  ON CONFLICT (organization_id, name) DO UPDATE
    SET capacity = EXCLUDED.capacity,
        open_time = EXCLUDED.open_time,
        close_time = EXCLUDED.close_time,
        is_active = true,
        updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION core.assert_room_slot_allowed(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION core.request_room_reservation(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.cancel_my_room_reservation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.review_room_reservation(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.list_org_practice_rooms(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.upsert_practice_room(UUID, TEXT, INT, TIME, TIME, UUID) TO authenticated;

COMMIT;
