-- 출결 business key unique + 결석 알림 중복 방지 + 보강 서버 충돌 가드
-- DAY_ATTENDANCE(service_id NULL, classId=c-default)와 수업 출결은 같은 날 공존한다.

BEGIN;

CREATE OR REPLACE FUNCTION piano.attendance_class_key(
  p_service_id UUID,
  p_metadata JSONB
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT COALESCE(
    p_service_id::text,
    NULLIF(btrim(COALESCE(p_metadata->>'classId', '')), ''),
    'c-default'
  );
$$;

COMMENT ON FUNCTION piano.attendance_class_key(UUID, JSONB) IS
  '출결 class business key. UUID service 우선, 없으면 metadata.classId, 없으면 DAY_ATTENDANCE.';

UPDATE piano.attendance
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{classId}',
  to_jsonb(piano.attendance_class_key(service_id, metadata)),
  true
)
WHERE COALESCE(NULLIF(btrim(metadata->>'classId'), ''), '') = '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_piano_attendance_business_key
ON piano.attendance (
  organization_id,
  customer_id,
  attendance_date,
  (piano.attendance_class_key(service_id, metadata))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_core_notifications_absence_event
ON core.notifications (organization_id, (metadata->>'eventKey'))
WHERE type = 'absence'
  AND COALESCE(metadata->>'eventKey', '') <> '';

DROP FUNCTION IF EXISTS core.update_attendance_status_with_pass(
  UUID, UUID, UUID, TEXT, DATE, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION piano.update_attendance_status_with_pass(
  p_organization_id UUID,
  p_attendance_id UUID,
  p_customer_id UUID,
  p_service_id TEXT,
  p_attendance_date DATE,
  p_new_status TEXT,
  p_apply_pass BOOLEAN DEFAULT true,
  p_student_name TEXT DEFAULT NULL,
  p_class_name TEXT DEFAULT NULL,
  p_created_by TEXT DEFAULT NULL,
  p_memo TEXT DEFAULT NULL,
  p_absent_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = piano, core, public
AS $$
DECLARE
  v_row piano.attendance%ROWTYPE;
  v_meta JSONB;
  v_pass_id UUID;
  v_pass_id_text TEXT;
  v_old_status TEXT;
  v_action TEXT := 'none';
  v_service_uuid UUID;
  v_class_id TEXT;
  v_class_key TEXT;
  v_sibling_pass TEXT;
  v_sibling_pass_id UUID;
  v_still_used BOOLEAN := false;
  v_pass_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_organization_id IS NULL OR p_customer_id IS NULL OR p_attendance_date IS NULL OR p_new_status IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_class_id := NULLIF(btrim(COALESCE(p_service_id, '')), '');
  BEGIN
    v_service_uuid := v_class_id::UUID;
  EXCEPTION
    WHEN invalid_text_representation THEN
      v_service_uuid := NULL;
  END;
  v_class_key := piano.attendance_class_key(
    v_service_uuid,
    jsonb_build_object('classId', COALESCE(v_class_id, 'c-default'))
  );

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      p_organization_id::text || E'\x1f' || p_customer_id::text || E'\x1f' || p_attendance_date::text,
      0
    )
  );

  PERFORM 1
  FROM piano.attendance a
  WHERE a.organization_id = p_organization_id
    AND a.customer_id = p_customer_id
    AND a.attendance_date = p_attendance_date
  FOR UPDATE;

  IF p_attendance_id IS NOT NULL THEN
    SELECT * INTO v_row
    FROM piano.attendance a
    WHERE a.id = p_attendance_id
    FOR UPDATE;
    IF FOUND AND v_row.organization_id IS DISTINCT FROM p_organization_id THEN
      RAISE EXCEPTION 'Organization mismatch';
    END IF;
    IF FOUND AND v_row.customer_id IS DISTINCT FROM p_customer_id THEN
      RAISE EXCEPTION 'Customer mismatch';
    END IF;
  END IF;

  IF v_row.id IS NULL THEN
    SELECT * INTO v_row
    FROM piano.attendance a
    WHERE a.organization_id = p_organization_id
      AND a.customer_id = p_customer_id
      AND a.attendance_date = p_attendance_date
      AND piano.attendance_class_key(a.service_id, a.metadata) = v_class_key
    FOR UPDATE
    LIMIT 1;
  END IF;

  v_old_status := CASE WHEN v_row.id IS NULL THEN NULL ELSE v_row.status::TEXT END;
  v_meta := COALESCE(v_row.metadata, '{}'::jsonb);
  v_pass_id_text := NULLIF(btrim(COALESCE(v_meta->>'sessionPassId', '')), '');
  IF v_pass_id_text IS NOT NULL THEN
    BEGIN
      v_pass_id := v_pass_id_text::UUID;
    EXCEPTION
      WHEN invalid_text_representation THEN
        v_pass_id := NULL;
    END;
  END IF;

  IF v_old_status IS NOT NULL AND v_old_status = p_new_status THEN
    RETURN jsonb_build_object(
      'action', 'idempotent',
      'attendance_id', v_row.id,
      'status', v_old_status,
      'session_pass_id', to_jsonb(v_pass_id)
    );
  END IF;

  SELECT NULLIF(btrim(COALESCE(s.metadata->>'sessionPassId', '')), '')
    INTO v_sibling_pass
  FROM piano.attendance s
  WHERE s.organization_id = p_organization_id
    AND s.customer_id = p_customer_id
    AND s.attendance_date = p_attendance_date
    AND (v_row.id IS NULL OR s.id <> v_row.id)
    AND s.status IN ('present', 'late', 'early_leave', 'make_up')
    AND NULLIF(btrim(COALESCE(s.metadata->>'sessionPassId', '')), '') IS NOT NULL
  LIMIT 1;

  IF v_sibling_pass IS NOT NULL THEN
    BEGIN
      v_sibling_pass_id := v_sibling_pass::UUID;
    EXCEPTION
      WHEN invalid_text_representation THEN
        v_sibling_pass_id := NULL;
    END;
  END IF;

  IF v_pass_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM piano.attendance s
      WHERE s.organization_id = p_organization_id
        AND s.customer_id = p_customer_id
        AND s.attendance_date = p_attendance_date
        AND (v_row.id IS NULL OR s.id <> v_row.id)
        AND s.status IN ('present', 'late', 'early_leave', 'make_up')
        AND COALESCE(s.metadata->>'sessionPassId', '') = v_pass_id::text
    ) INTO v_still_used;
  END IF;

  v_pass_result := core.apply_attendance_session_pass(
    p_organization_id,
    p_customer_id,
    p_new_status,
    v_old_status,
    p_apply_pass,
    v_pass_id,
    v_sibling_pass_id,
    COALESCE(v_still_used, false)
  );
  v_action := COALESCE(v_pass_result->>'action', 'none');
  IF v_pass_result ? 'session_pass_id'
     AND jsonb_typeof(v_pass_result->'session_pass_id') <> 'null' THEN
    v_pass_id := (v_pass_result->>'session_pass_id')::UUID;
    v_meta := jsonb_set(v_meta, '{sessionPassId}', to_jsonb(v_pass_id::text), true);
  ELSE
    v_meta := v_meta - 'sessionPassId';
    v_pass_id := NULL;
  END IF;

  v_meta := jsonb_set(v_meta, '{classId}', to_jsonb(v_class_key), true);
  IF p_student_name IS NOT NULL THEN
    v_meta := jsonb_set(v_meta, '{studentName}', to_jsonb(p_student_name), true);
  END IF;
  IF p_class_name IS NOT NULL THEN
    v_meta := jsonb_set(v_meta, '{className}', to_jsonb(p_class_name), true);
  END IF;

  IF v_row.id IS NULL THEN
    BEGIN
      INSERT INTO piano.attendance (
        id,
        organization_id,
        customer_id,
        service_id,
        attendance_date,
        status,
        absent_reason,
        make_up_required,
        memo,
        created_by,
        metadata
      ) VALUES (
        COALESCE(p_attendance_id, gen_random_uuid()),
        p_organization_id,
        p_customer_id,
        v_service_uuid,
        p_attendance_date,
        p_new_status::piano.attendance_status,
        p_absent_reason,
        (p_new_status = 'absent'),
        p_memo,
        p_created_by,
        v_meta
      )
      RETURNING * INTO v_row;
    EXCEPTION
      WHEN unique_violation THEN
        SELECT * INTO v_row
        FROM piano.attendance a
        WHERE a.organization_id = p_organization_id
          AND a.customer_id = p_customer_id
          AND a.attendance_date = p_attendance_date
          AND piano.attendance_class_key(a.service_id, a.metadata) = v_class_key
        FOR UPDATE;
        IF NOT FOUND THEN
          RAISE;
        END IF;
        IF v_row.status::text = p_new_status THEN
          RETURN jsonb_build_object(
            'action', 'idempotent',
            'attendance_id', v_row.id,
            'status', v_row.status,
            'session_pass_id', to_jsonb(NULLIF(btrim(COALESCE(v_row.metadata->>'sessionPassId', '')), ''))
          );
        END IF;
        UPDATE piano.attendance
        SET
          status = p_new_status::piano.attendance_status,
          absent_reason = p_absent_reason,
          make_up_required = CASE WHEN p_new_status = 'absent' THEN true ELSE make_up_required END,
          memo = p_memo,
          metadata = v_meta,
          updated_at = now()
        WHERE id = v_row.id
          AND organization_id = p_organization_id
        RETURNING * INTO v_row;
    END;
  ELSE
    UPDATE piano.attendance
    SET
      status = p_new_status::piano.attendance_status,
      absent_reason = p_absent_reason,
      make_up_required = CASE WHEN p_new_status = 'absent' THEN true ELSE make_up_required END,
      memo = p_memo,
      metadata = v_meta,
      updated_at = now()
    WHERE id = v_row.id
      AND organization_id = p_organization_id
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'action', v_action,
    'attendance_id', v_row.id,
    'status', v_row.status,
    'session_pass_id', to_jsonb(v_pass_id),
    'metadata', v_meta
  );
END;
$$;

COMMENT ON FUNCTION piano.update_attendance_status_with_pass(
  UUID, UUID, UUID, TEXT, DATE, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT
) IS
  'Piano 수업 출결 쓰기 + Core 이용권 차감. business key unique, sibling 재사용.';

REVOKE ALL ON FUNCTION piano.update_attendance_status_with_pass(
  UUID, UUID, UUID, TEXT, DATE, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION piano.update_attendance_status_with_pass(
  UUID, UUID, UUID, TEXT, DATE, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM anon;
GRANT EXECUTE ON FUNCTION piano.update_attendance_status_with_pass(
  UUID, UUID, UUID, TEXT, DATE, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;

CREATE OR REPLACE FUNCTION core.schedule_makeup(
  p_organization_id UUID,
  p_attendance_id UUID,
  p_makeup_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_room TEXT DEFAULT NULL,
  p_teacher_id TEXT DEFAULT NULL,
  p_teacher_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, piano, public
AS $$
DECLARE
  v_row piano.attendance%ROWTYPE;
  v_weekday TEXT;
  v_teacher TEXT;
  v_room TEXT;
  v_old_res UUID;
  v_room_id UUID;
  v_starts TIMESTAMPTZ;
  v_ends TIMESTAMPTZ;
  v_res_id UUID;
  v_meta JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_organization_id IS NULL OR p_attendance_id IS NULL OR p_makeup_date IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;
  IF p_start_time IS NULL OR p_end_time IS NULL OR p_start_time >= p_end_time THEN
    RAISE EXCEPTION 'MAKEUP_INVALID_TIME';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      p_organization_id::text || E'\x1fmakeup\x1f' || p_makeup_date::text,
      0
    )
  );

  SELECT * INTO v_row
  FROM piano.attendance a
  WHERE a.id = p_attendance_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MAKEUP_NOT_FOUND';
  END IF;
  IF v_row.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;
  IF v_row.status <> 'absent' THEN
    RAISE EXCEPTION 'MAKEUP_NOT_ABSENT';
  END IF;

  v_weekday := CASE EXTRACT(DOW FROM p_makeup_date)::int
    WHEN 0 THEN '일'
    WHEN 1 THEN '월'
    WHEN 2 THEN '화'
    WHEN 3 THEN '수'
    WHEN 4 THEN '목'
    WHEN 5 THEN '금'
    ELSE '토'
  END;
  v_teacher := NULLIF(btrim(COALESCE(p_teacher_id, '')), '');
  v_room := NULLIF(btrim(COALESCE(p_room, '')), '');
  v_meta := COALESCE(v_row.metadata, '{}'::jsonb);

  IF v_teacher IS NOT NULL AND EXISTS (
    SELECT 1
    FROM piano.attendance a
    WHERE a.organization_id = p_organization_id
      AND a.id <> p_attendance_id
      AND a.status = 'absent'
      AND a.make_up_date = p_makeup_date
      AND NULLIF(btrim(COALESCE(a.metadata->>'makeUpTeacherId', '')), '') = v_teacher
      AND NULLIF(btrim(COALESCE(a.metadata->>'makeUpStartTime', '')), '') IS NOT NULL
      AND NULLIF(btrim(COALESCE(a.metadata->>'makeUpEndTime', '')), '') IS NOT NULL
      AND (a.metadata->>'makeUpStartTime')::time < p_end_time
      AND p_start_time < (a.metadata->>'makeUpEndTime')::time
  ) THEN
    RAISE EXCEPTION 'MAKEUP_TEACHER_OVERLAP';
  END IF;

  IF v_teacher IS NOT NULL AND EXISTS (
    SELECT 1
    FROM core.services s
    WHERE s.organization_id = p_organization_id
      AND s.is_active
      AND NULLIF(btrim(COALESCE(s.metadata->>'teacherId', '')), '') = v_teacher
      AND jsonb_typeof(s.metadata->'daysOfWeek') = 'array'
      AND s.metadata->'daysOfWeek' ? v_weekday
      AND NULLIF(btrim(COALESCE(s.metadata->>'startTime', '')), '') IS NOT NULL
      AND NULLIF(btrim(COALESCE(s.metadata->>'endTime', '')), '') IS NOT NULL
      AND (s.metadata->>'startTime')::time < p_end_time
      AND p_start_time < (s.metadata->>'endTime')::time
  ) THEN
    RAISE EXCEPTION 'MAKEUP_TEACHER_OVERLAP';
  END IF;

  IF v_room IS NOT NULL AND EXISTS (
    SELECT 1
    FROM piano.attendance a
    WHERE a.organization_id = p_organization_id
      AND a.id <> p_attendance_id
      AND a.status = 'absent'
      AND a.make_up_date = p_makeup_date
      AND NULLIF(btrim(COALESCE(a.metadata->>'makeUpRoom', '')), '') = v_room
      AND NULLIF(btrim(COALESCE(a.metadata->>'makeUpStartTime', '')), '') IS NOT NULL
      AND NULLIF(btrim(COALESCE(a.metadata->>'makeUpEndTime', '')), '') IS NOT NULL
      AND (a.metadata->>'makeUpStartTime')::time < p_end_time
      AND p_start_time < (a.metadata->>'makeUpEndTime')::time
  ) THEN
    RAISE EXCEPTION 'MAKEUP_ROOM_OVERLAP';
  END IF;

  IF v_room IS NOT NULL AND EXISTS (
    SELECT 1
    FROM core.services s
    WHERE s.organization_id = p_organization_id
      AND s.is_active
      AND NULLIF(btrim(COALESCE(s.metadata->>'room', '')), '') = v_room
      AND jsonb_typeof(s.metadata->'daysOfWeek') = 'array'
      AND s.metadata->'daysOfWeek' ? v_weekday
      AND NULLIF(btrim(COALESCE(s.metadata->>'startTime', '')), '') IS NOT NULL
      AND NULLIF(btrim(COALESCE(s.metadata->>'endTime', '')), '') IS NOT NULL
      AND (s.metadata->>'startTime')::time < p_end_time
      AND p_start_time < (s.metadata->>'endTime')::time
  ) THEN
    RAISE EXCEPTION 'MAKEUP_ROOM_OVERLAP';
  END IF;

  BEGIN
    v_old_res := NULLIF(btrim(COALESCE(v_meta->>'makeupReservationId', '')), '')::UUID;
  EXCEPTION
    WHEN invalid_text_representation THEN
      v_old_res := NULL;
  END;

  IF v_old_res IS NOT NULL THEN
    UPDATE core.room_reservations
    SET status = 'cancelled', updated_at = now()
    WHERE id = v_old_res
      AND organization_id = p_organization_id
      AND status IN ('pending', 'approved');
    v_meta := v_meta - 'makeupReservationId';
  END IF;

  IF v_room IS NOT NULL THEN
    SELECT r.id INTO v_room_id
    FROM core.practice_rooms r
    WHERE r.organization_id = p_organization_id
      AND r.name = v_room
      AND r.is_active
    LIMIT 1;

    IF v_room_id IS NOT NULL THEN
      v_starts := core.timestamptz_from_business_local(
        p_makeup_date,
        p_start_time,
        core.resolve_location_timezone(p_organization_id)
      );
      v_ends := core.timestamptz_from_business_local(
        p_makeup_date,
        p_end_time,
        core.resolve_location_timezone(p_organization_id)
      );
      PERFORM core.assert_room_slot_allowed(v_room_id, v_starts, v_ends);
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
          p_organization_id,
          v_room_id,
          v_row.customer_id,
          auth.uid(),
          v_starts,
          v_ends,
          'approved',
          'makeup:' || v_row.id::text,
          auth.uid(),
          now()
        )
        RETURNING id INTO v_res_id;
      EXCEPTION
        WHEN exclusion_violation THEN
          RAISE EXCEPTION 'MAKEUP_ROOM_OVERLAP';
      END;
      v_meta := jsonb_set(v_meta, '{makeupReservationId}', to_jsonb(v_res_id::text), true);
    END IF;
  END IF;

  IF v_teacher IS NOT NULL THEN
    v_meta := jsonb_set(v_meta, '{makeUpTeacherId}', to_jsonb(v_teacher), true);
  ELSE
    v_meta := v_meta - 'makeUpTeacherId';
  END IF;
  IF p_teacher_name IS NOT NULL THEN
    v_meta := jsonb_set(v_meta, '{makeUpTeacherName}', to_jsonb(p_teacher_name), true);
  END IF;
  IF v_room IS NOT NULL THEN
    v_meta := jsonb_set(v_meta, '{makeUpRoom}', to_jsonb(v_room), true);
  ELSE
    v_meta := v_meta - 'makeUpRoom';
  END IF;
  v_meta := jsonb_set(v_meta, '{makeUpStartTime}', to_jsonb(to_char(p_start_time, 'HH24:MI')), true);
  v_meta := jsonb_set(v_meta, '{makeUpEndTime}', to_jsonb(to_char(p_end_time, 'HH24:MI')), true);

  UPDATE piano.attendance
  SET
    make_up_required = true,
    make_up_date = p_makeup_date,
    metadata = v_meta,
    updated_at = now()
  WHERE id = v_row.id
    AND organization_id = p_organization_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'attendance_id', v_row.id,
    'status', v_row.status,
    'make_up_date', v_row.make_up_date,
    'customer_id', v_row.customer_id,
    'service_id', v_row.service_id,
    'attendance_date', v_row.attendance_date,
    'absent_reason', v_row.absent_reason,
    'make_up_required', v_row.make_up_required,
    'memo', v_row.memo,
    'created_by', v_row.created_by,
    'created_at', v_row.created_at,
    'metadata', v_row.metadata
  );
END;
$$;

COMMENT ON FUNCTION core.schedule_makeup(UUID, UUID, DATE, TIME, TIME, TEXT, TEXT, TEXT) IS
  '보강 일정 원자 등록. 강사·연습실 겹침 금지, 취소된 보강 제외, practice room은 room_reservations EXCLUDE 재사용.';

REVOKE ALL ON FUNCTION core.schedule_makeup(UUID, UUID, DATE, TIME, TIME, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.schedule_makeup(UUID, UUID, DATE, TIME, TIME, TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION core.schedule_makeup(UUID, UUID, DATE, TIME, TIME, TEXT, TEXT, TEXT) TO authenticated;

COMMIT;
