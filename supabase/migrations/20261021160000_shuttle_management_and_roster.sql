-- 사내 통근 셔틀: 노선·정류장(승하차시간) 마스터 및 고정 탑승 명부
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. shuttle:manage 위임 권한 alias (member_has_org_permission)
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
            OR COALESCE((r_custom.permissions->>'resources:manage')::boolean, false)
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
          p_key = 'shuttle:routes:manage'
          AND (
            COALESCE((r_org.permissions->>'shuttle:manage')::boolean, false)
            OR COALESCE((r_custom.permissions->>'shuttle:manage')::boolean, false)
          )
        )
        OR (
          p_key = 'shuttle:dispatch:operate'
          AND (
            COALESCE((r_org.permissions->>'shuttle:manage')::boolean, false)
            OR COALESCE((r_custom.permissions->>'shuttle:manage')::boolean, false)
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION core.can_manage_shuttle(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
  SELECT
    core.is_org_owner_or_admin(p_org)
    OR core.member_has_org_permission(p_org, 'shuttle:manage');
$$;

-- ---------------------------------------------------------------------------
-- 2. 노선 마스터
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.shuttle_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name VARCHAR(64) NOT NULL,
  direction VARCHAR(16) NOT NULL DEFAULT 'FROM_WORK',
  departure_time TIME NOT NULL,
  capacity INT NOT NULL DEFAULT 45,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shuttle_routes_direction_check CHECK (direction IN ('TO_WORK', 'FROM_WORK')),
  CONSTRAINT shuttle_routes_capacity_positive CHECK (capacity > 0),
  CONSTRAINT shuttle_routes_name_not_blank CHECK (length(btrim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_shuttle_routes_tenant
  ON core.shuttle_routes (tenant_id, is_active, departure_time);

-- ---------------------------------------------------------------------------
-- 3. 정류장
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.shuttle_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES core.shuttle_routes(id) ON DELETE CASCADE,
  stop_order INT NOT NULL,
  stop_name VARCHAR(64) NOT NULL,
  pickup_time TIME,
  dropoff_time TIME,
  pickup_location_detail TEXT,
  is_pickup BOOLEAN NOT NULL DEFAULT true,
  is_dropoff BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT shuttle_stops_route_order_unique UNIQUE (route_id, stop_order),
  CONSTRAINT shuttle_stops_name_not_blank CHECK (length(btrim(stop_name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_shuttle_stops_route
  ON core.shuttle_stops (route_id, stop_order);

-- ---------------------------------------------------------------------------
-- 4. 고정 탑승 등록부 (사원당 1행)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.shuttle_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES core.organization_members(id) ON DELETE CASCADE,
  route_id UUID REFERENCES core.shuttle_routes(id) ON DELETE SET NULL,
  pickup_stop_id UUID REFERENCES core.shuttle_stops(id) ON DELETE SET NULL,
  dropoff_stop_id UUID REFERENCES core.shuttle_stops(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shuttle_registrations_tenant_member_unique UNIQUE (tenant_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_shuttle_registrations_route
  ON core.shuttle_registrations (tenant_id, route_id, is_active);

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE core.shuttle_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.shuttle_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.shuttle_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shuttle_routes_select ON core.shuttle_routes;
CREATE POLICY shuttle_routes_select ON core.shuttle_routes
  FOR SELECT TO authenticated
  USING (core.is_org_member(tenant_id));

DROP POLICY IF EXISTS shuttle_routes_manage_write ON core.shuttle_routes;
CREATE POLICY shuttle_routes_manage_write ON core.shuttle_routes
  FOR ALL TO authenticated
  USING (core.can_manage_shuttle(tenant_id))
  WITH CHECK (core.can_manage_shuttle(tenant_id));

DROP POLICY IF EXISTS shuttle_stops_select ON core.shuttle_stops;
CREATE POLICY shuttle_stops_select ON core.shuttle_stops
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM core.shuttle_routes r
      WHERE r.id = shuttle_stops.route_id
        AND core.is_org_member(r.tenant_id)
    )
  );

DROP POLICY IF EXISTS shuttle_stops_manage_write ON core.shuttle_stops;
CREATE POLICY shuttle_stops_manage_write ON core.shuttle_stops
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM core.shuttle_routes r
      WHERE r.id = shuttle_stops.route_id
        AND core.can_manage_shuttle(r.tenant_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM core.shuttle_routes r
      WHERE r.id = shuttle_stops.route_id
        AND core.can_manage_shuttle(r.tenant_id)
    )
  );

DROP POLICY IF EXISTS shuttle_registrations_select ON core.shuttle_registrations;
CREATE POLICY shuttle_registrations_select ON core.shuttle_registrations
  FOR SELECT TO authenticated
  USING (core.is_org_member(tenant_id));

DROP POLICY IF EXISTS shuttle_registrations_insert ON core.shuttle_registrations;
CREATE POLICY shuttle_registrations_insert ON core.shuttle_registrations
  FOR INSERT TO authenticated
  WITH CHECK (
    core.is_org_member(tenant_id)
    AND (
      core.can_manage_shuttle(tenant_id)
      OR EXISTS (
        SELECT 1 FROM core.organization_members m
        WHERE m.id = shuttle_registrations.member_id
          AND m.organization_id = tenant_id
          AND m.user_id = auth.uid()
          AND m.is_active = true
      )
    )
  );

DROP POLICY IF EXISTS shuttle_registrations_update ON core.shuttle_registrations;
CREATE POLICY shuttle_registrations_update ON core.shuttle_registrations
  FOR UPDATE TO authenticated
  USING (
    core.is_org_member(tenant_id)
    AND (
      core.can_manage_shuttle(tenant_id)
      OR EXISTS (
        SELECT 1 FROM core.organization_members m
        WHERE m.id = shuttle_registrations.member_id
          AND m.organization_id = tenant_id
          AND m.user_id = auth.uid()
          AND m.is_active = true
      )
    )
  )
  WITH CHECK (
    core.is_org_member(tenant_id)
    AND (
      core.can_manage_shuttle(tenant_id)
      OR EXISTS (
        SELECT 1 FROM core.organization_members m
        WHERE m.id = shuttle_registrations.member_id
          AND m.organization_id = tenant_id
          AND m.user_id = auth.uid()
          AND m.is_active = true
      )
    )
  );

DROP POLICY IF EXISTS shuttle_registrations_delete ON core.shuttle_registrations;
CREATE POLICY shuttle_registrations_delete ON core.shuttle_registrations
  FOR DELETE TO authenticated
  USING (core.can_manage_shuttle(tenant_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON core.shuttle_routes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.shuttle_stops TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.shuttle_registrations TO authenticated;

COMMENT ON TABLE core.shuttle_routes IS '사내 통근 셔틀 노선 마스터';
COMMENT ON TABLE core.shuttle_stops IS '노선별 정류장 및 승·하차 예정 시각';
COMMENT ON TABLE core.shuttle_registrations IS '임직원 고정 셔틀 탑승 등록 (사원당 1행)';

COMMIT;
