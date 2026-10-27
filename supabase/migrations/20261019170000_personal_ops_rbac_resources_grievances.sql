-- resources_manage / grievances_manage 권한, 차량 자원 쓰기 강화, 기명 건의 테이블

BEGIN;

-- organization_roles 기본 JSON에 신규 키 문서화 (기존 행은 COALESCE false)
COMMENT ON COLUMN core.organization_roles.permissions IS
  'boolean map: billing_invoices, attendance, booking, passes, statistics, members_manage, policies, resources_manage, grievances_manage';

-- ---------------------------------------------------------------------------
-- bookable_resources: 총무(resources_manage) 또는 사업주/관리자만 쓰기
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS bookable_resources_staff_write ON core.bookable_resources;
CREATE POLICY bookable_resources_staff_write ON core.bookable_resources
  FOR ALL TO authenticated
  USING (
    core.is_org_owner_or_admin(organization_id)
    OR core.member_has_org_permission(organization_id, 'resources_manage')
  )
  WITH CHECK (
    core.is_org_owner_or_admin(organization_id)
    OR core.member_has_org_permission(organization_id, 'resources_manage')
  );

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
  IF NOT (
    core.is_org_owner_or_admin(p_org_id)
    OR core.member_has_org_permission(p_org_id, 'resources_manage')
  ) THEN
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

CREATE OR REPLACE FUNCTION core.set_bookable_resource_active(
  p_org_id UUID,
  p_id UUID,
  p_active BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT (
    core.is_org_owner_or_admin(p_org_id)
    OR core.member_has_org_permission(p_org_id, 'resources_manage')
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE core.bookable_resources
  SET is_active = p_active, updated_at = now()
  WHERE id = p_id
    AND organization_id = p_org_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Resource not found in organization';
  END IF;

  UPDATE core.practice_rooms
  SET is_active = p_active, updated_at = now()
  WHERE id = p_id
    AND organization_id = p_org_id;

  RETURN true;
END;
$$;

-- ---------------------------------------------------------------------------
-- 노경·고충 건의 (기명 + 익명)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.anonymous_grievances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  author_user_id uuid,
  visibility text NOT NULL DEFAULT 'named' CHECK (visibility IN ('named', 'anonymous')),
  ticket_code text NOT NULL,
  access_pin_hash text,
  category text NOT NULL DEFAULT 'GENERAL_GRIEVANCE',
  subject_title text NOT NULL,
  incident_content text NOT NULL,
  evidence_attached boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'SUBMITTED'
    CHECK (status IN ('SUBMITTED', 'UNDER_INVESTIGATION', 'RESOLVED', 'DISMISSED')),
  investigation_feedback text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT anonymous_grievances_ticket_unique UNIQUE (organization_id, ticket_code)
);

CREATE INDEX IF NOT EXISTS idx_anonymous_grievances_org_submitted
  ON core.anonymous_grievances (organization_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_anonymous_grievances_author
  ON core.anonymous_grievances (organization_id, author_user_id);

ALTER TABLE core.anonymous_grievances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anonymous_grievances_select ON core.anonymous_grievances;
CREATE POLICY anonymous_grievances_select ON core.anonymous_grievances
  FOR SELECT TO authenticated
  USING (
    core.is_org_member(organization_id)
    AND (
      core.is_org_owner_or_admin(organization_id)
      OR core.member_has_org_permission(organization_id, 'grievances_manage')
      OR author_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS anonymous_grievances_insert ON core.anonymous_grievances;
CREATE POLICY anonymous_grievances_insert ON core.anonymous_grievances
  FOR INSERT TO authenticated
  WITH CHECK (
    core.is_org_member(organization_id)
    AND (
      (visibility = 'named' AND author_user_id = auth.uid())
      OR (visibility = 'anonymous' AND author_user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS anonymous_grievances_update ON core.anonymous_grievances;
CREATE POLICY anonymous_grievances_update ON core.anonymous_grievances
  FOR UPDATE TO authenticated
  USING (
    core.is_org_owner_or_admin(organization_id)
    OR core.member_has_org_permission(organization_id, 'grievances_manage')
  )
  WITH CHECK (
    core.is_org_owner_or_admin(organization_id)
    OR core.member_has_org_permission(organization_id, 'grievances_manage')
  );

GRANT SELECT, INSERT, UPDATE ON core.anonymous_grievances TO authenticated;

COMMIT;
