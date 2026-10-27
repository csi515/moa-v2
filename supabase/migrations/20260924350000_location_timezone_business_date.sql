-- 이미 적용된 attendance 함수를 location timezone 기준으로 교체.
-- 계산 규칙은 core.business_date / resolve_location_timezone 한곳만 사용한다.

CREATE OR REPLACE FUNCTION core.default_business_timezone()
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'Asia/Seoul'::text;
$$;

CREATE OR REPLACE FUNCTION core.resolve_business_timezone(p_timezone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_tz TEXT := NULLIF(btrim(COALESCE(p_timezone, '')), '');
BEGIN
  IF v_tz IS NULL THEN
    RETURN core.default_business_timezone();
  END IF;
  PERFORM now() AT TIME ZONE v_tz;
  RETURN v_tz;
EXCEPTION
  WHEN invalid_parameter_value THEN
    RETURN core.default_business_timezone();
END;
$$;

CREATE OR REPLACE FUNCTION core.resolve_location_timezone(
  p_organization_id UUID,
  p_location_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_tz TEXT;
BEGIN
  IF to_regclass('core.locations') IS NULL THEN
    RETURN core.default_business_timezone();
  END IF;

  IF p_location_id IS NOT NULL AND p_organization_id IS NOT NULL THEN
    SELECT l.timezone INTO v_tz
    FROM core.locations l
    WHERE l.id = p_location_id
      AND l.organization_id = p_organization_id;
    IF FOUND THEN
      RETURN core.resolve_business_timezone(v_tz);
    END IF;
  END IF;

  IF p_organization_id IS NOT NULL THEN
    SELECT l.timezone INTO v_tz
    FROM core.locations l
    WHERE l.organization_id = p_organization_id
    ORDER BY (l.code = 'main') DESC, l.is_active DESC, l.created_at ASC
    LIMIT 1;
    IF FOUND THEN
      RETURN core.resolve_business_timezone(v_tz);
    END IF;
  END IF;

  RETURN core.default_business_timezone();
END;
$$;

CREATE OR REPLACE FUNCTION core.business_date(
  p_at TIMESTAMPTZ,
  p_timezone TEXT DEFAULT NULL
)
RETURNS DATE
LANGUAGE sql
STABLE
AS $$
  SELECT (p_at AT TIME ZONE core.resolve_business_timezone(p_timezone))::date;
$$;

CREATE OR REPLACE FUNCTION core.location_business_date(
  p_organization_id UUID,
  p_at TIMESTAMPTZ DEFAULT now(),
  p_location_id UUID DEFAULT NULL
)
RETURNS DATE
LANGUAGE sql
STABLE
AS $$
  SELECT core.business_date(
    p_at,
    core.resolve_location_timezone(p_organization_id, p_location_id)
  );
$$;

CREATE OR REPLACE FUNCTION core.business_time_text(
  p_at TIMESTAMPTZ,
  p_timezone TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT to_char(p_at AT TIME ZONE core.resolve_business_timezone(p_timezone), 'HH24:MI');
$$;

CREATE OR REPLACE FUNCTION core.timestamptz_from_business_local(
  p_date DATE,
  p_time TIME,
  p_timezone TEXT DEFAULT NULL
)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
AS $$
  SELECT (p_date::timestamp + p_time) AT TIME ZONE core.resolve_business_timezone(p_timezone);
$$;

GRANT EXECUTE ON FUNCTION core.default_business_timezone() TO authenticated;
GRANT EXECUTE ON FUNCTION core.resolve_business_timezone(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.resolve_location_timezone(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.business_date(TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.location_business_date(UUID, TIMESTAMPTZ, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.business_time_text(TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.timestamptz_from_business_local(DATE, TIME, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION core.toggle_check_in_by_pin(
  p_org_id UUID,
  p_pin TEXT,
  p_method core.check_in_method DEFAULT 'pin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_customer core.customers%ROWTYPE;
  v_session core.attendance_sessions%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_today DATE := core.location_business_date(p_org_id, v_now);
BEGIN
  IF NOT core.is_attendance_module_enabled(p_org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'module_disabled');
  END IF;

  IF p_pin IS NULL OR length(trim(p_pin)) < 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_pin');
  END IF;

  SELECT c.* INTO v_customer
  FROM core.customers c
  WHERE c.organization_id = p_org_id
    AND c.check_in_pin_hash IS NOT NULL
    AND c.check_in_pin_hash = core.hash_check_in_pin(p_org_id, c.id, trim(p_pin))
    AND c.status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_pin');
  END IF;

  SELECT s.* INTO v_session
  FROM core.attendance_sessions s
  WHERE s.organization_id = p_org_id
    AND s.customer_id = v_customer.id
    AND s.session_date = v_today
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO core.attendance_sessions (
      organization_id, customer_id, session_date, check_in_at, check_in_method
    ) VALUES (
      p_org_id, v_customer.id, v_today, v_now, p_method
    )
    RETURNING * INTO v_session;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'check_in',
      'customer_id', v_customer.id,
      'customer_name', v_customer.name,
      'at', v_now,
      'session_id', v_session.id
    );
  END IF;

  IF v_session.check_out_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_checked_out',
      'customer_name', v_customer.name
    );
  END IF;

  IF v_session.check_in_at IS NULL THEN
    UPDATE core.attendance_sessions
    SET check_in_at = v_now, check_in_method = p_method, updated_at = v_now
    WHERE id = v_session.id
    RETURNING * INTO v_session;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'check_in',
      'customer_id', v_customer.id,
      'customer_name', v_customer.name,
      'at', v_now,
      'session_id', v_session.id
    );
  END IF;

  UPDATE core.attendance_sessions
  SET check_out_at = v_now, check_out_method = p_method, updated_at = v_now
  WHERE id = v_session.id
  RETURNING * INTO v_session;

  RETURN jsonb_build_object(
    'success', true,
    'action', 'check_out',
    'customer_id', v_customer.id,
    'customer_name', v_customer.name,
    'at', v_now,
    'session_id', v_session.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION core.notify_attendance_session_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_industry TEXT;
  v_customer_name TEXT;
  v_action TEXT;
  v_action_label TEXT;
  v_title_suffix TEXT;
  v_title TEXT;
  v_message TEXT;
  v_at TIMESTAMPTZ;
  v_method TEXT;
BEGIN
  IF NOT core.is_attendance_module_enabled(NEW.organization_id) THEN
    RETURN NEW;
  END IF;

  SELECT o.industry_type INTO v_industry
  FROM core.organizations o
  WHERE o.id = NEW.organization_id;

  v_customer_name := COALESCE(
    NULLIF(trim(NEW.metadata->>'customerName'), ''),
    (SELECT c.name FROM core.customers c WHERE c.id = NEW.customer_id),
    '회원'
  );

  IF NEW.check_in_at IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.check_in_at IS DISTINCT FROM NEW.check_in_at) THEN
    v_action := 'check_in';
    v_at := NEW.check_in_at;
    v_method := COALESCE(NEW.check_in_method::TEXT, 'manual');

    SELECT l.action_label, l.title_suffix
    INTO v_action_label, v_title_suffix
    FROM core.attendance_action_labels(v_industry, v_action) l;

    v_title := v_customer_name || v_action_label || v_title_suffix;
    v_message := core.business_time_text(
        v_at,
        core.resolve_location_timezone(NEW.organization_id)
      )
      || ' ' || v_action_label || ' 처리되었습니다.';

    IF NOT EXISTS (
      SELECT 1
      FROM core.notifications n
      WHERE n.organization_id = NEW.organization_id
        AND n.type = 'attendance'
        AND n.target_id = NEW.customer_id
        AND n.metadata->>'sessionId' = NEW.id::TEXT
        AND n.metadata->>'action' = v_action
    ) THEN
      INSERT INTO core.notifications (
        organization_id, type, title, message,
        target_type, target_id, status, channel, sent_at, metadata
      ) VALUES (
        NEW.organization_id,
        'attendance',
        v_title,
        v_message,
        'customer',
        NEW.customer_id,
        'sent',
        'app',
        now(),
        jsonb_build_object(
          'sessionId', NEW.id,
          'action', v_action,
          'at', v_at,
          'customerName', v_customer_name,
          'method', v_method,
          'sessionDate', NEW.session_date
        )
      );
    END IF;
  END IF;

  IF NEW.check_out_at IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.check_out_at IS DISTINCT FROM NEW.check_out_at) THEN
    v_action := 'check_out';
    v_at := NEW.check_out_at;
    v_method := COALESCE(NEW.check_out_method::TEXT, 'manual');

    SELECT l.action_label, l.title_suffix
    INTO v_action_label, v_title_suffix
    FROM core.attendance_action_labels(v_industry, v_action) l;

    v_title := v_customer_name || v_action_label || v_title_suffix;
    v_message := core.business_time_text(
        v_at,
        core.resolve_location_timezone(NEW.organization_id)
      )
      || ' ' || v_action_label || ' 처리되었습니다.';

    IF NOT EXISTS (
      SELECT 1
      FROM core.notifications n
      WHERE n.organization_id = NEW.organization_id
        AND n.type = 'attendance'
        AND n.target_id = NEW.customer_id
        AND n.metadata->>'sessionId' = NEW.id::TEXT
        AND n.metadata->>'action' = v_action
    ) THEN
      INSERT INTO core.notifications (
        organization_id, type, title, message,
        target_type, target_id, status, channel, sent_at, metadata
      ) VALUES (
        NEW.organization_id,
        'attendance',
        v_title,
        v_message,
        'customer',
        NEW.customer_id,
        'sent',
        'app',
        now(),
        jsonb_build_object(
          'sessionId', NEW.id,
          'action', v_action,
          'at', v_at,
          'customerName', v_customer_name,
          'method', v_method,
          'sessionDate', NEW.session_date
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

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
