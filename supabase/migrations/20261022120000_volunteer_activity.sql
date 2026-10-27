-- 사내 봉사활동 게시·정원 마감 참여 + volunteer:manage 위임 권한
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. volunteer:manage 를 member_has_org_permission 에 반영
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
      )
  );
$$;

CREATE OR REPLACE FUNCTION core.can_manage_volunteer(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
  SELECT
    core.is_org_owner_or_admin(p_org)
    OR core.member_has_org_permission(p_org, 'volunteer:manage');
$$;

-- ---------------------------------------------------------------------------
-- 2. volunteer_activities
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.volunteer_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  activity_type VARCHAR(64) NOT NULL DEFAULT 'general',
  description TEXT,
  capacity INT NOT NULL,
  event_date DATE,
  status VARCHAR(16) NOT NULL DEFAULT 'open',
  created_by_member_id UUID REFERENCES core.organization_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT volunteer_activities_title_not_blank CHECK (length(btrim(title)) > 0),
  CONSTRAINT volunteer_activities_capacity_positive CHECK (capacity > 0),
  CONSTRAINT volunteer_activities_status_check CHECK (status IN ('open', 'closed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_volunteer_activities_org_status
  ON core.volunteer_activities (organization_id, status, event_date DESC NULLS LAST);

-- ---------------------------------------------------------------------------
-- 3. volunteer_signups
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.volunteer_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES core.volunteer_activities(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES core.organization_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT volunteer_signups_activity_member_unique UNIQUE (activity_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_volunteer_signups_activity
  ON core.volunteer_signups (activity_id, created_at);

CREATE INDEX IF NOT EXISTS idx_volunteer_signups_member
  ON core.volunteer_signups (organization_id, member_id);

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE core.volunteer_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.volunteer_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS volunteer_activities_select ON core.volunteer_activities;
CREATE POLICY volunteer_activities_select ON core.volunteer_activities
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

DROP POLICY IF EXISTS volunteer_activities_manage_write ON core.volunteer_activities;
CREATE POLICY volunteer_activities_manage_write ON core.volunteer_activities
  FOR ALL TO authenticated
  USING (core.can_manage_volunteer(organization_id))
  WITH CHECK (core.can_manage_volunteer(organization_id));

DROP POLICY IF EXISTS volunteer_signups_select ON core.volunteer_signups;
CREATE POLICY volunteer_signups_select ON core.volunteer_signups
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

-- signup 쓰기는 RPC만 (직접 INSERT/DELETE 차단)
DROP POLICY IF EXISTS volunteer_signups_no_direct_write ON core.volunteer_signups;
CREATE POLICY volunteer_signups_no_direct_write ON core.volunteer_signups
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS volunteer_signups_no_direct_update ON core.volunteer_signups;
CREATE POLICY volunteer_signups_no_direct_update ON core.volunteer_signups
  FOR UPDATE TO authenticated
  USING (false);

DROP POLICY IF EXISTS volunteer_signups_no_direct_delete ON core.volunteer_signups;
CREATE POLICY volunteer_signups_no_direct_delete ON core.volunteer_signups
  FOR DELETE TO authenticated
  USING (false);

-- ---------------------------------------------------------------------------
-- 5. join / cancel 원자 RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.join_volunteer_activity(p_activity_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_member_id UUID;
  v_org UUID;
  v_activity core.volunteer_activities%ROWTYPE;
  v_count INT;
  v_signup_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO v_activity
  FROM core.volunteer_activities
  WHERE id = p_activity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '봉사활동을 찾을 수 없습니다.' USING ERRCODE = 'P0002';
  END IF;

  v_org := v_activity.organization_id;

  IF NOT core.is_org_member(v_org) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  IF v_activity.status = 'cancelled' THEN
    RAISE EXCEPTION '취소된 봉사활동입니다.';
  END IF;

  IF v_activity.status = 'closed' THEN
    RAISE EXCEPTION '모집이 마감되었습니다.';
  END IF;

  SELECT m.id
    INTO v_member_id
  FROM core.organization_members m
  WHERE m.organization_id = v_org
    AND m.user_id = v_uid
    AND m.is_active = true
    AND m.deleted_at IS NULL
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION '소속 멤버십을 찾을 수 없습니다.' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM core.volunteer_signups s
    WHERE s.activity_id = p_activity_id AND s.member_id = v_member_id
  ) THEN
    RAISE EXCEPTION '이미 참여 신청한 봉사활동입니다.';
  END IF;

  SELECT COUNT(*)::INT INTO v_count
  FROM core.volunteer_signups
  WHERE activity_id = p_activity_id;

  IF v_count >= v_activity.capacity THEN
    UPDATE core.volunteer_activities
    SET status = 'closed', updated_at = now()
    WHERE id = p_activity_id AND status = 'open';
    RAISE EXCEPTION '모집 인원이 마감되었습니다.';
  END IF;

  INSERT INTO core.volunteer_signups (organization_id, activity_id, member_id)
  VALUES (v_org, p_activity_id, v_member_id)
  RETURNING id INTO v_signup_id;

  v_count := v_count + 1;
  IF v_count >= v_activity.capacity THEN
    UPDATE core.volunteer_activities
    SET status = 'closed', updated_at = now()
    WHERE id = p_activity_id;
  END IF;

  RETURN jsonb_build_object(
    'id', v_signup_id,
    'activity_id', p_activity_id,
    'member_id', v_member_id,
    'signup_count', v_count,
    'capacity', v_activity.capacity,
    'status', CASE WHEN v_count >= v_activity.capacity THEN 'closed' ELSE 'open' END
  );
END;
$$;

CREATE OR REPLACE FUNCTION core.cancel_volunteer_signup(p_activity_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_member_id UUID;
  v_org UUID;
  v_activity core.volunteer_activities%ROWTYPE;
  v_count INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO v_activity
  FROM core.volunteer_activities
  WHERE id = p_activity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '봉사활동을 찾을 수 없습니다.' USING ERRCODE = 'P0002';
  END IF;

  v_org := v_activity.organization_id;

  IF v_activity.status = 'cancelled' THEN
    RAISE EXCEPTION '취소된 봉사활동입니다.';
  END IF;

  -- 관리자는 마감 후에도 취소 허용하지 않음: open 또는 closed(정원 때문에 닫힌 경우)만
  IF v_activity.status NOT IN ('open', 'closed') THEN
    RAISE EXCEPTION '참여를 취소할 수 없는 상태입니다.';
  END IF;

  SELECT m.id
    INTO v_member_id
  FROM core.organization_members m
  WHERE m.organization_id = v_org
    AND m.user_id = v_uid
    AND m.is_active = true
    AND m.deleted_at IS NULL
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION '소속 멤버십을 찾을 수 없습니다.' USING ERRCODE = '42501';
  END IF;

  DELETE FROM core.volunteer_signups
  WHERE activity_id = p_activity_id
    AND member_id = v_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '참여 신청 내역이 없습니다.';
  END IF;

  SELECT COUNT(*)::INT INTO v_count
  FROM core.volunteer_signups
  WHERE activity_id = p_activity_id;

  IF v_activity.status = 'closed' AND v_count < v_activity.capacity THEN
    UPDATE core.volunteer_activities
    SET status = 'open', updated_at = now()
    WHERE id = p_activity_id;
  END IF;

  RETURN jsonb_build_object(
    'activity_id', p_activity_id,
    'member_id', v_member_id,
    'signup_count', v_count,
    'capacity', v_activity.capacity,
    'status', CASE
      WHEN v_count < v_activity.capacity THEN 'open'
      ELSE 'closed'
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.join_volunteer_activity(p_activity_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
BEGIN
  RETURN core.join_volunteer_activity(p_activity_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_volunteer_signup(p_activity_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
BEGIN
  RETURN core.cancel_volunteer_signup(p_activity_id);
END;
$$;

GRANT EXECUTE ON FUNCTION core.join_volunteer_activity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.cancel_volunteer_signup(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_volunteer_activity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_volunteer_signup(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.can_manage_volunteer(UUID) TO authenticated;

-- 총무/시설 관리자 템플릿에 volunteer:manage 시드 (기존 org)
UPDATE core.organization_roles
SET permissions = COALESCE(permissions, '{}'::jsonb) || '{"volunteer:manage": true}'::jsonb
WHERE name = '총무/시설 관리자'
  AND COALESCE((permissions->>'volunteer:manage')::boolean, false) = false;

COMMIT;
