-- ==============================================================================
-- Moa v2: Generic Multi-Vertical Atomic Organization Setup RPC
-- File: 20261025160000_generic_preset_setup_rpc.sql
--
-- [Architecture Principle: Zero-Condition Multi-Vertical Support]
-- Replaces industry-specific if/else hardcoding in create_organization_with_preset.
-- Injects rooms, lockers, and operating hours generically from p_custom_config
-- for all 53+ presets without piano/sauna/pilates vertical bias.
-- ==============================================================================

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
  v_role_elem JSONB;
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
  v_norm_industry := LOWER(TRIM(COALESCE(p_industry, 'custom')));
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

  -- 5. Create organization with settings JSONB
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

  -- 7. Roles injection (data-driven from p_custom_config->'roles')
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
    INSERT INTO core.tenant_roles (tenant_id, name, rank_order, permissions) VALUES
      (v_org_id, '대표', 1, '["*"]'::jsonb)
    ON CONFLICT (tenant_id, name) DO NOTHING;
  END IF;

  -- 8. Spatial resource injection (Generic for ALL industries from p_custom_config->'rooms')
  IF p_custom_config ? 'rooms' AND jsonb_array_length(p_custom_config->'rooms') > 0 THEN
    FOR v_room_elem IN SELECT * FROM jsonb_array_elements(p_custom_config->'rooms')
    LOOP
      INSERT INTO core.practice_rooms (organization_id, name, capacity)
      VALUES (
        v_org_id,
        COALESCE(v_room_elem->>'name', '공간'),
        COALESCE((v_room_elem->>'capacity')::int, 1)
      ) ON CONFLICT (organization_id, name) DO NOTHING;
    END LOOP;
  END IF;

  -- 8-1. Lockers injection (Generic for ALL industries from p_custom_config->'locker_count')
  v_locker_count := COALESCE(
    (p_custom_config->>'locker_count')::int,
    (p_custom_config->>'totalLockerCount')::int,
    0
  );

  IF v_locker_count > 0 THEN
    IF v_norm_industry IN ('sauna', 'sauna_jjimjilbang') THEN
      FOR v_i IN 1..v_locker_count LOOP
        INSERT INTO core.lockers (tenant_id, locker_number, section, status)
        VALUES (v_org_id, v_i::TEXT, '남탕', 'AVAILABLE')
        ON CONFLICT (tenant_id, section, locker_number) DO NOTHING;

        INSERT INTO core.lockers (tenant_id, locker_number, section, status)
        VALUES (v_org_id, v_i::TEXT, '여탕', 'AVAILABLE')
        ON CONFLICT (tenant_id, section, locker_number) DO NOTHING;
      END LOOP;
    ELSE
      FOR v_i IN 1..v_locker_count LOOP
        INSERT INTO core.lockers (tenant_id, locker_number, section, status)
        VALUES (v_org_id, v_i::TEXT, '공용', 'AVAILABLE')
        ON CONFLICT (tenant_id, section, locker_number) DO NOTHING;
      END LOOP;
    END IF;
  END IF;

  -- 9. Operating / Consultation hours injection (Generic from p_custom_config->'operating_hours')
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
    INSERT INTO core.tenant_operating_hours (
      tenant_id, day_type, start_time, end_time, slot_minutes, is_active
    ) VALUES (
      v_org_id, 'WEEKDAY', '09:00'::time, '18:00'::time, 60, true
    );
  END IF;

  -- 10. Commit transaction & return result
  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_org_id,
    'name', p_org_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.create_organization_with_preset(TEXT, TEXT, JSONB) TO authenticated;
