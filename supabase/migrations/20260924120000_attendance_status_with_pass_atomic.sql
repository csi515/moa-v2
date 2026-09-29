-- Core: generic session pass consume/refund.
-- Piano: class attendance 행 쓰기. Core는 piano 스키마를 모른다.

BEGIN;

CREATE OR REPLACE FUNCTION core.apply_attendance_session_pass(
  p_organization_id UUID,
  p_customer_id UUID,
  p_new_status TEXT,
  p_old_status TEXT DEFAULT NULL,
  p_apply_pass BOOLEAN DEFAULT true,
  p_current_pass_id UUID DEFAULT NULL,
  p_sibling_pass_id UUID DEFAULT NULL,
  p_sibling_still_uses_pass BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_pass core.session_passes%ROWTYPE;
  v_pass_id UUID := p_current_pass_id;
  v_action TEXT := 'none';
  v_next_counted BOOLEAN;
  v_prev_counted BOOLEAN;
  v_pass_consumable BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_organization_id IS NULL OR p_customer_id IS NULL OR p_new_status IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM core.customers c
    WHERE c.id = p_customer_id AND c.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Customer not found in organization';
  END IF;

  IF p_old_status IS NOT NULL AND p_old_status = p_new_status THEN
    RETURN jsonb_build_object(
      'action', 'idempotent',
      'session_pass_id', to_jsonb(v_pass_id)
    );
  END IF;

  v_next_counted := p_new_status IN ('present', 'late', 'early_leave', 'make_up');
  v_prev_counted := COALESCE(p_old_status, '') IN ('present', 'late', 'early_leave', 'make_up');

  IF NOT COALESCE(p_apply_pass, true) THEN
    RETURN jsonb_build_object('action', 'none', 'session_pass_id', to_jsonb(v_pass_id));
  END IF;

  IF (NOT v_prev_counted) AND v_next_counted THEN
    IF p_sibling_pass_id IS NOT NULL THEN
      v_pass_id := p_sibling_pass_id;
      v_action := 'reuse';
    ELSE
      SELECT * INTO v_pass
      FROM core.session_passes sp
      WHERE sp.organization_id = p_organization_id
        AND sp.customer_id = p_customer_id
        AND sp.status = 'active'
        AND sp.used_sessions < sp.total_sessions
        AND (sp.expires_at IS NULL OR sp.expires_at >= now())
      ORDER BY sp.expires_at ASC NULLS LAST,
               (sp.total_sessions - sp.used_sessions) ASC,
               sp.purchased_at ASC
      LIMIT 1
      FOR UPDATE;

      v_pass_consumable :=
        FOUND
        AND v_pass.status = 'active'
        AND v_pass.used_sessions < v_pass.total_sessions
        AND (v_pass.expires_at IS NULL OR v_pass.expires_at >= now());

      IF NOT v_pass_consumable THEN
        RAISE EXCEPTION 'Insufficient session pass';
      END IF;

      UPDATE core.session_passes
      SET
        used_sessions = v_pass.used_sessions + 1,
        status = CASE
          WHEN v_pass.used_sessions + 1 >= v_pass.total_sessions THEN 'exhausted'
          ELSE 'active'
        END,
        updated_at = now()
      WHERE id = v_pass.id
        AND organization_id = p_organization_id
        AND status = 'active'
        AND used_sessions < total_sessions
        AND (expires_at IS NULL OR expires_at >= now());

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient session pass';
      END IF;

      v_pass_id := v_pass.id;
      v_action := 'consume';
    END IF;

  ELSIF v_prev_counted AND NOT v_next_counted AND v_pass_id IS NOT NULL THEN
    IF COALESCE(p_sibling_still_uses_pass, false) THEN
      v_pass_id := NULL;
      v_action := 'keep';
    ELSE
      SELECT * INTO v_pass
      FROM core.session_passes sp
      WHERE sp.id = v_pass_id
        AND sp.organization_id = p_organization_id
      FOR UPDATE;

      IF NOT FOUND OR v_pass.status = 'cancelled' THEN
        RAISE EXCEPTION 'Session pass refund failed';
      END IF;

      UPDATE core.session_passes
      SET
        used_sessions = GREATEST(0, v_pass.used_sessions - 1),
        status = CASE
          WHEN GREATEST(0, v_pass.used_sessions - 1) >= v_pass.total_sessions THEN 'exhausted'
          ELSE 'active'
        END,
        updated_at = now()
      WHERE id = v_pass.id
        AND organization_id = p_organization_id
        AND status <> 'cancelled';

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Session pass refund failed';
      END IF;

      v_pass_id := NULL;
      v_action := 'refund';
    END IF;
  ELSE
    v_action := 'none';
  END IF;

  RETURN jsonb_build_object(
    'action', v_action,
    'session_pass_id', to_jsonb(v_pass_id)
  );
END;
$$;

COMMENT ON FUNCTION core.apply_attendance_session_pass(UUID, UUID, TEXT, TEXT, BOOLEAN, UUID, UUID, BOOLEAN) IS
  '출결 상태 전이에 따른 이용권 차감/복구. 출결 행은 industry 계층이 담당.';

REVOKE ALL ON FUNCTION core.apply_attendance_session_pass(UUID, UUID, TEXT, TEXT, BOOLEAN, UUID, UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.apply_attendance_session_pass(UUID, UUID, TEXT, TEXT, BOOLEAN, UUID, UUID, BOOLEAN) FROM anon, authenticated;

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
      AND (
        (v_service_uuid IS NOT NULL AND a.service_id = v_service_uuid)
        OR (v_service_uuid IS NULL AND COALESCE(a.metadata->>'classId', '') = COALESCE(v_class_id, ''))
      )
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

  IF v_class_id IS NOT NULL THEN
    v_meta := jsonb_set(v_meta, '{classId}', to_jsonb(v_class_id), true);
  END IF;
  IF p_student_name IS NOT NULL THEN
    v_meta := jsonb_set(v_meta, '{studentName}', to_jsonb(p_student_name), true);
  END IF;
  IF p_class_name IS NOT NULL THEN
    v_meta := jsonb_set(v_meta, '{className}', to_jsonb(p_class_name), true);
  END IF;

  IF v_row.id IS NULL THEN
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
  'Piano 수업 출결 쓰기 + Core 이용권 차감. 한 트랜잭션.';

REVOKE ALL ON FUNCTION piano.update_attendance_status_with_pass(
  UUID, UUID, UUID, TEXT, DATE, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION piano.update_attendance_status_with_pass(
  UUID, UUID, UUID, TEXT, DATE, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM anon;
GRANT EXECUTE ON FUNCTION piano.update_attendance_status_with_pass(
  UUID, UUID, UUID, TEXT, DATE, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;

COMMIT;
