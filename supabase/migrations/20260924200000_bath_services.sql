-- Bath 인적 서비스 카탈로그. Product/core.services를 복제하지 않는다.
-- 예약 충돌은 bookable_resources + room_reservations. 근무표 UI 없음.

CREATE TYPE bath.service_category AS ENUM ('scrub', 'massage', 'other');

CREATE TABLE bath.services (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  category            bath.service_category NOT NULL,
  duration_minutes    INT NOT NULL CHECK (duration_minutes >= 5),
  base_price          NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (base_price >= 0),
  requires_staff      BOOLEAN NOT NULL DEFAULT false,
  requires_resource   BOOLEAN NOT NULL DEFAULT false,
  product_id          UUID REFERENCES core.products(id) ON DELETE SET NULL,
  active              BOOLEAN NOT NULL DEFAULT true,
  sort_order          INT NOT NULL DEFAULT 0,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bath_services_name_not_blank CHECK (char_length(btrim(name)) > 0),
  UNIQUE (organization_id, name)
);

COMMENT ON TABLE bath.services IS
  '세신·마사지 등 인적 서비스. Product가 아님. product_id는 판매 SKU 연결만.';
COMMENT ON COLUMN bath.services.base_price IS '표시용 기본 요금. 결제 원장이 아님.';
COMMENT ON COLUMN bath.services.product_id IS '선택적 core.products 연결. 카탈로그 복제 아님.';
COMMENT ON COLUMN bath.services.duration_minutes IS '타임슬롯 길이. 예약 UI는 아직 없음.';

CREATE TABLE bath.service_resources (
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  service_id      UUID NOT NULL REFERENCES bath.services(id) ON DELETE CASCADE,
  resource_id     UUID NOT NULL REFERENCES core.bookable_resources(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (service_id, resource_id)
);

COMMENT ON TABLE bath.service_resources IS
  '서비스가 사용할 수 있는 자원. 겹침은 Resource Reservation Capability.';

CREATE TABLE bath.service_staff (
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  service_id      UUID NOT NULL REFERENCES bath.services(id) ON DELETE CASCADE,
  staff_id        UUID NOT NULL REFERENCES core.staff(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (service_id, staff_id)
);

COMMENT ON TABLE bath.service_staff IS
  '서비스 가능 직원. 근무표·충돌 검사는 향후 확장.';

CREATE INDEX idx_bath_services_org_active
  ON bath.services (organization_id, active, sort_order, name);
CREATE INDEX idx_bath_services_org_category
  ON bath.services (organization_id, category);
CREATE INDEX idx_bath_service_resources_org
  ON bath.service_resources (organization_id, resource_id);
CREATE INDEX idx_bath_service_staff_org
  ON bath.service_staff (organization_id, staff_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON bath.services
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE bath.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bath.service_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE bath.service_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY bath_services_select ON bath.services
  FOR SELECT TO authenticated
  USING (core.is_org_staff_actor(organization_id) OR core.is_org_member(organization_id));
CREATE POLICY bath_services_staff_write ON bath.services
  FOR ALL TO authenticated
  USING (core.is_org_staff_actor(organization_id))
  WITH CHECK (core.is_org_staff_actor(organization_id));

CREATE POLICY bath_service_resources_select ON bath.service_resources
  FOR SELECT TO authenticated
  USING (core.is_org_staff_actor(organization_id) OR core.is_org_member(organization_id));
CREATE POLICY bath_service_resources_write ON bath.service_resources
  FOR ALL TO authenticated
  USING (core.is_org_staff_actor(organization_id))
  WITH CHECK (core.is_org_staff_actor(organization_id));

CREATE POLICY bath_service_staff_select ON bath.service_staff
  FOR SELECT TO authenticated
  USING (core.is_org_staff_actor(organization_id) OR core.is_org_member(organization_id));
CREATE POLICY bath_service_staff_write ON bath.service_staff
  FOR ALL TO authenticated
  USING (core.is_org_staff_actor(organization_id))
  WITH CHECK (core.is_org_staff_actor(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON bath.services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON bath.service_resources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON bath.service_staff TO authenticated;

CREATE OR REPLACE FUNCTION bath.service_payload(p_service bath.services)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT to_jsonb(p_service) || jsonb_build_object(
    'resource_ids', COALESCE((
      SELECT jsonb_agg(sr.resource_id ORDER BY sr.resource_id)
      FROM bath.service_resources sr
      WHERE sr.service_id = p_service.id
    ), '[]'::jsonb),
    'staff_ids', COALESCE((
      SELECT jsonb_agg(ss.staff_id ORDER BY ss.staff_id)
      FROM bath.service_staff ss
      WHERE ss.service_id = p_service.id
    ), '[]'::jsonb)
  );
$$;

CREATE OR REPLACE FUNCTION bath.assert_service_access(
  p_organization_id UUID,
  p_service_id UUID
)
RETURNS bath.services
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bath, core, public
AS $$
DECLARE
  v_service bath.services%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_organization_id IS NULL OR p_service_id IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  SELECT * INTO v_service FROM bath.services WHERE id = p_service_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service not found';
  END IF;
  IF v_service.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;
  RETURN v_service;
END;
$$;

CREATE OR REPLACE FUNCTION bath.upsert_service(
  p_organization_id UUID,
  p_name TEXT,
  p_category bath.service_category,
  p_duration_minutes INT,
  p_id UUID DEFAULT NULL,
  p_base_price NUMERIC DEFAULT 0,
  p_requires_staff BOOLEAN DEFAULT false,
  p_requires_resource BOOLEAN DEFAULT false,
  p_product_id UUID DEFAULT NULL,
  p_active BOOLEAN DEFAULT true,
  p_sort_order INT DEFAULT 0,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bath, core, public
AS $$
DECLARE
  v_existing bath.services%ROWTYPE;
  v_service bath.services%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  IF btrim(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'Invalid service name';
  END IF;
  IF p_duration_minutes IS NULL OR p_duration_minutes < 5 THEN
    RAISE EXCEPTION 'Invalid duration';
  END IF;
  IF COALESCE(p_base_price, 0) < 0 THEN
    RAISE EXCEPTION 'Invalid base price';
  END IF;
  IF p_product_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM core.products p
    WHERE p.id = p_product_id AND p.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Product not found in organization';
  END IF;

  IF p_id IS NOT NULL THEN
    v_existing := bath.assert_service_access(p_organization_id, p_id);
  END IF;

  BEGIN
    INSERT INTO bath.services (
      id, organization_id, name, category, duration_minutes, base_price,
      requires_staff, requires_resource, product_id, active, sort_order, metadata
    ) VALUES (
      COALESCE(p_id, gen_random_uuid()),
      p_organization_id,
      btrim(p_name),
      p_category,
      p_duration_minutes,
      COALESCE(p_base_price, 0),
      COALESCE(p_requires_staff, false),
      COALESCE(p_requires_resource, false),
      p_product_id,
      COALESCE(p_active, true),
      COALESCE(p_sort_order, 0),
      COALESCE(p_metadata, '{}'::jsonb)
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      duration_minutes = EXCLUDED.duration_minutes,
      base_price = EXCLUDED.base_price,
      requires_staff = EXCLUDED.requires_staff,
      requires_resource = EXCLUDED.requires_resource,
      product_id = EXCLUDED.product_id,
      active = EXCLUDED.active,
      sort_order = EXCLUDED.sort_order,
      metadata = EXCLUDED.metadata,
      updated_at = now()
    RETURNING * INTO v_service;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Service name already exists';
  END;

  RETURN bath.service_payload(v_service);
END;
$$;

CREATE OR REPLACE FUNCTION bath.set_service_active(
  p_organization_id UUID,
  p_service_id UUID,
  p_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bath, core, public
AS $$
DECLARE
  v_service bath.services%ROWTYPE;
BEGIN
  PERFORM bath.assert_service_access(p_organization_id, p_service_id);
  UPDATE bath.services
  SET active = p_active, updated_at = now()
  WHERE id = p_service_id AND organization_id = p_organization_id
  RETURNING * INTO v_service;
  RETURN bath.service_payload(v_service);
END;
$$;

CREATE OR REPLACE FUNCTION bath.delete_service(
  p_organization_id UUID,
  p_service_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bath, core, public
AS $$
DECLARE
  v_service bath.services%ROWTYPE;
BEGIN
  v_service := bath.assert_service_access(p_organization_id, p_service_id);
  DELETE FROM bath.services
  WHERE id = p_service_id AND organization_id = p_organization_id;
  RETURN bath.service_payload(v_service);
END;
$$;

CREATE OR REPLACE FUNCTION bath.set_service_resources(
  p_organization_id UUID,
  p_service_id UUID,
  p_resource_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bath, core, public
AS $$
DECLARE
  v_service bath.services%ROWTYPE;
  v_id UUID;
BEGIN
  v_service := bath.assert_service_access(p_organization_id, p_service_id);

  FOREACH v_id IN ARRAY COALESCE(p_resource_ids, ARRAY[]::UUID[])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM core.bookable_resources r
      WHERE r.id = v_id AND r.organization_id = p_organization_id
    ) THEN
      RAISE EXCEPTION 'Resource not found in organization';
    END IF;
  END LOOP;

  DELETE FROM bath.service_resources
  WHERE service_id = p_service_id AND organization_id = p_organization_id;

  INSERT INTO bath.service_resources (organization_id, service_id, resource_id)
  SELECT p_organization_id, p_service_id, u.id
  FROM unnest(COALESCE(p_resource_ids, ARRAY[]::UUID[])) AS u(id)
  ON CONFLICT DO NOTHING;

  SELECT * INTO v_service FROM bath.services WHERE id = p_service_id;
  RETURN bath.service_payload(v_service);
END;
$$;

CREATE OR REPLACE FUNCTION bath.set_service_staff(
  p_organization_id UUID,
  p_service_id UUID,
  p_staff_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bath, core, public
AS $$
DECLARE
  v_service bath.services%ROWTYPE;
  v_id UUID;
BEGIN
  v_service := bath.assert_service_access(p_organization_id, p_service_id);

  FOREACH v_id IN ARRAY COALESCE(p_staff_ids, ARRAY[]::UUID[])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM core.staff s
      WHERE s.id = v_id AND s.organization_id = p_organization_id
    ) THEN
      RAISE EXCEPTION 'Staff not found in organization';
    END IF;
  END LOOP;

  DELETE FROM bath.service_staff
  WHERE service_id = p_service_id AND organization_id = p_organization_id;

  INSERT INTO bath.service_staff (organization_id, service_id, staff_id)
  SELECT p_organization_id, p_service_id, u.id
  FROM unnest(COALESCE(p_staff_ids, ARRAY[]::UUID[])) AS u(id)
  ON CONFLICT DO NOTHING;

  SELECT * INTO v_service FROM bath.services WHERE id = p_service_id;
  RETURN bath.service_payload(v_service);
END;
$$;

REVOKE ALL ON FUNCTION bath.service_payload(bath.services) FROM PUBLIC;
REVOKE ALL ON FUNCTION bath.assert_service_access(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION bath.upsert_service(UUID, TEXT, bath.service_category, INT, UUID, NUMERIC, BOOLEAN, BOOLEAN, UUID, BOOLEAN, INT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION bath.set_service_active(UUID, UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION bath.delete_service(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION bath.set_service_resources(UUID, UUID, UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION bath.set_service_staff(UUID, UUID, UUID[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION bath.upsert_service(UUID, TEXT, bath.service_category, INT, UUID, NUMERIC, BOOLEAN, BOOLEAN, UUID, BOOLEAN, INT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION bath.set_service_active(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION bath.delete_service(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION bath.set_service_resources(UUID, UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION bath.set_service_staff(UUID, UUID, UUID[]) TO authenticated;
