-- P4: Reverse sync — parent_student_guardians + enrollments → parent_student_links
-- Portal/redeem flows write guardians; admin CRM reads parent_student_links.

-- =============================================
-- Loop guard for link → guardian trigger
-- =============================================
CREATE OR REPLACE FUNCTION core.sync_parent_link_to_guardian()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_student_id UUID;
BEGIN
  IF current_setting('core.skip_link_to_guardian_sync', true) = 'true' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    SELECT se.student_id INTO v_student_id
    FROM core.student_enrollments se
    WHERE se.customer_id = OLD.student_customer_id
      AND se.organization_id = OLD.organization_id
    LIMIT 1;

    IF v_student_id IS NOT NULL THEN
      DELETE FROM core.parent_student_guardians
      WHERE parent_id = OLD.parent_customer_id
        AND student_id = v_student_id;
    END IF;

    RETURN OLD;
  END IF;

  SELECT se.student_id INTO v_student_id
  FROM core.student_enrollments se
  WHERE se.customer_id = NEW.student_customer_id
    AND se.organization_id = NEW.organization_id
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM core.parents WHERE id = NEW.parent_customer_id) THEN
    INSERT INTO core.parents (id, user_id, name, phone, email)
    SELECT c.id, c.user_id, c.name, c.phone, c.email
    FROM core.customers c
    WHERE c.id = NEW.parent_customer_id
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id)
    VALUES (NEW.parent_customer_id, NEW.organization_id, NEW.parent_customer_id)
    ON CONFLICT (customer_id) DO NOTHING;
  END IF;

  INSERT INTO core.parent_student_guardians (
    parent_id, student_id, relationship, is_primary, created_at, updated_at
  )
  VALUES (
    NEW.parent_customer_id,
    v_student_id,
    NEW.relationship,
    NEW.is_primary,
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (parent_id, student_id) DO UPDATE SET
    relationship = EXCLUDED.relationship,
    is_primary = EXCLUDED.is_primary,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- =============================================
-- Reverse sync: guardians + enrollments → parent_student_links
-- Only students enrolled in the org appear in admin CRM.
-- =============================================
CREATE OR REPLACE FUNCTION core.sync_parent_student_links_for_parent_org(
  p_parent_id UUID,
  p_org_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_parent_customer_id UUID;
  v_count INT := 0;
  v_guardian RECORD;
BEGIN
  IF p_parent_id IS NULL OR p_org_id IS NULL THEN
    RETURN 0;
  END IF;

  IF auth.uid() IS NOT NULL
     AND core.get_my_parent_id() IS DISTINCT FROM p_parent_id
     AND NOT core.is_org_admin(p_org_id)
     AND NOT core.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_parent_customer_id := core.ensure_org_parent_customer(p_parent_id, p_org_id);
  IF v_parent_customer_id IS NULL THEN
    RETURN 0;
  END IF;

  PERFORM set_config('core.skip_link_to_guardian_sync', 'true', true);

  FOR v_guardian IN
    SELECT
      psg.relationship,
      psg.is_primary,
      psg.created_at,
      se.customer_id AS student_customer_id
    FROM core.parent_student_guardians psg
    JOIN core.student_enrollments se
      ON se.student_id = psg.student_id
      AND se.organization_id = p_org_id
    WHERE psg.parent_id = p_parent_id
  LOOP
    INSERT INTO core.parent_student_links (
      organization_id,
      parent_customer_id,
      student_customer_id,
      relationship,
      is_primary,
      created_at,
      updated_at
    )
    VALUES (
      p_org_id,
      v_parent_customer_id,
      v_guardian.student_customer_id,
      v_guardian.relationship,
      v_guardian.is_primary,
      COALESCE(v_guardian.created_at, now()),
      now()
    )
    ON CONFLICT (parent_customer_id, student_customer_id) DO UPDATE SET
      organization_id = EXCLUDED.organization_id,
      relationship = EXCLUDED.relationship,
      is_primary = EXCLUDED.is_primary,
      updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  PERFORM set_config('core.skip_link_to_guardian_sync', 'false', true);

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION core.sync_parent_student_links_for_parent_org(UUID, UUID) TO authenticated;

-- =============================================
-- Org-wide reverse sync (safety net after portal connect)
-- =============================================
CREATE OR REPLACE FUNCTION core.sync_org_parent_student_links_reverse(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_parent RECORD;
  v_total INT := 0;
  v_parents INT := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  FOR v_parent IN
    SELECT DISTINCT psg.parent_id
    FROM core.parent_student_guardians psg
    JOIN core.student_enrollments se
      ON se.student_id = psg.student_id
      AND se.organization_id = p_org_id
  LOOP
    v_total := v_total + core.sync_parent_student_links_for_parent_org(v_parent.parent_id, p_org_id);
    v_parents := v_parents + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'organization_id', p_org_id,
    'parents_synced', v_parents,
    'links_synced', v_total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.sync_org_parent_student_links_reverse(UUID) TO authenticated;

-- =============================================
-- redeem_guardian_link_token: reverse sync after guardian write
-- =============================================
CREATE OR REPLACE FUNCTION core.redeem_guardian_link_token(
  p_token TEXT,
  p_shared_fields JSONB DEFAULT '["display_name","birth_date"]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_hash TEXT;
  v_row RECORD;
  v_parent_id UUID;
  v_profile RECORD;
  v_parent_customer_id UUID;
  v_relationship core.guardian_relationship := 'other';
  v_is_primary BOOLEAN := false;
  v_student_customer_id UUID;
  v_merged INT;
  v_links_synced INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_hash := encode(digest(upper(trim(p_token)), 'sha256'), 'hex');

  SELECT glt.*, s.display_name AS student_name, o.name AS org_name
  INTO v_row
  FROM core.guardian_link_tokens glt
  JOIN core.students s ON s.id = glt.student_id
  JOIN core.organizations o ON o.id = glt.organization_id
  WHERE glt.token_hash = v_hash
    AND glt.used_count < glt.max_uses
    AND (glt.expires_at IS NULL OR glt.expires_at > now())
  FOR UPDATE OF glt;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired link code';
  END IF;

  v_parent_id := core.ensure_global_parent_profile();
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Could not create parent profile';
  END IF;

  SELECT * INTO v_profile FROM core.profiles WHERE id = auth.uid();

  UPDATE core.parents
  SET name = COALESCE(NULLIF(name, '학부모'), v_profile.full_name, '학부모'),
      email = COALESCE(email, v_profile.email),
      updated_at = now()
  WHERE id = v_parent_id;

  v_student_customer_id := NULLIF(v_row.metadata->>'customer_id', '')::UUID;
  v_parent_customer_id := NULLIF(v_row.metadata->>'parent_customer_id', '')::UUID;

  IF v_parent_customer_id IS NOT NULL THEN
    IF v_parent_id <> v_parent_customer_id THEN
      UPDATE core.parents
      SET user_id = NULL, updated_at = now()
      WHERE id = v_parent_id AND user_id = auth.uid();
    END IF;

    UPDATE core.customers
    SET user_id = auth.uid(), updated_at = now()
    WHERE id = v_parent_customer_id AND organization_id = v_row.organization_id;

    INSERT INTO core.parents (id, user_id, name, phone, email)
    SELECT c.id, auth.uid(), c.name, c.phone, c.email
    FROM core.customers c
    WHERE c.id = v_parent_customer_id
    ON CONFLICT (id) DO UPDATE SET
      user_id = auth.uid(),
      name = COALESCE(EXCLUDED.name, core.parents.name),
      phone = COALESCE(EXCLUDED.phone, core.parents.phone),
      email = COALESCE(EXCLUDED.email, core.parents.email),
      updated_at = now();

    IF v_parent_id <> v_parent_customer_id THEN
      UPDATE core.parent_student_guardians
      SET parent_id = v_parent_customer_id, updated_at = now()
      WHERE parent_id = v_parent_id;

      DELETE FROM core.parents p
      WHERE p.id = v_parent_id
        AND NOT EXISTS (
          SELECT 1 FROM core.parent_student_guardians psg WHERE psg.parent_id = p.id
        );

      v_parent_id := v_parent_customer_id;
    END IF;
  END IF;

  v_parent_customer_id := core.ensure_org_parent_customer(v_parent_id, v_row.organization_id);

  IF v_student_customer_id IS NOT NULL AND v_parent_customer_id IS NOT NULL THEN
    SELECT psl.relationship, psl.is_primary
    INTO v_relationship, v_is_primary
    FROM core.parent_student_links psl
    WHERE psl.organization_id = v_row.organization_id
      AND psl.parent_customer_id = v_parent_customer_id
      AND psl.student_customer_id = v_student_customer_id
    LIMIT 1;
  END IF;

  IF v_is_primary THEN
    UPDATE core.parent_student_guardians
    SET is_primary = false, updated_at = now()
    WHERE parent_id = v_parent_id AND is_primary = true;
  END IF;

  INSERT INTO core.parent_student_guardians (parent_id, student_id, relationship, is_primary)
  VALUES (v_parent_id, v_row.student_id, COALESCE(v_relationship, 'other'), COALESCE(v_is_primary, false))
  ON CONFLICT (parent_id, student_id) DO UPDATE SET
    relationship = COALESCE(EXCLUDED.relationship, core.parent_student_guardians.relationship),
    is_primary = EXCLUDED.is_primary OR core.parent_student_guardians.is_primary,
    updated_at = now();

  v_merged := core.merge_parent_created_student_if_duplicate(v_parent_id, v_row.student_id);

  INSERT INTO core.academy_data_sharing_consents (
    parent_id, student_id, organization_id, shared_fields
  )
  VALUES (
    v_parent_id,
    v_row.student_id,
    v_row.organization_id,
    COALESCE(p_shared_fields, '["display_name","birth_date"]'::JSONB)
  )
  ON CONFLICT (parent_id, student_id, organization_id) DO UPDATE SET
    shared_fields = EXCLUDED.shared_fields,
    consented_at = now();

  UPDATE core.guardian_link_tokens
  SET used_count = used_count + 1
  WHERE id = v_row.id;

  v_links_synced := core.sync_parent_student_links_for_parent_org(v_parent_id, v_row.organization_id);

  RETURN jsonb_build_object(
    'success', true,
    'student_name', v_row.student_name,
    'organization_name', v_row.org_name,
    'organization_id', v_row.organization_id,
    'student_id', v_row.student_id,
    'merged_duplicates', v_merged,
    'links_synced', v_links_synced
  );
END;
$$;

-- =============================================
-- connect_parent_on_login: reverse sync after guardian sync
-- =============================================
CREATE OR REPLACE FUNCTION core.connect_parent_on_login()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_user_id UUID;
  v_inv RECORD;
  v_parent RECORD;
  v_connected INT := 0;
  v_results JSONB := '[]'::JSONB;
  v_global_parent_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('connected', 0, 'memberships', v_results); END IF;

  PERFORM core.sync_auth_providers_for_user(v_user_id);

  FOR v_inv IN
    SELECT pi.*, c.name, c.phone
    FROM core.parent_invitations pi
    JOIN core.customers c ON c.id = pi.parent_customer_id
    WHERE pi.status = 'pending'
      AND core.user_identity_matches_email(v_user_id, pi.email)
  LOOP
    UPDATE core.customers SET user_id = v_user_id, updated_at = now()
    WHERE id = v_inv.parent_customer_id AND organization_id = v_inv.organization_id;

    INSERT INTO core.parents (id, user_id, name, phone, email)
    VALUES (v_inv.parent_customer_id, v_user_id, v_inv.name, v_inv.phone, v_inv.email)
    ON CONFLICT (id) DO UPDATE SET user_id = v_user_id, updated_at = now()
    RETURNING id INTO v_global_parent_id;

    INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id)
    VALUES (v_global_parent_id, v_inv.organization_id, v_inv.parent_customer_id)
    ON CONFLICT (customer_id) DO UPDATE SET parent_id = EXCLUDED.parent_id, updated_at = now();

    PERFORM core.sync_guardians_for_parent_org(v_global_parent_id, v_inv.organization_id);
    PERFORM core.sync_parent_student_links_for_parent_org(v_global_parent_id, v_inv.organization_id);

    UPDATE core.parent_invitations SET status = 'accepted', accepted_at = now() WHERE id = v_inv.id;

    v_connected := v_connected + 1;
    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'organization_id', v_inv.organization_id,
      'parent_customer_id', v_inv.parent_customer_id
    ));
  END LOOP;

  FOR v_parent IN
    SELECT c.*
    FROM core.customers c
    WHERE c.metadata->>'entityType' = 'parent'
      AND c.user_id IS NULL
      AND core.user_identity_matches_email(v_user_id, c.email)
  LOOP
    UPDATE core.customers SET user_id = v_user_id, updated_at = now()
    WHERE id = v_parent.id;

    INSERT INTO core.parents (id, user_id, name, phone, email)
    VALUES (v_parent.id, v_user_id, v_parent.name, v_parent.phone, v_parent.email)
    ON CONFLICT (id) DO UPDATE SET user_id = v_user_id, updated_at = now()
    RETURNING id INTO v_global_parent_id;

    INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id)
    VALUES (v_global_parent_id, v_parent.organization_id, v_parent.id)
    ON CONFLICT (customer_id) DO UPDATE SET parent_id = EXCLUDED.parent_id, updated_at = now();

    PERFORM core.sync_guardians_for_parent_org(v_global_parent_id, v_parent.organization_id);
    PERFORM core.sync_parent_student_links_for_parent_org(v_global_parent_id, v_parent.organization_id);
  END LOOP;

  PERFORM core.ensure_global_parent_profile();

  RETURN jsonb_build_object('connected', v_connected, 'memberships', v_results);
END;
$$;

-- =============================================
-- One-time backfill: guardians with enrollments → links
-- =============================================
DO $$
DECLARE
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT DISTINCT psg.parent_id, se.organization_id
    FROM core.parent_student_guardians psg
    JOIN core.student_enrollments se ON se.student_id = psg.student_id
  LOOP
    PERFORM core.sync_parent_student_links_for_parent_org(v_rec.parent_id, v_rec.organization_id);
  END LOOP;
END $$;
