-- One-time: migrate legacy schedules (metadata.kind=practice_room) → room_reservations
-- Then cancel legacy schedule rows so they no longer occupy the dual stack.

DO $$
DECLARE
  r RECORD;
  v_room_id UUID;
  v_room_name TEXT;
  v_requester UUID;
  v_new_id UUID;
BEGIN
  FOR r IN
    SELECT
      s.id,
      s.organization_id,
      s.customer_id,
      s.starts_at,
      s.ends_at,
      s.memo,
      s.created_by,
      s.metadata,
      s.status
    FROM core.schedules s
    WHERE COALESCE(s.metadata->>'kind', '') = 'practice_room'
      AND s.status IN ('scheduled', 'confirmed')
      AND s.customer_id IS NOT NULL
      AND COALESCE(s.metadata->>'migrated_reservation_id', '') = ''
  LOOP
    v_room_name := NULLIF(trim(COALESCE(r.metadata->>'room', '')), '');
    IF v_room_name IS NULL THEN
      v_room_name := '연습실';
    END IF;

    -- ensure practice room exists
    INSERT INTO core.practice_rooms (organization_id, name)
    VALUES (r.organization_id, v_room_name)
    ON CONFLICT (organization_id, name) DO UPDATE
      SET is_active = true, updated_at = now()
    RETURNING id INTO v_room_id;

    IF v_room_id IS NULL THEN
      SELECT id INTO v_room_id
      FROM core.practice_rooms
      WHERE organization_id = r.organization_id AND name = v_room_name
      LIMIT 1;
    END IF;

    -- requester: created_by or org owner
    v_requester := r.created_by;
    IF v_requester IS NULL THEN
      SELECT m.user_id INTO v_requester
      FROM core.organization_members m
      WHERE m.organization_id = r.organization_id
        AND m.is_active = true
        AND m.role::text IN ('owner', 'admin')
      ORDER BY CASE m.role::text WHEN 'owner' THEN 0 ELSE 1 END
      LIMIT 1;
    END IF;

    IF v_requester IS NULL OR v_room_id IS NULL THEN
      CONTINUE;
    END IF;

    BEGIN
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
        r.organization_id,
        v_room_id,
        r.customer_id,
        v_requester,
        r.starts_at,
        r.ends_at,
        'approved',
        NULLIF(trim(COALESCE(r.memo, '')), ''),
        v_requester,
        now()
      )
      RETURNING id INTO v_new_id;
    EXCEPTION
      WHEN exclusion_violation THEN
        -- slot already booked in canonical table — skip insert, still mark legacy cancelled
        v_new_id := NULL;
      WHEN others THEN
        CONTINUE;
    END;

    UPDATE core.schedules
    SET
      status = 'cancelled',
      metadata = COALESCE(metadata, '{}'::jsonb)
        || jsonb_build_object(
          'migrated_reservation_id', COALESCE(v_new_id::text, 'skipped_overlap'),
          'migrated_at', now()
        ),
      updated_at = now()
    WHERE id = r.id;
  END LOOP;
END $$;

COMMENT ON TABLE core.room_reservations IS
  '연습실 예약 단일 원장. 레거시 schedules(kind=practice_room)는 20260907160000에서 이관됨.';
