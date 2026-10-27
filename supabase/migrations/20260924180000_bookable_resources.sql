-- 예약 가능 자원을 업종 공통 카탈로그로 승격한다.
-- room_reservations EXCLUDE / book_room_reservation_guarded 를 재사용한다.
-- Bath 전용 kind/분기는 넣지 않는다.

CREATE TABLE IF NOT EXISTS core.bookable_resources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL
                    CHECK (char_length(kind) BETWEEN 2 AND 40 AND kind ~ '^[a-z][a-z0-9_]*$'),
  name            TEXT NOT NULL,
  capacity        INT NOT NULL DEFAULT 1 CHECK (capacity >= 1),
  open_time       TIME NOT NULL DEFAULT '09:00',
  close_time      TIME NOT NULL DEFAULT '22:00',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  memo            TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, kind, name)
);

CREATE INDEX IF NOT EXISTS idx_bookable_resources_org_kind
  ON core.bookable_resources (organization_id, kind)
  WHERE is_active;

COMMENT ON TABLE core.bookable_resources IS
  '업종 공통 예약 자원. kind는 모듈이 정하고 Core는 분기하지 않는다.';

INSERT INTO core.bookable_resources (
  id, organization_id, kind, name, capacity, open_time, close_time,
  is_active, memo, created_at, updated_at
)
SELECT
  r.id,
  r.organization_id,
  'practice_room',
  r.name,
  r.capacity,
  r.open_time,
  r.close_time,
  r.is_active,
  r.memo,
  r.created_at,
  r.updated_at
FROM core.practice_rooms r
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION core.sync_practice_room_resource()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  INSERT INTO core.bookable_resources (
    id, organization_id, kind, name, capacity, open_time, close_time,
    is_active, memo, updated_at
  ) VALUES (
    NEW.id, NEW.organization_id, 'practice_room', NEW.name, NEW.capacity,
    NEW.open_time, NEW.close_time, NEW.is_active, NEW.memo, now()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    capacity = EXCLUDED.capacity,
    open_time = EXCLUDED.open_time,
    close_time = EXCLUDED.close_time,
    is_active = EXCLUDED.is_active,
    memo = EXCLUDED.memo,
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_practice_rooms_sync_resource ON core.practice_rooms;
CREATE TRIGGER trg_practice_rooms_sync_resource
  BEFORE INSERT OR UPDATE ON core.practice_rooms
  FOR EACH ROW EXECUTE FUNCTION core.sync_practice_room_resource();

ALTER TABLE core.practice_rooms
  DROP CONSTRAINT IF EXISTS practice_rooms_id_resource_fkey;
ALTER TABLE core.practice_rooms
  ADD CONSTRAINT practice_rooms_id_resource_fkey
  FOREIGN KEY (id) REFERENCES core.bookable_resources(id) ON DELETE RESTRICT;

ALTER TABLE core.room_reservations
  DROP CONSTRAINT IF EXISTS room_reservations_room_id_fkey;
ALTER TABLE core.room_reservations
  ADD CONSTRAINT room_reservations_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES core.bookable_resources(id) ON DELETE CASCADE;

COMMENT ON TABLE core.room_reservations IS
  '공통 자원 예약 원장. room_id = bookable_resources.id. pending/approved 구간은 EXCLUDE로 중복 차단.';
COMMENT ON COLUMN core.room_reservations.room_id IS
  'bookable_resources.id. 컬럼명은 호환을 위해 유지한다.';

CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.bookable_resources
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE core.bookable_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bookable_resources_select ON core.bookable_resources;
CREATE POLICY bookable_resources_select ON core.bookable_resources
  FOR SELECT TO authenticated
  USING (
    core.is_org_member(organization_id)
    OR core.is_org_staff_actor(organization_id)
  );

DROP POLICY IF EXISTS bookable_resources_staff_write ON core.bookable_resources;
CREATE POLICY bookable_resources_staff_write ON core.bookable_resources
  FOR ALL TO authenticated
  USING (core.is_org_staff_actor(organization_id))
  WITH CHECK (core.is_org_staff_actor(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON core.bookable_resources TO authenticated;

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
  v_resource core.bookable_resources%ROWTYPE;
  v_local_start TIME;
  v_local_end TIME;
  v_date DATE;
  v_settings JSONB;
BEGIN
  SELECT * INTO v_resource
  FROM core.bookable_resources
  WHERE id = p_room_id AND is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Practice room not found or inactive';
  END IF;

  IF p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'Invalid time range';
  END IF;

  IF (p_starts_at AT TIME ZONE 'Asia/Seoul')::date
       <> (p_ends_at AT TIME ZONE 'Asia/Seoul')::date THEN
    RAISE EXCEPTION 'Overnight reservations are not allowed';
  END IF;

  v_local_start := (p_starts_at AT TIME ZONE 'Asia/Seoul')::time;
  v_local_end := (p_ends_at AT TIME ZONE 'Asia/Seoul')::time;
  v_date := (p_starts_at AT TIME ZONE 'Asia/Seoul')::date;

  IF v_local_start < v_resource.open_time OR v_local_end > v_resource.close_time THEN
    RAISE EXCEPTION 'Outside room operating hours (% - %)', v_resource.open_time, v_resource.close_time;
  END IF;

  SELECT settings INTO v_settings
  FROM core.organizations
  WHERE id = v_resource.organization_id;

  IF v_settings IS NOT NULL
     AND v_settings->'closedDates' IS NOT NULL
     AND v_settings->'closedDates' ? v_date::TEXT THEN
    RAISE EXCEPTION 'Academy is closed on %', v_date;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION core.book_room_reservation_guarded(
  p_org_id UUID,
  p_room_id UUID,
  p_customer_id UUID,
  p_requested_by UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_status core.room_reservation_status,
  p_memo TEXT DEFAULT NULL,
  p_reviewed_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_id UUID;
  v_resource core.bookable_resources%ROWTYPE;
BEGIN
  IF p_requested_by IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_resource
  FROM core.bookable_resources
  WHERE id = p_room_id
    AND organization_id = p_org_id
    AND is_active
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid practice room';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM core.customers c
    WHERE c.id = p_customer_id
      AND c.organization_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'Customer not found in organization';
  END IF;

  PERFORM core.assert_room_slot_allowed(p_room_id, p_starts_at, p_ends_at);

  IF EXISTS (
    SELECT 1
    FROM core.room_reservations rr
    WHERE rr.room_id = p_room_id
      AND rr.status IN ('pending', 'approved')
      AND tstzrange(rr.starts_at, rr.ends_at, '[)')
          && tstzrange(p_starts_at, p_ends_at, '[)')
  ) THEN
    RAISE EXCEPTION 'Time slot already reserved';
  END IF;

  INSERT INTO core.room_reservations (
    organization_id,
    room_id,
    customer_id,
    requested_by,
    starts_at,
    ends_at,
    status,
    memo,
    reviewed_by,
    reviewed_at
  ) VALUES (
    p_org_id,
    p_room_id,
    p_customer_id,
    p_requested_by,
    p_starts_at,
    p_ends_at,
    p_status,
    NULLIF(trim(COALESCE(p_memo, '')), ''),
    CASE WHEN p_status = 'approved' THEN COALESCE(p_reviewed_by, p_requested_by) ELSE NULL END,
    CASE WHEN p_status = 'approved' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Time slot already reserved';
END;
$$;

COMMENT ON FUNCTION core.book_room_reservation_guarded IS
  '공통 자원 예약 가드: bookable_resources FOR UPDATE + overlap + EXCLUDE 폴백';

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

  IF NOT core.is_org_staff_actor(v_row.organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending reservations can be reviewed';
  END IF;

  IF p_approve THEN
    PERFORM 1 FROM core.bookable_resources
    WHERE id = v_row.room_id
    FOR UPDATE;

    PERFORM core.assert_room_slot_allowed(v_row.room_id, v_row.starts_at, v_row.ends_at);

    IF EXISTS (
      SELECT 1
      FROM core.room_reservations rr
      WHERE rr.room_id = v_row.room_id
        AND rr.id <> v_row.id
        AND rr.status IN ('pending', 'approved')
        AND tstzrange(rr.starts_at, rr.ends_at, '[)')
            && tstzrange(v_row.starts_at, v_row.ends_at, '[)')
    ) THEN
      RAISE EXCEPTION 'Time slot conflicts with another reservation';
    END IF;
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

CREATE OR REPLACE FUNCTION core.list_org_bookable_resources(
  p_org_id UUID,
  p_kind TEXT DEFAULT NULL
)
RETURNS SETOF core.bookable_resources
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT *
  FROM core.bookable_resources
  WHERE organization_id = p_org_id
    AND (p_kind IS NULL OR kind = p_kind)
    AND (
      core.is_org_member(p_org_id)
      OR core.is_org_staff_actor(p_org_id)
    )
  ORDER BY kind, name;
$$;

CREATE OR REPLACE FUNCTION core.upsert_bookable_resource(
  p_org_id UUID,
  p_kind TEXT,
  p_name TEXT,
  p_capacity INT DEFAULT 1,
  p_open_time TIME DEFAULT '09:00',
  p_close_time TIME DEFAULT '22:00',
  p_id UUID DEFAULT NULL,
  p_memo TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_id UUID;
  v_kind TEXT;
BEGIN
  IF NOT core.is_org_staff_actor(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_kind := lower(btrim(COALESCE(p_kind, '')));
  IF v_kind !~ '^[a-z][a-z0-9_]*$' OR char_length(v_kind) < 2 THEN
    RAISE EXCEPTION 'Invalid resource kind';
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE core.bookable_resources
    SET name = trim(p_name),
        capacity = GREATEST(1, COALESCE(p_capacity, 1)),
        open_time = COALESCE(p_open_time, open_time),
        close_time = COALESCE(p_close_time, close_time),
        memo = COALESCE(p_memo, memo),
        updated_at = now()
    WHERE id = p_id
      AND organization_id = p_org_id
      AND kind = v_kind
    RETURNING id INTO v_id;
    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
  END IF;

  INSERT INTO core.bookable_resources (
    organization_id, kind, name, capacity, open_time, close_time, memo
  ) VALUES (
    p_org_id, v_kind, trim(p_name), GREATEST(1, COALESCE(p_capacity, 1)),
    COALESCE(p_open_time, '09:00'::TIME),
    COALESCE(p_close_time, '22:00'::TIME),
    NULLIF(btrim(COALESCE(p_memo, '')), '')
  )
  ON CONFLICT (organization_id, kind, name) DO UPDATE
    SET capacity = EXCLUDED.capacity,
        open_time = EXCLUDED.open_time,
        close_time = EXCLUDED.close_time,
        memo = COALESCE(EXCLUDED.memo, core.bookable_resources.memo),
        is_active = true,
        updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION core.list_org_bookable_resources(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.upsert_bookable_resource(UUID, TEXT, TEXT, INT, TIME, TIME, UUID, TEXT) TO authenticated;
