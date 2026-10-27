-- Wave2: 식수 컷오프·기본식수 + 봉사 체크인
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. meal_survey_settings 확장
-- ---------------------------------------------------------------------------
ALTER TABLE core.meal_survey_settings
  ADD COLUMN IF NOT EXISTS default_eating BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS breakfast_cutoff_time TIME NOT NULL DEFAULT '17:00',
  ADD COLUMN IF NOT EXISTS breakfast_cutoff_prev_day BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lunch_cutoff_time TIME NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS lunch_cutoff_prev_day BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dinner_cutoff_time TIME NOT NULL DEFAULT '15:00',
  ADD COLUMN IF NOT EXISTS dinner_cutoff_prev_day BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION core.meal_survey_cutoff_at(
  p_meal_date date,
  p_cutoff_time time,
  p_prev_day boolean
)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (
    (CASE WHEN p_prev_day THEN p_meal_date - 1 ELSE p_meal_date END)
    + p_cutoff_time
  )::timestamp AT TIME ZONE;
$$;

CREATE OR REPLACE FUNCTION core.meal_survey_slot_writable(
  p_org uuid,
  p_meal_date date,
  p_meal_slot text,
  p_now timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
DECLARE
  v_settings core.meal_survey_settings%ROWTYPE;
  v_cutoff timestamptz;
BEGIN
  IF NOT core.meal_slot_is_offered(p_org, p_meal_slot) THEN
    RETURN false;
  END IF;
  SELECT * INTO v_settings FROM core.meal_survey_settings WHERE organization_id = p_org;
  IF NOT FOUND THEN
    -- 기본: 중식 당일 09:00
    IF p_meal_slot = 'lunch' THEN
      v_cutoff := core.meal_survey_cutoff_at(p_meal_date, '09:00'::time, false);
    ELSIF p_meal_slot = 'breakfast' THEN
      v_cutoff := core.meal_survey_cutoff_at(p_meal_date, '17:00'::time, true);
    ELSE
      v_cutoff := core.meal_survey_cutoff_at(p_meal_date, '15:00'::time, false);
    END IF;
  ELSE
    IF p_meal_slot = 'breakfast' THEN
      v_cutoff := core.meal_survey_cutoff_at(
        p_meal_date, v_settings.breakfast_cutoff_time, v_settings.breakfast_cutoff_prev_day
      );
    ELSIF p_meal_slot = 'lunch' THEN
      v_cutoff := core.meal_survey_cutoff_at(
        p_meal_date, v_settings.lunch_cutoff_time, v_settings.lunch_cutoff_prev_day
      );
    ELSE
      v_cutoff := core.meal_survey_cutoff_at(
        p_meal_date, v_settings.dinner_cutoff_time, v_settings.dinner_cutoff_prev_day
      );
    END IF;
  END IF;
  RETURN p_now < v_cutoff;
END;
$$;

CREATE OR REPLACE FUNCTION core.upsert_meal_survey_settings(
  p_organization_id uuid,
  p_offer_breakfast boolean,
  p_offer_lunch boolean,
  p_offer_dinner boolean,
  p_default_eating boolean DEFAULT true,
  p_breakfast_cutoff_time time DEFAULT '17:00',
  p_breakfast_cutoff_prev_day boolean DEFAULT true,
  p_lunch_cutoff_time time DEFAULT '09:00',
  p_lunch_cutoff_prev_day boolean DEFAULT false,
  p_dinner_cutoff_time time DEFAULT '15:00',
  p_dinner_cutoff_prev_day boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_row core.meal_survey_settings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT core.can_manage_meal_survey(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  IF NOT (COALESCE(p_offer_breakfast, false) OR COALESCE(p_offer_lunch, false) OR COALESCE(p_offer_dinner, false)) THEN
    RAISE EXCEPTION '조식·중식·석식 중 최소 하나는 제공해야 합니다.';
  END IF;

  INSERT INTO core.meal_survey_settings (
    organization_id, offer_breakfast, offer_lunch, offer_dinner,
    default_eating,
    breakfast_cutoff_time, breakfast_cutoff_prev_day,
    lunch_cutoff_time, lunch_cutoff_prev_day,
    dinner_cutoff_time, dinner_cutoff_prev_day,
    updated_at
  ) VALUES (
    p_organization_id,
    COALESCE(p_offer_breakfast, false),
    COALESCE(p_offer_lunch, false),
    COALESCE(p_offer_dinner, false),
    COALESCE(p_default_eating, true),
    COALESCE(p_breakfast_cutoff_time, '17:00'::time),
    COALESCE(p_breakfast_cutoff_prev_day, true),
    COALESCE(p_lunch_cutoff_time, '09:00'::time),
    COALESCE(p_lunch_cutoff_prev_day, false),
    COALESCE(p_dinner_cutoff_time, '15:00'::time),
    COALESCE(p_dinner_cutoff_prev_day, false),
    now()
  )
  ON CONFLICT (organization_id) DO UPDATE SET
    offer_breakfast = EXCLUDED.offer_breakfast,
    offer_lunch = EXCLUDED.offer_lunch,
    offer_dinner = EXCLUDED.offer_dinner,
    default_eating = EXCLUDED.default_eating,
    breakfast_cutoff_time = EXCLUDED.breakfast_cutoff_time,
    breakfast_cutoff_prev_day = EXCLUDED.breakfast_cutoff_prev_day,
    lunch_cutoff_time = EXCLUDED.lunch_cutoff_time,
    lunch_cutoff_prev_day = EXCLUDED.lunch_cutoff_prev_day,
    dinner_cutoff_time = EXCLUDED.dinner_cutoff_time,
    dinner_cutoff_prev_day = EXCLUDED.dinner_cutoff_prev_day,
    updated_at = now()
  RETURNING * INTO v_row;

  DELETE FROM core.meal_survey_responses r
  WHERE r.organization_id = p_organization_id
    AND (
      (r.meal_slot = 'breakfast' AND NOT v_row.offer_breakfast)
      OR (r.meal_slot = 'lunch' AND NOT v_row.offer_lunch)
      OR (r.meal_slot = 'dinner' AND NOT v_row.offer_dinner)
    );

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION core.upsert_meal_survey_response(
  p_organization_id uuid,
  p_meal_date date,
  p_meal_slot text,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_member_id uuid;
  v_row core.meal_survey_responses%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT core.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  IF p_meal_slot NOT IN ('breakfast', 'lunch', 'dinner') THEN
    RAISE EXCEPTION '잘못된 식사 구분입니다.';
  END IF;
  IF p_status NOT IN ('eating', 'skipping') THEN
    RAISE EXCEPTION '잘못된 상태입니다.';
  END IF;
  IF NOT core.meal_slot_is_offered(p_organization_id, p_meal_slot) THEN
    RAISE EXCEPTION '해당 식사는 제공하지 않습니다.';
  END IF;
  IF NOT core.meal_survey_slot_writable(p_organization_id, p_meal_date, p_meal_slot, now()) THEN
    RAISE EXCEPTION '식수 신청이 마감되어 변경할 수 없습니다.';
  END IF;

  SELECT m.id INTO v_member_id
  FROM core.organization_members m
  WHERE m.organization_id = p_organization_id
    AND m.user_id = auth.uid()
    AND m.is_active = true
    AND m.deleted_at IS NULL
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION '소속 멤버십을 찾을 수 없습니다.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO core.meal_survey_responses (
    organization_id, member_id, meal_date, meal_slot, status, updated_at
  ) VALUES (
    p_organization_id, v_member_id, p_meal_date, p_meal_slot, p_status, now()
  )
  ON CONFLICT (member_id, meal_date, meal_slot) DO UPDATE SET
    status = EXCLUDED.status,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'organization_id', v_row.organization_id,
    'member_id', v_row.member_id,
    'meal_date', v_row.meal_date,
    'meal_slot', v_row.meal_slot,
    'status', v_row.status
  );
END;
$$;

CREATE OR REPLACE FUNCTION core.clear_meal_survey_response(
  p_organization_id uuid,
  p_meal_date date,
  p_meal_slot text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_member_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT core.meal_survey_slot_writable(p_organization_id, p_meal_date, p_meal_slot, now()) THEN
    RAISE EXCEPTION '식수 신청이 마감되어 변경할 수 없습니다.';
  END IF;

  SELECT m.id INTO v_member_id
  FROM core.organization_members m
  WHERE m.organization_id = p_organization_id
    AND m.user_id = auth.uid()
    AND m.is_active = true
    AND m.deleted_at IS NULL
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION '소속 멤버십을 찾을 수 없습니다.' USING ERRCODE = '42501';
  END IF;

  DELETE FROM core.meal_survey_responses
  WHERE organization_id = p_organization_id
    AND member_id = v_member_id
    AND meal_date = p_meal_date
    AND meal_slot = p_meal_slot;

  RETURN jsonb_build_object(
    'cleared', true,
    'meal_date', p_meal_date,
    'meal_slot', p_meal_slot
  );
END;
$$;

CREATE OR REPLACE FUNCTION core.bulk_skip_meal_survey_range(
  p_organization_id uuid,
  p_from date,
  p_to date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_member_id uuid;
  v_day date;
  v_slot text;
  v_count int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN
    RAISE EXCEPTION '기간이 올바르지 않습니다.';
  END IF;

  SELECT m.id INTO v_member_id
  FROM core.organization_members m
  WHERE m.organization_id = p_organization_id
    AND m.user_id = auth.uid()
    AND m.is_active = true
    AND m.deleted_at IS NULL
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION '소속 멤버십을 찾을 수 없습니다.' USING ERRCODE = '42501';
  END IF;

  FOR v_day IN SELECT generate_series(p_from, p_to, interval '1 day')::date
  LOOP
    FOREACH v_slot IN ARRAY ARRAY['breakfast', 'lunch', 'dinner']
    LOOP
      IF core.meal_slot_is_offered(p_organization_id, v_slot)
         AND core.meal_survey_slot_writable(p_organization_id, v_day, v_slot, now()) THEN
        INSERT INTO core.meal_survey_responses (
          organization_id, member_id, meal_date, meal_slot, status, updated_at
        ) VALUES (
          p_organization_id, v_member_id, v_day, v_slot, 'skipping', now()
        )
        ON CONFLICT (member_id, meal_date, meal_slot) DO UPDATE SET
          status = 'skipping',
          updated_at = now();
        v_count := v_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('skipped_cells', v_count, 'from', p_from, 'to', p_to);
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. volunteer check-in
-- ---------------------------------------------------------------------------
ALTER TABLE core.volunteer_signups
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION core.set_volunteer_signup_checkin(
  p_organization_id uuid,
  p_activity_id uuid,
  p_member_id uuid,
  p_checked_in boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_row core.volunteer_signups%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT core.can_manage_volunteer(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE core.volunteer_signups
  SET checked_in_at = CASE WHEN p_checked_in THEN COALESCE(checked_in_at, now()) ELSE NULL END
  WHERE organization_id = p_organization_id
    AND activity_id = p_activity_id
    AND member_id = p_member_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION '신청 내역을 찾을 수 없습니다.';
  END IF;

  RETURN jsonb_build_object(
    'activity_id', v_row.activity_id,
    'member_id', v_row.member_id,
    'checked_in_at', v_row.checked_in_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.meal_survey_slot_writable(uuid, date, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION core.bulk_skip_meal_survey_range(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION core.set_volunteer_signup_checkin(uuid, uuid, uuid, boolean) TO authenticated;

COMMIT;
