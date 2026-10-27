-- 사내 식수인원 조사: org 슬롯 설정 + 일별 응답 + meal_survey:manage
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. meal_survey:manage 를 member_has_org_permission 에 반영
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.member_has_org_permission(p_org uuid, p_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.organization_members m
    LEFT JOIN core.organization_roles r_org ON r_org.id = m.organization_role_id
    LEFT JOIN core.organization_roles r_custom ON r_custom.id = m.custom_role_id
    WHERE m.organization_id = p_org
      AND m.user_id = auth.uid()
      AND m.is_active = true
      AND (
        m.role = 'owner'
        OR COALESCE((r_org.permissions->>p_key)::boolean, false)
        OR COALESCE((r_custom.permissions->>p_key)::boolean, false)
        OR (
          p_key = 'grievances_manage'
          AND (
            COALESCE((r_org.permissions->>'feedbacks:read_all')::boolean, false)
            OR COALESCE((r_custom.permissions->>'feedbacks:read_all')::boolean, false)
          )
        )
        OR (
          p_key = 'resources_manage'
          AND (
            COALESCE((r_org.permissions->>'resources:manage')::boolean, false)
            OR COALESCE((r_custom.permissions->>'resources:manage')::boolean, false)
          )
        )
        OR (
          p_key = 'resources:manage'
          AND (
            COALESCE((r_org.permissions->>'resources_manage')::boolean, false)
            OR COALESCE((r_custom.permissions->>'resources_manage')::boolean, false)
          )
        )
        OR (
          p_key = 'feedbacks:read_all'
          AND (
            COALESCE((r_org.permissions->>'grievances_manage')::boolean, false)
            OR COALESCE((r_custom.permissions->>'grievances_manage')::boolean, false)
          )
        )
        OR (
          p_key IN ('shuttle:manage', 'shuttle:routes:manage', 'shuttle:dispatch:operate')
          AND (
            COALESCE((r_org.permissions->>'shuttle:manage')::boolean, false)
            OR COALESCE((r_custom.permissions->>'shuttle:manage')::boolean, false)
            OR COALESCE((r_org.permissions->>'shuttle:routes:manage')::boolean, false)
            OR COALESCE((r_custom.permissions->>'shuttle:routes:manage')::boolean, false)
            OR COALESCE((r_org.permissions->>'shuttle:dispatch:operate')::boolean, false)
            OR COALESCE((r_custom.permissions->>'shuttle:dispatch:operate')::boolean, false)
          )
        )
        OR (
          p_key = 'volunteer:manage'
          AND (
            COALESCE((r_org.permissions->>'volunteer:manage')::boolean, false)
            OR COALESCE((r_custom.permissions->>'volunteer:manage')::boolean, false)
          )
        )
        OR (
          p_key = 'meal_survey:manage'
          AND (
            COALESCE((r_org.permissions->>'meal_survey:manage')::boolean, false)
            OR COALESCE((r_custom.permissions->>'meal_survey:manage')::boolean, false)
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION core.can_manage_meal_survey(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
  SELECT
    core.is_org_owner_or_admin(p_org)
    OR core.member_has_org_permission(p_org, 'meal_survey:manage');
$$;

-- ---------------------------------------------------------------------------
-- 2. settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.meal_survey_settings (
  organization_id UUID PRIMARY KEY REFERENCES core.organizations(id) ON DELETE CASCADE,
  offer_breakfast BOOLEAN NOT NULL DEFAULT false,
  offer_lunch BOOLEAN NOT NULL DEFAULT true,
  offer_dinner BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT meal_survey_settings_at_least_one CHECK (
    offer_breakfast OR offer_lunch OR offer_dinner
  )
);

-- ---------------------------------------------------------------------------
-- 3. responses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.meal_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES core.organization_members(id) ON DELETE CASCADE,
  meal_date DATE NOT NULL,
  meal_slot VARCHAR(16) NOT NULL,
  status VARCHAR(16) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT meal_survey_responses_slot_check CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner')),
  CONSTRAINT meal_survey_responses_status_check CHECK (status IN ('eating', 'skipping')),
  CONSTRAINT meal_survey_responses_member_date_slot_unique UNIQUE (member_id, meal_date, meal_slot)
);

CREATE INDEX IF NOT EXISTS idx_meal_survey_responses_org_date
  ON core.meal_survey_responses (organization_id, meal_date, meal_slot);

CREATE INDEX IF NOT EXISTS idx_meal_survey_responses_member
  ON core.meal_survey_responses (member_id, meal_date);

-- ---------------------------------------------------------------------------
-- 4. helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.meal_slot_is_offered(p_org uuid, p_slot text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
DECLARE
  v_settings core.meal_survey_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_settings FROM core.meal_survey_settings WHERE organization_id = p_org;
  IF NOT FOUND THEN
    -- 기본: 중식만
    RETURN p_slot = 'lunch';
  END IF;
  IF p_slot = 'breakfast' THEN RETURN v_settings.offer_breakfast; END IF;
  IF p_slot = 'lunch' THEN RETURN v_settings.offer_lunch; END IF;
  IF p_slot = 'dinner' THEN RETURN v_settings.offer_dinner; END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION core.ensure_meal_survey_settings(p_org uuid)
RETURNS core.meal_survey_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_row core.meal_survey_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM core.meal_survey_settings WHERE organization_id = p_org;
  IF FOUND THEN
    RETURN v_row;
  END IF;
  INSERT INTO core.meal_survey_settings (organization_id, offer_breakfast, offer_lunch, offer_dinner)
  VALUES (p_org, false, true, false)
  ON CONFLICT (organization_id) DO NOTHING
  RETURNING * INTO v_row;
  IF NOT FOUND THEN
    SELECT * INTO v_row FROM core.meal_survey_settings WHERE organization_id = p_org;
  END IF;
  RETURN v_row;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE core.meal_survey_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.meal_survey_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS meal_survey_settings_select ON core.meal_survey_settings;
CREATE POLICY meal_survey_settings_select ON core.meal_survey_settings
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

DROP POLICY IF EXISTS meal_survey_settings_manage_write ON core.meal_survey_settings;
CREATE POLICY meal_survey_settings_manage_write ON core.meal_survey_settings
  FOR ALL TO authenticated
  USING (core.can_manage_meal_survey(organization_id))
  WITH CHECK (core.can_manage_meal_survey(organization_id));

DROP POLICY IF EXISTS meal_survey_responses_select ON core.meal_survey_responses;
CREATE POLICY meal_survey_responses_select ON core.meal_survey_responses
  FOR SELECT TO authenticated
  USING (
    core.is_org_member(organization_id)
    AND (
      core.can_manage_meal_survey(organization_id)
      OR member_id IN (
        SELECT m.id FROM core.organization_members m
        WHERE m.organization_id = meal_survey_responses.organization_id
          AND m.user_id = auth.uid()
          AND m.is_active = true
      )
    )
  );

-- 응답 쓰기는 RPC만
DROP POLICY IF EXISTS meal_survey_responses_no_direct_insert ON core.meal_survey_responses;
CREATE POLICY meal_survey_responses_no_direct_insert ON core.meal_survey_responses
  FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS meal_survey_responses_no_direct_update ON core.meal_survey_responses;
CREATE POLICY meal_survey_responses_no_direct_update ON core.meal_survey_responses
  FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS meal_survey_responses_no_direct_delete ON core.meal_survey_responses;
CREATE POLICY meal_survey_responses_no_direct_delete ON core.meal_survey_responses
  FOR DELETE TO authenticated USING (false);

-- ---------------------------------------------------------------------------
-- 6. RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.upsert_meal_survey_settings(
  p_organization_id uuid,
  p_offer_breakfast boolean,
  p_offer_lunch boolean,
  p_offer_dinner boolean
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
    organization_id, offer_breakfast, offer_lunch, offer_dinner, updated_at
  ) VALUES (
    p_organization_id,
    COALESCE(p_offer_breakfast, false),
    COALESCE(p_offer_lunch, false),
    COALESCE(p_offer_dinner, false),
    now()
  )
  ON CONFLICT (organization_id) DO UPDATE SET
    offer_breakfast = EXCLUDED.offer_breakfast,
    offer_lunch = EXCLUDED.offer_lunch,
    offer_dinner = EXCLUDED.offer_dinner,
    updated_at = now()
  RETURNING * INTO v_row;

  -- 꺼진 슬롯 응답 정리
  DELETE FROM core.meal_survey_responses r
  WHERE r.organization_id = p_organization_id
    AND (
      (r.meal_slot = 'breakfast' AND NOT v_row.offer_breakfast)
      OR (r.meal_slot = 'lunch' AND NOT v_row.offer_lunch)
      OR (r.meal_slot = 'dinner' AND NOT v_row.offer_dinner)
    );

  RETURN jsonb_build_object(
    'organization_id', v_row.organization_id,
    'offer_breakfast', v_row.offer_breakfast,
    'offer_lunch', v_row.offer_lunch,
    'offer_dinner', v_row.offer_dinner,
    'updated_at', v_row.updated_at
  );
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

CREATE OR REPLACE FUNCTION core.list_meal_survey_overview(
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
  v_settings core.meal_survey_settings%ROWTYPE;
  v_member_count int;
  v_days jsonb := '[]'::jsonb;
  v_members jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT core.can_manage_meal_survey(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN
    RAISE EXCEPTION '조회 기간이 올바르지 않습니다.';
  END IF;

  v_settings := core.ensure_meal_survey_settings(p_organization_id);

  SELECT COUNT(*)::int INTO v_member_count
  FROM core.organization_members m
  WHERE m.organization_id = p_organization_id
    AND m.is_active = true
    AND m.deleted_at IS NULL
    AND m.role IS DISTINCT FROM 'customer'
    AND m.role IS DISTINCT FROM 'parent'
    AND m.role IS DISTINCT FROM 'guardian';

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.meal_date, t.meal_slot), '[]'::jsonb)
  INTO v_days
  FROM (
    SELECT
      d.meal_date,
      s.meal_slot,
      COUNT(*) FILTER (WHERE r.status = 'eating')::int AS eating_count,
      COUNT(*) FILTER (WHERE r.status = 'skipping')::int AS skipping_count,
      GREATEST(
        0,
        v_member_count
          - COUNT(*) FILTER (WHERE r.status = 'eating')::int
          - COUNT(*) FILTER (WHERE r.status = 'skipping')::int
      ) AS unset_count
    FROM generate_series(p_from, p_to, interval '1 day') AS g(day)
    CROSS JOIN LATERAL (
      SELECT g.day::date AS meal_date
    ) d
    CROSS JOIN LATERAL (
      SELECT unnest(
        ARRAY[
          CASE WHEN v_settings.offer_breakfast THEN 'breakfast' END,
          CASE WHEN v_settings.offer_lunch THEN 'lunch' END,
          CASE WHEN v_settings.offer_dinner THEN 'dinner' END
        ]
      ) AS meal_slot
    ) s
    LEFT JOIN core.meal_survey_responses r
      ON r.organization_id = p_organization_id
     AND r.meal_date = d.meal_date
     AND r.meal_slot = s.meal_slot
    WHERE s.meal_slot IS NOT NULL
    GROUP BY d.meal_date, s.meal_slot
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.display_name, x.member_id), '[]'::jsonb)
  INTO v_members
  FROM (
    SELECT
      m.id AS member_id,
      COALESCE(
        NULLIF(trim(p.full_name), ''),
        NULLIF(trim(p.email), ''),
        left(m.user_id::text, 8)
      ) AS display_name,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'meal_date', r.meal_date,
              'meal_slot', r.meal_slot,
              'status', r.status
            )
            ORDER BY r.meal_date, r.meal_slot
          )
          FROM core.meal_survey_responses r
          WHERE r.organization_id = p_organization_id
            AND r.member_id = m.id
            AND r.meal_date BETWEEN p_from AND p_to
        ),
        '[]'::jsonb
      ) AS responses
    FROM core.organization_members m
    LEFT JOIN core.profiles p ON p.id = m.user_id
    WHERE m.organization_id = p_organization_id
      AND m.is_active = true
      AND m.deleted_at IS NULL
      AND m.role IS DISTINCT FROM 'customer'
      AND m.role IS DISTINCT FROM 'parent'
      AND m.role IS DISTINCT FROM 'guardian'
  ) x;

  RETURN jsonb_build_object(
    'settings', jsonb_build_object(
      'offer_breakfast', v_settings.offer_breakfast,
      'offer_lunch', v_settings.offer_lunch,
      'offer_dinner', v_settings.offer_dinner
    ),
    'member_count', v_member_count,
    'from', p_from,
    'to', p_to,
    'days', v_days,
    'members', v_members
  );
END;
$$;

-- public wrappers
CREATE OR REPLACE FUNCTION public.upsert_meal_survey_settings(
  p_organization_id uuid,
  p_offer_breakfast boolean,
  p_offer_lunch boolean,
  p_offer_dinner boolean
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = core, public, auth
AS $$ BEGIN RETURN core.upsert_meal_survey_settings(p_organization_id, p_offer_breakfast, p_offer_lunch, p_offer_dinner); END; $$;

CREATE OR REPLACE FUNCTION public.upsert_meal_survey_response(
  p_organization_id uuid,
  p_meal_date date,
  p_meal_slot text,
  p_status text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = core, public, auth
AS $$ BEGIN RETURN core.upsert_meal_survey_response(p_organization_id, p_meal_date, p_meal_slot, p_status); END; $$;

CREATE OR REPLACE FUNCTION public.clear_meal_survey_response(
  p_organization_id uuid,
  p_meal_date date,
  p_meal_slot text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = core, public, auth
AS $$ BEGIN RETURN core.clear_meal_survey_response(p_organization_id, p_meal_date, p_meal_slot); END; $$;

CREATE OR REPLACE FUNCTION public.list_meal_survey_overview(
  p_organization_id uuid,
  p_from date,
  p_to date
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = core, public, auth
AS $$ BEGIN RETURN core.list_meal_survey_overview(p_organization_id, p_from, p_to); END; $$;

CREATE OR REPLACE FUNCTION public.ensure_meal_survey_settings(p_org uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = core, public, auth
AS $$
DECLARE v core.meal_survey_settings%ROWTYPE;
BEGIN
  IF NOT core.is_org_member(p_org) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  v := core.ensure_meal_survey_settings(p_org);
  RETURN jsonb_build_object(
    'organization_id', v.organization_id,
    'offer_breakfast', v.offer_breakfast,
    'offer_lunch', v.offer_lunch,
    'offer_dinner', v.offer_dinner,
    'updated_at', v.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.can_manage_meal_survey(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION core.ensure_meal_survey_settings(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION core.upsert_meal_survey_settings(uuid, boolean, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION core.upsert_meal_survey_response(uuid, date, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION core.clear_meal_survey_response(uuid, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION core.list_meal_survey_overview(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_meal_survey_settings(uuid, boolean, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_meal_survey_response(uuid, date, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_meal_survey_response(uuid, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_meal_survey_overview(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_meal_survey_settings(uuid) TO authenticated;

UPDATE core.organization_roles
SET permissions = COALESCE(permissions, '{}'::jsonb) || '{"meal_survey:manage": true}'::jsonb
WHERE name = '총무/시설 관리자'
  AND COALESCE((permissions->>'meal_survey:manage')::boolean, false) = false;

COMMIT;
