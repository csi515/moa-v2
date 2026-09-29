-- Bath 객실 카탈로그. 예약 원장은 core.room_reservations.
-- available/booked 상태 없음. 결제 테이블을 복제하지 않는다.

CREATE TYPE bath.room_type AS ENUM (
  'private',
  'family',
  'couple',
  'vip',
  'rest'
);

CREATE TYPE bath.floor_type AS ENUM (
  'ondol',
  'wood',
  'tile',
  'mixed'
);

CREATE TABLE bath.rooms (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  resource_id         UUID NOT NULL UNIQUE REFERENCES core.bookable_resources(id) ON DELETE RESTRICT,
  room_number         TEXT NOT NULL,
  name                TEXT NOT NULL,
  room_type           bath.room_type NOT NULL,
  floor_type          bath.floor_type NOT NULL,
  capacity            INT NOT NULL CHECK (capacity >= 1),
  bathtub_count       INT NOT NULL DEFAULT 0 CHECK (bathtub_count >= 0),
  has_scrub_station   BOOLEAN NOT NULL DEFAULT false,
  has_shower          BOOLEAN NOT NULL DEFAULT false,
  has_toilet          BOOLEAN NOT NULL DEFAULT false,
  base_price          NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (base_price >= 0),
  active              BOOLEAN NOT NULL DEFAULT true,
  sort_order          INT NOT NULL DEFAULT 0,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bath_rooms_number_not_blank CHECK (char_length(btrim(room_number)) > 0),
  CONSTRAINT bath_rooms_name_not_blank CHECK (char_length(btrim(name)) > 0),
  UNIQUE (organization_id, room_number)
);

COMMENT ON TABLE bath.rooms IS
  '목욕탕 객실 마스터. 예약 점유는 room_reservations. 청소/점검은 향후 별도 상태.';
COMMENT ON COLUMN bath.rooms.resource_id IS 'core.bookable_resources.id. kind=bath_room.';
COMMENT ON COLUMN bath.rooms.room_type IS '용도만. 시설 특성은 수량/플래그/metadata.';
COMMENT ON COLUMN bath.rooms.base_price IS '표시용 기본 요금. 결제 원장이 아님.';
COMMENT ON COLUMN bath.rooms.metadata IS '드문 시설 확장. 예약 상태 저장 금지.';

CREATE INDEX idx_bath_rooms_org_active
  ON bath.rooms (organization_id, active, sort_order, room_number);

CREATE INDEX idx_bath_rooms_org_type
  ON bath.rooms (organization_id, room_type);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON bath.rooms
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE bath.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY bath_rooms_select ON bath.rooms
  FOR SELECT TO authenticated
  USING (
    core.is_org_staff_actor(organization_id)
    OR core.is_org_member(organization_id)
  );

CREATE POLICY bath_rooms_staff_write ON bath.rooms
  FOR ALL TO authenticated
  USING (core.is_org_staff_actor(organization_id))
  WITH CHECK (core.is_org_staff_actor(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON bath.rooms TO authenticated;

CREATE OR REPLACE FUNCTION bath.room_to_json(p_room bath.rooms)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT to_jsonb(p_room);
$$;

CREATE OR REPLACE FUNCTION bath.sync_room_resource(
  p_organization_id UUID,
  p_resource_id UUID,
  p_room_number TEXT,
  p_name TEXT,
  p_capacity INT,
  p_active BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bath, core, public
AS $$
DECLARE
  v_id UUID;
  v_resource_name TEXT;
BEGIN
  v_resource_name := btrim(p_room_number) || ' · ' || btrim(p_name);

  IF p_resource_id IS NULL THEN
    v_id := core.upsert_bookable_resource(
      p_organization_id,
      'bath_room',
      v_resource_name,
      p_capacity,
      '00:00'::TIME,
      '23:59'::TIME,
      NULL,
      NULL
    );
  ELSE
    v_id := core.upsert_bookable_resource(
      p_organization_id,
      'bath_room',
      v_resource_name,
      p_capacity,
      '00:00'::TIME,
      '23:59'::TIME,
      p_resource_id,
      NULL
    );
  END IF;

  UPDATE core.bookable_resources
  SET
    is_active = p_active,
    capacity = p_capacity,
    name = v_resource_name,
    updated_at = now()
  WHERE id = v_id
    AND organization_id = p_organization_id
    AND kind = 'bath_room';

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION bath.upsert_room(
  p_organization_id UUID,
  p_room_number TEXT,
  p_name TEXT,
  p_room_type bath.room_type,
  p_floor_type bath.floor_type,
  p_capacity INT,
  p_id UUID DEFAULT NULL,
  p_bathtub_count INT DEFAULT 0,
  p_has_scrub_station BOOLEAN DEFAULT false,
  p_has_shower BOOLEAN DEFAULT false,
  p_has_toilet BOOLEAN DEFAULT false,
  p_base_price NUMERIC DEFAULT 0,
  p_active BOOLEAN DEFAULT true,
  p_sort_order INT DEFAULT 0,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bath, core, public
AS $$
DECLARE
  v_existing bath.rooms%ROWTYPE;
  v_resource_id UUID;
  v_room bath.rooms%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  IF btrim(COALESCE(p_room_number, '')) = '' THEN
    RAISE EXCEPTION 'Invalid room number';
  END IF;
  IF btrim(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'Invalid room name';
  END IF;
  IF p_capacity IS NULL OR p_capacity < 1 THEN
    RAISE EXCEPTION 'Invalid capacity';
  END IF;
  IF COALESCE(p_bathtub_count, 0) < 0 THEN
    RAISE EXCEPTION 'Invalid bathtub count';
  END IF;
  IF COALESCE(p_base_price, 0) < 0 THEN
    RAISE EXCEPTION 'Invalid base price';
  END IF;

  IF p_id IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM bath.rooms
    WHERE id = p_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Room not found';
    END IF;
    IF v_existing.organization_id IS DISTINCT FROM p_organization_id THEN
      RAISE EXCEPTION 'Organization mismatch';
    END IF;
    v_resource_id := v_existing.resource_id;
  END IF;

  v_resource_id := bath.sync_room_resource(
    p_organization_id,
    v_resource_id,
    p_room_number,
    p_name,
    p_capacity,
    COALESCE(p_active, true)
  );

  BEGIN
    INSERT INTO bath.rooms (
      id,
      organization_id,
      resource_id,
      room_number,
      name,
      room_type,
      floor_type,
      capacity,
      bathtub_count,
      has_scrub_station,
      has_shower,
      has_toilet,
      base_price,
      active,
      sort_order,
      metadata
    ) VALUES (
      COALESCE(p_id, v_resource_id),
      p_organization_id,
      v_resource_id,
      btrim(p_room_number),
      btrim(p_name),
      p_room_type,
      p_floor_type,
      p_capacity,
      COALESCE(p_bathtub_count, 0),
      COALESCE(p_has_scrub_station, false),
      COALESCE(p_has_shower, false),
      COALESCE(p_has_toilet, false),
      COALESCE(p_base_price, 0),
      COALESCE(p_active, true),
      COALESCE(p_sort_order, 0),
      COALESCE(p_metadata, '{}'::jsonb)
    )
    ON CONFLICT (id) DO UPDATE SET
      room_number = EXCLUDED.room_number,
      name = EXCLUDED.name,
      room_type = EXCLUDED.room_type,
      floor_type = EXCLUDED.floor_type,
      capacity = EXCLUDED.capacity,
      bathtub_count = EXCLUDED.bathtub_count,
      has_scrub_station = EXCLUDED.has_scrub_station,
      has_shower = EXCLUDED.has_shower,
      has_toilet = EXCLUDED.has_toilet,
      base_price = EXCLUDED.base_price,
      active = EXCLUDED.active,
      sort_order = EXCLUDED.sort_order,
      metadata = EXCLUDED.metadata,
      updated_at = now()
    RETURNING * INTO v_room;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Room number already exists';
  END;

  RETURN bath.room_to_json(v_room);
END;
$$;

CREATE OR REPLACE FUNCTION bath.set_room_active(
  p_organization_id UUID,
  p_room_id UUID,
  p_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bath, core, public
AS $$
DECLARE
  v_room bath.rooms%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_room FROM bath.rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found';
  END IF;
  IF v_room.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;

  UPDATE bath.rooms
  SET active = p_active, updated_at = now()
  WHERE id = v_room.id
    AND organization_id = p_organization_id
  RETURNING * INTO v_room;

  UPDATE core.bookable_resources
  SET is_active = p_active, updated_at = now()
  WHERE id = v_room.resource_id
    AND organization_id = p_organization_id;

  RETURN bath.room_to_json(v_room);
END;
$$;

CREATE OR REPLACE FUNCTION bath.delete_room(
  p_organization_id UUID,
  p_room_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bath, core, public
AS $$
DECLARE
  v_room bath.rooms%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_room FROM bath.rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found';
  END IF;
  IF v_room.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM core.room_reservations rr
    WHERE rr.room_id = v_room.resource_id
      AND rr.organization_id = p_organization_id
      AND rr.status IN ('pending', 'approved')
  ) THEN
    RAISE EXCEPTION 'Room has active reservations';
  END IF;

  DELETE FROM bath.rooms
  WHERE id = v_room.id
    AND organization_id = p_organization_id;

  UPDATE core.bookable_resources
  SET is_active = false, updated_at = now()
  WHERE id = v_room.resource_id
    AND organization_id = p_organization_id;

  RETURN bath.room_to_json(v_room);
END;
$$;

COMMENT ON FUNCTION bath.upsert_room IS
  '객실+bookable_resource 원자 저장. 예약 EXCLUDE를 복제하지 않음.';

REVOKE ALL ON FUNCTION bath.room_to_json(bath.rooms) FROM PUBLIC;
REVOKE ALL ON FUNCTION bath.sync_room_resource(UUID, UUID, TEXT, TEXT, INT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION bath.upsert_room(UUID, TEXT, TEXT, bath.room_type, bath.floor_type, INT, UUID, INT, BOOLEAN, BOOLEAN, BOOLEAN, NUMERIC, BOOLEAN, INT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION bath.set_room_active(UUID, UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION bath.delete_room(UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION bath.upsert_room(UUID, TEXT, TEXT, bath.room_type, bath.floor_type, INT, UUID, INT, BOOLEAN, BOOLEAN, BOOLEAN, NUMERIC, BOOLEAN, INT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION bath.set_room_active(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION bath.delete_room(UUID, UUID) TO authenticated;
