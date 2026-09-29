-- Optional attendance industry module: PIN check-in sessions
-- Attendance SoT: core.attendance_sessions.check_in_at
-- Session(방문 사실)은 core.customer_sessions. 수업 출석은 piano.attendance.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================
-- ENUM: check-in method (extensible)
-- =============================================

DO $$ BEGIN
  CREATE TYPE core.check_in_method AS ENUM ('pin', 'qr', 'nfc', 'kiosk', 'manual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- CUSTOMER PIN (hashed, never plain text)
-- =============================================

ALTER TABLE core.customers
  ADD COLUMN IF NOT EXISTS check_in_pin_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_core_customers_pin_lookup
  ON core.customers(organization_id)
  WHERE check_in_pin_hash IS NOT NULL;

-- =============================================
-- ATTENDANCE SESSIONS (check-in / check-out)
-- =============================================

CREATE TABLE IF NOT EXISTS core.attendance_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  session_date      DATE NOT NULL,
  check_in_at       TIMESTAMPTZ,
  check_out_at      TIMESTAMPTZ,
  check_in_method   core.check_in_method,
  check_out_method  core.check_in_method,
  memo              TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, customer_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_org_date
  ON core.attendance_sessions(organization_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_customer
  ON core.attendance_sessions(organization_id, customer_id, session_date DESC);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.attendance_sessions
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- =============================================
-- HELPERS
-- =============================================

CREATE OR REPLACE FUNCTION core.hash_check_in_pin(
  p_org_id UUID,
  p_customer_id UUID,
  p_pin TEXT
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(digest(p_org_id::text || ':' || p_customer_id::text || ':' || p_pin, 'sha256'), 'hex');
$$;

GRANT EXECUTE ON FUNCTION core.hash_check_in_pin(UUID, UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION core.is_attendance_module_enabled(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT COALESCE(
    (o.settings->'features'->'attendance'->>'enabled')::boolean,
    o.industry_type <> 'pilates'
  )
  FROM core.organizations o
  WHERE o.id = p_org_id;
$$;

GRANT EXECUTE ON FUNCTION core.is_attendance_module_enabled(UUID) TO authenticated;

-- =============================================
-- Location timezone → business date
-- locations 테이블이 아직 없으면 기본 timezone 정책을 유지한다.
-- =============================================

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

-- =============================================
-- RPC: toggle check-in / check-out by PIN
-- =============================================

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

GRANT EXECUTE ON FUNCTION core.toggle_check_in_by_pin(UUID, TEXT, core.check_in_method) TO authenticated;

-- =============================================
-- RPC: set customer PIN (admin only)
-- =============================================

CREATE OR REPLACE FUNCTION core.set_customer_check_in_pin(
  p_org_id UUID,
  p_customer_id UUID,
  p_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF NOT core.is_org_admin(p_org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF p_pin IS NULL OR length(trim(p_pin)) < 4 OR length(trim(p_pin)) > 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_pin_format');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM core.customers
    WHERE id = p_customer_id AND organization_id = p_org_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'customer_not_found');
  END IF;

  v_hash := core.hash_check_in_pin(p_org_id, p_customer_id, trim(p_pin));

  IF EXISTS (
    SELECT 1 FROM core.customers
    WHERE organization_id = p_org_id
      AND id <> p_customer_id
      AND check_in_pin_hash = v_hash
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'pin_already_used');
  END IF;

  UPDATE core.customers
  SET check_in_pin_hash = v_hash, updated_at = now()
  WHERE id = p_customer_id AND organization_id = p_org_id;

  RETURN jsonb_build_object('success', true, 'customer_id', p_customer_id);
END;
$$;

GRANT EXECUTE ON FUNCTION core.set_customer_check_in_pin(UUID, UUID, TEXT) TO authenticated;

-- =============================================
-- RLS
-- =============================================

ALTER TABLE core.attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY attendance_sessions_select ON core.attendance_sessions
  FOR SELECT TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
    OR core.parent_owns_student(organization_id, customer_id)
  );

CREATE POLICY attendance_sessions_insert ON core.attendance_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    core.is_org_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
  );

CREATE POLICY attendance_sessions_update ON core.attendance_sessions
  FOR UPDATE TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
  )
  WITH CHECK (
    core.is_org_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
  );

CREATE POLICY attendance_sessions_delete ON core.attendance_sessions
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));
