-- Organization 하위 Location 기반.
-- 기존 테이블의 organization_id 를 교체하지 않는다.
-- 기존 create_organization 시그니처를 바꾸지 않는다.

CREATE TABLE core.locations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  address         TEXT,
  phone           TEXT,
  timezone        TEXT NOT NULL DEFAULT 'Asia/Seoul',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT locations_name_check CHECK (length(btrim(name)) > 0),
  CONSTRAINT locations_code_check CHECK (length(btrim(code)) > 0),
  CONSTRAINT locations_slug_check CHECK (length(btrim(slug)) > 0),
  CONSTRAINT uq_locations_org_code UNIQUE (organization_id, code),
  CONSTRAINT uq_locations_org_slug UNIQUE (organization_id, slug)
);

COMMENT ON TABLE core.locations IS
  '영업 지점. Organization 이 테넌트 경계. 기존 organization_id 컬럼을 대체하지 않는다.';
COMMENT ON COLUMN core.locations.metadata IS
  'hours/override 연결점. source=availability 를 둘 수 있다.';

CREATE INDEX idx_locations_org_active ON core.locations (organization_id, is_active);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.locations
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE core.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY locations_select ON core.locations
  FOR SELECT TO authenticated
  USING (
    core.is_org_member(organization_id)
    OR core.is_org_staff_actor(organization_id)
  );

CREATE POLICY locations_admin_write ON core.locations
  FOR ALL TO authenticated
  USING (core.is_org_owner_or_admin(organization_id))
  WITH CHECK (core.is_org_owner_or_admin(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON core.locations TO authenticated;

CREATE OR REPLACE FUNCTION core.insert_default_organization_location(p_organization_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_org core.organizations%ROWTYPE;
  v_id UUID;
  v_address TEXT;
  v_phone TEXT;
BEGIN
  SELECT * INTO v_org FROM core.organizations WHERE id = p_organization_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  SELECT id INTO v_id
  FROM core.locations
  WHERE organization_id = p_organization_id AND code = 'main';
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  v_address := NULLIF(btrim(COALESCE(v_org.settings->>'businessAddress', v_org.settings->>'address', '')), '');
  v_phone := NULLIF(btrim(COALESCE(v_org.settings->>'phone', v_org.settings->>'businessPhone', '')), '');

  INSERT INTO core.locations (
    organization_id, name, code, slug, address, phone, timezone, metadata
  ) VALUES (
    p_organization_id,
    v_org.name,
    'main',
    'main',
    v_address,
    v_phone,
    'Asia/Seoul',
    jsonb_build_object(
      'default', true,
      'hours', jsonb_build_object('source', 'availability')
    )
  )
  ON CONFLICT (organization_id, code) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id
    FROM core.locations
    WHERE organization_id = p_organization_id AND code = 'main';
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION core.ensure_default_organization_location(p_organization_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (
    core.is_org_member(p_organization_id)
    OR core.is_org_staff_actor(p_organization_id)
    OR core.is_org_owner_or_admin(p_organization_id)
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  RETURN core.insert_default_organization_location(p_organization_id);
END;
$$;

CREATE OR REPLACE FUNCTION core.organizations_insert_default_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  PERFORM core.insert_default_organization_location(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER organizations_default_location
  AFTER INSERT ON core.organizations
  FOR EACH ROW
  EXECUTE FUNCTION core.organizations_insert_default_location();

INSERT INTO core.locations (organization_id, name, code, slug, timezone, metadata)
SELECT
  o.id,
  o.name,
  'main',
  'main',
  'Asia/Seoul',
  jsonb_build_object('default', true, 'hours', jsonb_build_object('source', 'availability'))
FROM core.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM core.locations l WHERE l.organization_id = o.id
);

CREATE OR REPLACE FUNCTION core.upsert_location(
  p_organization_id UUID,
  p_name TEXT,
  p_code TEXT DEFAULT NULL,
  p_slug TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_timezone TEXT DEFAULT NULL,
  p_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_row core.locations%ROWTYPE;
  v_code TEXT;
  v_slug TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT core.is_org_owner_or_admin(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  IF length(btrim(COALESCE(p_name, ''))) = 0 THEN
    RAISE EXCEPTION 'Invalid location';
  END IF;

  v_code := lower(btrim(COALESCE(NULLIF(btrim(COALESCE(p_code, '')), ''), 'main')));
  v_slug := lower(btrim(COALESCE(NULLIF(btrim(COALESCE(p_slug, '')), ''), v_code)));

  IF p_id IS NOT NULL THEN
    SELECT * INTO v_row FROM core.locations WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Location not found';
    END IF;
    IF v_row.organization_id IS DISTINCT FROM p_organization_id THEN
      RAISE EXCEPTION 'Organization mismatch';
    END IF;
    UPDATE core.locations
    SET name = btrim(p_name),
        code = v_code,
        slug = v_slug,
        address = NULLIF(btrim(COALESCE(p_address, '')), ''),
        phone = NULLIF(btrim(COALESCE(p_phone, '')), ''),
        timezone = COALESCE(NULLIF(btrim(COALESCE(p_timezone, '')), ''), timezone),
        metadata = COALESCE(p_metadata, metadata),
        updated_at = now()
    WHERE id = p_id AND organization_id = p_organization_id
    RETURNING * INTO v_row;
    RETURN to_jsonb(v_row);
  END IF;

  INSERT INTO core.locations (
    organization_id, name, code, slug, address, phone, timezone, metadata
  ) VALUES (
    p_organization_id,
    btrim(p_name),
    v_code,
    v_slug,
    NULLIF(btrim(COALESCE(p_address, '')), ''),
    NULLIF(btrim(COALESCE(p_phone, '')), ''),
    COALESCE(NULLIF(btrim(COALESCE(p_timezone, '')), ''), 'Asia/Seoul'),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
EXCEPTION
  WHEN unique_violation THEN
    IF SQLERRM LIKE '%uq_locations_org_slug%' THEN
      RAISE EXCEPTION 'Location slug already exists';
    END IF;
    RAISE EXCEPTION 'Location code already exists';
END;
$$;

CREATE OR REPLACE FUNCTION core.set_location_active(
  p_organization_id UUID,
  p_location_id UUID,
  p_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_row core.locations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT core.is_org_owner_or_admin(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_row FROM core.locations WHERE id = p_location_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Location not found';
  END IF;
  IF v_row.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;

  UPDATE core.locations
  SET is_active = p_active, updated_at = now()
  WHERE id = p_location_id AND organization_id = p_organization_id
  RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION core.insert_default_organization_location(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.ensure_default_organization_location(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.organizations_insert_default_location() FROM PUBLIC;
REVOKE ALL ON FUNCTION core.upsert_location(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.set_location_active(UUID, UUID, BOOLEAN) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION core.ensure_default_organization_location(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.upsert_location(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION core.set_location_active(UUID, UUID, BOOLEAN) TO authenticated;
