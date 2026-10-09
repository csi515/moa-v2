-- ==============================================================================
-- Moa v2: Atomic Organization Setup with Preset RPC
-- File: 20261009170000_quick_setup_atomic_rpc.sql
-- ==============================================================================

-- 1. Ensure core.tenant_operating_hours exists
CREATE TABLE IF NOT EXISTS core.tenant_operating_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  day_type TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_minutes INT DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_operating_hours_tenant
  ON core.tenant_operating_hours(tenant_id);

ALTER TABLE core.tenant_operating_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_operating_hours_staff_all ON core.tenant_operating_hours;
CREATE POLICY tenant_operating_hours_staff_all ON core.tenant_operating_hours
  FOR ALL TO authenticated
  USING (core.is_org_member(tenant_id))
  WITH CHECK (core.is_org_member(tenant_id));

-- 2. Ensure core.lockers exists for multi-vertical locker management
CREATE TABLE IF NOT EXISTS core.lockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  locker_number TEXT NOT NULL,
  section TEXT NOT NULL DEFAULT '공용',
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  assigned_customer_id UUID REFERENCES core.customers(id) ON DELETE SET NULL,
  deposit_amount NUMERIC DEFAULT 0,
  monthly_fee NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, section, locker_number)
);

CREATE INDEX IF NOT EXISTS idx_lockers_tenant
  ON core.lockers(tenant_id);

ALTER TABLE core.lockers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lockers_staff_all ON core.lockers;
CREATE POLICY lockers_staff_all ON core.lockers
  FOR ALL TO authenticated
  USING (core.is_org_member(tenant_id))
  WITH CHECK (core.is_org_member(tenant_id));

-- 3. Atomic Organization Creation & Preset Injection RPC
CREATE OR REPLACE FUNCTION core.create_organization_with_preset(
  p_org_name TEXT,
  p_industry TEXT,
  p_custom_config JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_org_id UUID;
  v_norm_industry TEXT;
  v_roles JSONB;
  v_role_elem JSONB;
  v_rooms JSONB;
  v_room_elem JSONB;
  v_locker_count INT;
  v_i INT;
  v_day_type TEXT;
  v_start_time TIME;
  v_end_time TIME;
  v_slot_minutes INT;
BEGIN
  -- 1. Authentication check
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- 2. Validate organization name
  p_org_name := TRIM(COALESCE(p_org_name, ''));
  IF p_org_name = '' THEN
    RAISE EXCEPTION 'Organization name cannot be empty';
  END IF;

  -- 3. Normalize industry identifier
  v_norm_industry := LOWER(TRIM(COALESCE(p_industry, 'piano')));
  IF v_norm_industry IN ('piano_academy', 'piano') THEN
    v_norm_industry := 'piano';
  ELSIF v_norm_industry IN ('sauna', 'sauna_jjimjilbang') THEN
    v_norm_industry := 'sauna';
  ELSIF v_norm_industry IN ('pilates') THEN
    v_norm_industry := 'pilates';
  ELSIF v_norm_industry IN ('custom') THEN
    v_norm_industry := 'custom';
  END IF;

  -- 4. Ensure caller profile exists to prevent foreign key errors
  INSERT INTO core.profiles (id, email)
  VALUES (v_uid, auth.jwt()->>'email')
  ON CONFLICT (id) DO NOTHING;

  -- 5. Create organization
  INSERT INTO core.organizations (
    name, industry_type, is_active, settings
  ) VALUES (
    p_org_name, v_norm_industry, true, COALESCE(p_custom_config, '{}'::jsonb)
  ) RETURNING id INTO v_org_id;

  -- 6. Bind caller as owner in organization_members
  INSERT INTO core.organization_members (
    organization_id, user_id, role, custom_role_id, token_version, is_active
  ) VALUES (
    v_org_id, v_uid, 'owner', NULL, 1, true
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role = 'owner',
    is_active = true,
    updated_at = now();

  -- 7. Roles injection (custom roles if passed, else industry presets)
  IF p_custom_config ? 'roles' AND jsonb_array_length(p_custom_config->'roles') > 0 THEN
    FOR v_role_elem IN SELECT * FROM jsonb_array_elements(p_custom_config->'roles')
    LOOP
      INSERT INTO core.tenant_roles (
        tenant_id, name, rank_order, permissions
      ) VALUES (
        v_org_id,
        COALESCE(v_role_elem->>'name', '직급'),
        COALESCE((v_role_elem->>'rank_order')::int, 10),
        COALESCE(v_role_elem->'permissions', '[]'::jsonb)
      ) ON CONFLICT (tenant_id, name) DO NOTHING;
    END LOOP;
  ELSE
    -- Standard industry roles presets
    IF v_norm_industry = 'piano' THEN
      INSERT INTO core.tenant_roles (tenant_id, name, rank_order, permissions) VALUES
        (v_org_id, '원장', 1, '["*"]'::jsonb),
        (v_org_id, '전임강사', 2, '["attendance:*", "passes:view"]'::jsonb),
        (v_org_id, '파트타임', 3, '["attendance:checkin"]'::jsonb)
      ON CONFLICT (tenant_id, name) DO NOTHING;
    ELSIF v_norm_industry = 'sauna' THEN
      INSERT INTO core.tenant_roles (tenant_id, name, rank_order, permissions) VALUES
        (v_org_id, '사장', 1, '["*"]'::jsonb),
        (v_org_id, '주간 카운터', 2, '["passes:*", "lockers:*"]'::jsonb),
        (v_org_id, '야간 카운터', 3, '["passes:deduct", "lockers:assign"]'::jsonb)
      ON CONFLICT (tenant_id, name) DO NOTHING;
    ELSIF v_norm_industry = 'pilates' THEN
      INSERT INTO core.tenant_roles (tenant_id, name, rank_order, permissions) VALUES
        (v_org_id, '대표', 1, '["*"]'::jsonb),
        (v_org_id, '수석강사', 2, '["passes:*", "booking:*"]'::jsonb),
        (v_org_id, '강사', 3, '["attendance:checkin"]'::jsonb)
      ON CONFLICT (tenant_id, name) DO NOTHING;
    ELSE
      INSERT INTO core.tenant_roles (tenant_id, name, rank_order, permissions) VALUES
        (v_org_id, '관리자', 1, '["*"]'::jsonb)
      ON CONFLICT (tenant_id, name) DO NOTHING;
    END IF;
  END IF;

  -- 8. Spatial resource injection (Rooms & Lockers)
  IF v_norm_industry = 'piano' THEN
    IF p_custom_config ? 'rooms' AND jsonb_array_length(p_custom_config->'rooms') > 0 THEN
      FOR v_room_elem IN SELECT * FROM jsonb_array_elements(p_custom_config->'rooms')
      LOOP
        INSERT INTO core.practice_rooms (organization_id, name, capacity)
        VALUES (
          v_org_id,
          COALESCE(v_room_elem->>'name', '연습실'),
          COALESCE((v_room_elem->>'capacity')::int, 1)
        ) ON CONFLICT (organization_id, name) DO NOTHING;
      END LOOP;
    ELSE
      -- Default 5 piano rooms (1 grand, 4 standard)
      INSERT INTO core.practice_rooms (organization_id, name, capacity) VALUES
        (v_org_id, '그랜드룸', 2),
        (v_org_id, '일반 1호', 1),
        (v_org_id, '일반 2호', 1),
        (v_org_id, '일반 3호', 1),
        (v_org_id, '일반 4호', 1)
      ON CONFLICT (organization_id, name) DO NOTHING;
    END IF;

  ELSIF v_norm_industry = 'pilates' THEN
    IF p_custom_config ? 'rooms' AND jsonb_array_length(p_custom_config->'rooms') > 0 THEN
      FOR v_room_elem IN SELECT * FROM jsonb_array_elements(p_custom_config->'rooms')
      LOOP
        INSERT INTO core.practice_rooms (organization_id, name, capacity)
        VALUES (
          v_org_id,
          COALESCE(v_room_elem->>'name', '레슨실'),
          COALESCE((v_room_elem->>'capacity')::int, 1)
        ) ON CONFLICT (organization_id, name) DO NOTHING;
      END LOOP;
    ELSE
      -- Default pilates group & private rooms
      INSERT INTO core.practice_rooms (organization_id, name, capacity) VALUES
        (v_org_id, '리포머룸', 6),
        (v_org_id, '체어룸', 6),
        (v_org_id, '개인레슨실', 1)
      ON CONFLICT (organization_id, name) DO NOTHING;
    END IF;

  ELSIF v_norm_industry = 'sauna' THEN
    v_locker_count := COALESCE(
      (p_custom_config->>'locker_count')::int,
      (p_custom_config->>'totalLockerCount')::int,
      50
    );
    IF v_locker_count > 0 THEN
      FOR v_i IN 1..v_locker_count LOOP
        INSERT INTO core.lockers (tenant_id, locker_number, section, status)
        VALUES (v_org_id, v_i::TEXT, '남탕', 'AVAILABLE')
        ON CONFLICT (tenant_id, section, locker_number) DO NOTHING;

        INSERT INTO core.lockers (tenant_id, locker_number, section, status)
        VALUES (v_org_id, v_i::TEXT, '여탕', 'AVAILABLE')
        ON CONFLICT (tenant_id, section, locker_number) DO NOTHING;
      END LOOP;
    END IF;
  END IF;

  -- 9. Operating / Consultation hours injection
  IF p_custom_config ? 'operating_hours' THEN
    v_day_type := COALESCE(p_custom_config->'operating_hours'->>'day_type', 'WEEKDAY');
    v_start_time := COALESCE((p_custom_config->'operating_hours'->>'start_time')::time, '09:00'::time);
    v_end_time := COALESCE((p_custom_config->'operating_hours'->>'end_time')::time, '18:00'::time);
    v_slot_minutes := COALESCE((p_custom_config->'operating_hours'->>'slot_minutes')::int, 30);

    INSERT INTO core.tenant_operating_hours (
      tenant_id, day_type, start_time, end_time, slot_minutes, is_active
    ) VALUES (
      v_org_id, v_day_type, v_start_time, v_end_time, v_slot_minutes, true
    );
  ELSE
    IF v_norm_industry = 'piano' THEN
      INSERT INTO core.tenant_operating_hours (
        tenant_id, day_type, start_time, end_time, slot_minutes, is_active
      ) VALUES (
        v_org_id, 'WEEKDAY', '13:00'::time, '19:00'::time, 30, true
      );
    ELSIF v_norm_industry = 'pilates' THEN
      INSERT INTO core.tenant_operating_hours (
        tenant_id, day_type, start_time, end_time, slot_minutes, is_active
      ) VALUES (
        v_org_id, 'WEEKDAY', '09:00'::time, '21:00'::time, 50, true
      );
    ELSIF v_norm_industry = 'sauna' THEN
      INSERT INTO core.tenant_operating_hours (
        tenant_id, day_type, start_time, end_time, slot_minutes, is_active
      ) VALUES (
        v_org_id, 'ALL_WEEK', '05:00'::time, '23:00'::time, 60, true
      );
    ELSE
      INSERT INTO core.tenant_operating_hours (
        tenant_id, day_type, start_time, end_time, slot_minutes, is_active
      ) VALUES (
        v_org_id, 'WEEKDAY', '09:00'::time, '18:00'::time, 60, true
      );
    END IF;
  END IF;

  -- 10. Commit transaction & return result
  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_org_id,
    'name', p_org_name
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION core.create_organization_with_preset(TEXT, TEXT, JSONB) TO authenticated;
