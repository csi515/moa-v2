-- 사무용품 월별 취합: 카탈로그 + 캠페인(마감) + 신청 라인 + office_supply_request:manage
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. permission 키 반영
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
        OR (
          p_key = 'office_supply_request:manage'
          AND (
            COALESCE((r_org.permissions->>'office_supply_request:manage')::boolean, false)
            OR COALESCE((r_custom.permissions->>'office_supply_request:manage')::boolean, false)
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION core.can_manage_office_supply_request(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
  SELECT
    core.is_org_owner_or_admin(p_org)
    OR core.member_has_org_permission(p_org, 'office_supply_request:manage');
$$;

-- ---------------------------------------------------------------------------
-- 2. tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.office_supply_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '개',
  estimated_unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT office_supply_catalog_items_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT office_supply_catalog_items_price_nonneg CHECK (estimated_unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_office_supply_catalog_org_active
  ON core.office_supply_catalog_items (organization_id, is_active, sort_order);

CREATE TABLE IF NOT EXISTS core.office_supply_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  deadline_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  closed_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT office_supply_campaigns_ym_check CHECK (year_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT office_supply_campaigns_status_check CHECK (status IN ('open', 'closed')),
  CONSTRAINT office_supply_campaigns_org_ym_unique UNIQUE (organization_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_office_supply_campaigns_org_ym
  ON core.office_supply_campaigns (organization_id, year_month DESC);

CREATE TABLE IF NOT EXISTS core.office_supply_request_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES core.office_supply_campaigns(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES core.organization_members(id) ON DELETE CASCADE,
  department_id UUID REFERENCES core.departments(id) ON DELETE SET NULL,
  catalog_item_id UUID NOT NULL REFERENCES core.office_supply_catalog_items(id) ON DELETE RESTRICT,
  quantity NUMERIC(14, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT office_supply_request_lines_qty_pos CHECK (quantity > 0),
  CONSTRAINT office_supply_request_lines_unique
    UNIQUE (campaign_id, member_id, catalog_item_id)
);

CREATE INDEX IF NOT EXISTS idx_office_supply_lines_campaign
  ON core.office_supply_request_lines (campaign_id, department_id);

CREATE INDEX IF NOT EXISTS idx_office_supply_lines_member
  ON core.office_supply_request_lines (member_id, campaign_id);

-- ---------------------------------------------------------------------------
-- 3. helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.office_supply_campaign_is_writable(p_campaign core.office_supply_campaigns)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT p_campaign.status = 'open' AND now() < p_campaign.deadline_at;
$$;

CREATE OR REPLACE FUNCTION core.resolve_member_primary_department(
  p_organization_id uuid,
  p_member_id uuid
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
  SELECT dm.department_id
  FROM core.department_members dm
  JOIN core.departments d ON d.id = dm.department_id
  WHERE dm.member_id = p_member_id
    AND d.organization_id = p_organization_id
  ORDER BY d.depth ASC, d.name ASC
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE core.office_supply_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.office_supply_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.office_supply_request_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS office_supply_catalog_select ON core.office_supply_catalog_items;
CREATE POLICY office_supply_catalog_select ON core.office_supply_catalog_items
  FOR SELECT TO authenticated
  USING (
    core.is_org_member(organization_id)
    AND (
      is_active = true
      OR core.can_manage_office_supply_request(organization_id)
    )
  );

DROP POLICY IF EXISTS office_supply_catalog_manage ON core.office_supply_catalog_items;
CREATE POLICY office_supply_catalog_manage ON core.office_supply_catalog_items
  FOR ALL TO authenticated
  USING (core.can_manage_office_supply_request(organization_id))
  WITH CHECK (core.can_manage_office_supply_request(organization_id));

DROP POLICY IF EXISTS office_supply_campaigns_select ON core.office_supply_campaigns;
CREATE POLICY office_supply_campaigns_select ON core.office_supply_campaigns
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

DROP POLICY IF EXISTS office_supply_campaigns_manage ON core.office_supply_campaigns;
CREATE POLICY office_supply_campaigns_manage ON core.office_supply_campaigns
  FOR ALL TO authenticated
  USING (core.can_manage_office_supply_request(organization_id))
  WITH CHECK (core.can_manage_office_supply_request(organization_id));

DROP POLICY IF EXISTS office_supply_lines_select ON core.office_supply_request_lines;
CREATE POLICY office_supply_lines_select ON core.office_supply_request_lines
  FOR SELECT TO authenticated
  USING (
    core.is_org_member(organization_id)
    AND (
      core.can_manage_office_supply_request(organization_id)
      OR member_id IN (
        SELECT m.id FROM core.organization_members m
        WHERE m.organization_id = office_supply_request_lines.organization_id
          AND m.user_id = auth.uid()
          AND m.is_active = true
      )
    )
  );

DROP POLICY IF EXISTS office_supply_lines_no_direct_insert ON core.office_supply_request_lines;
CREATE POLICY office_supply_lines_no_direct_insert ON core.office_supply_request_lines
  FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS office_supply_lines_no_direct_update ON core.office_supply_request_lines;
CREATE POLICY office_supply_lines_no_direct_update ON core.office_supply_request_lines
  FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS office_supply_lines_no_direct_delete ON core.office_supply_request_lines;
CREATE POLICY office_supply_lines_no_direct_delete ON core.office_supply_request_lines
  FOR DELETE TO authenticated USING (false);

-- ---------------------------------------------------------------------------
-- 5. RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.upsert_office_supply_campaign(
  p_organization_id uuid,
  p_year_month text,
  p_deadline_at timestamptz,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_row core.office_supply_campaigns%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT core.can_manage_office_supply_request(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  IF p_year_month IS NULL OR p_year_month !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'year_month 형식이 올바르지 않습니다. (YYYY-MM)';
  END IF;
  IF p_deadline_at IS NULL THEN
    RAISE EXCEPTION '마감일시를 입력하세요.';
  END IF;

  INSERT INTO core.office_supply_campaigns (
    organization_id, year_month, deadline_at, status, note, updated_at
  ) VALUES (
    p_organization_id, p_year_month, p_deadline_at, 'open', NULLIF(trim(p_note), ''), now()
  )
  ON CONFLICT (organization_id, year_month) DO UPDATE SET
    deadline_at = EXCLUDED.deadline_at,
    note = COALESCE(EXCLUDED.note, core.office_supply_campaigns.note),
    -- 마감일만 갱신할 때 closed 상태는 유지. reopen은 별도 RPC.
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'organization_id', v_row.organization_id,
    'year_month', v_row.year_month,
    'deadline_at', v_row.deadline_at,
    'status', v_row.status,
    'closed_at', v_row.closed_at,
    'note', v_row.note
  );
END;
$$;

CREATE OR REPLACE FUNCTION core.close_office_supply_campaign(
  p_organization_id uuid,
  p_campaign_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_row core.office_supply_campaigns%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT core.can_manage_office_supply_request(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE core.office_supply_campaigns
  SET status = 'closed', closed_at = COALESCE(closed_at, now()), updated_at = now()
  WHERE id = p_campaign_id AND organization_id = p_organization_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION '캠페인을 찾을 수 없습니다.';
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status,
    'closed_at', v_row.closed_at,
    'deadline_at', v_row.deadline_at,
    'year_month', v_row.year_month
  );
END;
$$;

CREATE OR REPLACE FUNCTION core.reopen_office_supply_campaign(
  p_organization_id uuid,
  p_campaign_id uuid,
  p_deadline_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_row core.office_supply_campaigns%ROWTYPE;
  v_deadline timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT core.can_manage_office_supply_request(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM core.office_supply_campaigns
  WHERE id = p_campaign_id AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '캠페인을 찾을 수 없습니다.';
  END IF;

  v_deadline := COALESCE(p_deadline_at, v_row.deadline_at);
  IF v_deadline <= now() THEN
    RAISE EXCEPTION '재오픈하려면 미래 마감일시가 필요합니다.';
  END IF;

  UPDATE core.office_supply_campaigns
  SET status = 'open',
      deadline_at = v_deadline,
      closed_at = NULL,
      updated_at = now()
  WHERE id = p_campaign_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status,
    'closed_at', v_row.closed_at,
    'deadline_at', v_row.deadline_at,
    'year_month', v_row.year_month
  );
END;
$$;

CREATE OR REPLACE FUNCTION core.upsert_office_supply_request_lines(
  p_organization_id uuid,
  p_campaign_id uuid,
  p_lines jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_member_id uuid;
  v_dept_id uuid;
  v_campaign core.office_supply_campaigns%ROWTYPE;
  v_elem jsonb;
  v_item_id uuid;
  v_qty numeric;
  v_count int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT core.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' THEN
    RAISE EXCEPTION '신청 목록 형식이 올바르지 않습니다.';
  END IF;

  SELECT * INTO v_campaign
  FROM core.office_supply_campaigns
  WHERE id = p_campaign_id AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '캠페인을 찾을 수 없습니다.';
  END IF;

  IF NOT core.office_supply_campaign_is_writable(v_campaign) THEN
    RAISE EXCEPTION '신청이 마감되어 변경할 수 없습니다.';
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

  v_dept_id := core.resolve_member_primary_department(p_organization_id, v_member_id);

  -- 제출 목록으로 전체 교체
  DELETE FROM core.office_supply_request_lines
  WHERE organization_id = p_organization_id
    AND campaign_id = p_campaign_id
    AND member_id = v_member_id;

  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_item_id := NULLIF(v_elem->>'catalog_item_id', '')::uuid;
    v_qty := NULLIF(v_elem->>'quantity', '')::numeric;
    IF v_item_id IS NULL THEN
      CONTINUE;
    END IF;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM core.office_supply_catalog_items c
      WHERE c.id = v_item_id
        AND c.organization_id = p_organization_id
        AND c.is_active = true
    ) THEN
      RAISE EXCEPTION '구매 가능 목록에 없는 품목입니다.';
    END IF;

    INSERT INTO core.office_supply_request_lines (
      organization_id, campaign_id, member_id, department_id, catalog_item_id, quantity, updated_at
    ) VALUES (
      p_organization_id, p_campaign_id, v_member_id, v_dept_id, v_item_id, v_qty, now()
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'campaign_id', p_campaign_id,
    'member_id', v_member_id,
    'department_id', v_dept_id,
    'line_count', v_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION core.list_office_supply_dept_aggregate(
  p_organization_id uuid,
  p_campaign_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_campaign core.office_supply_campaigns%ROWTYPE;
  v_rows jsonb;
  v_totals jsonb;
  v_grand numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT core.can_manage_office_supply_request(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_campaign
  FROM core.office_supply_campaigns
  WHERE id = p_campaign_id AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '캠페인을 찾을 수 없습니다.';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.department_name, t.item_name), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      l.department_id,
      COALESCE(d.name, '(부서 미지정)') AS department_name,
      l.catalog_item_id,
      c.name AS item_name,
      c.unit,
      c.estimated_unit_price,
      SUM(l.quantity)::numeric AS total_quantity,
      (SUM(l.quantity) * c.estimated_unit_price)::numeric AS estimated_total
    FROM core.office_supply_request_lines l
    JOIN core.office_supply_catalog_items c ON c.id = l.catalog_item_id
    LEFT JOIN core.departments d ON d.id = l.department_id
    WHERE l.organization_id = p_organization_id
      AND l.campaign_id = p_campaign_id
    GROUP BY l.department_id, d.name, l.catalog_item_id, c.name, c.unit, c.estimated_unit_price
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.item_name), '[]'::jsonb),
         COALESCE(SUM(t.estimated_total), 0)
  INTO v_totals, v_grand
  FROM (
    SELECT
      l.catalog_item_id,
      c.name AS item_name,
      c.unit,
      c.estimated_unit_price,
      SUM(l.quantity)::numeric AS total_quantity,
      (SUM(l.quantity) * c.estimated_unit_price)::numeric AS estimated_total
    FROM core.office_supply_request_lines l
    JOIN core.office_supply_catalog_items c ON c.id = l.catalog_item_id
    WHERE l.organization_id = p_organization_id
      AND l.campaign_id = p_campaign_id
    GROUP BY l.catalog_item_id, c.name, c.unit, c.estimated_unit_price
  ) t;

  RETURN jsonb_build_object(
    'campaign', jsonb_build_object(
      'id', v_campaign.id,
      'year_month', v_campaign.year_month,
      'deadline_at', v_campaign.deadline_at,
      'status', v_campaign.status,
      'closed_at', v_campaign.closed_at,
      'note', v_campaign.note
    ),
    'by_department', v_rows,
    'by_item', v_totals,
    'grand_total_estimate', v_grand
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.can_manage_office_supply_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION core.upsert_office_supply_campaign(uuid, text, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION core.close_office_supply_campaign(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION core.reopen_office_supply_campaign(uuid, uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION core.upsert_office_supply_request_lines(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION core.list_office_supply_dept_aggregate(uuid, uuid) TO authenticated;

COMMIT;
