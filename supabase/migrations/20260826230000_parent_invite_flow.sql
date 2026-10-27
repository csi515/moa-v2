-- Phase 2: Parent invite flow — auto link codes + invitation metadata

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================
-- Create guardian link tokens for all children of a parent
-- =============================================
CREATE OR REPLACE FUNCTION core.create_parent_invite_link_tokens(
  p_org_id UUID,
  p_parent_customer_id UUID,
  p_expires_days INT DEFAULT 14
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_link RECORD;
  v_token TEXT;
  v_hash TEXT;
  v_expires TIMESTAMPTZ;
  v_codes JSONB := '[]'::JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_expires := now() + make_interval(days => GREATEST(p_expires_days, 1));

  FOR v_link IN
    SELECT
      psl.student_customer_id,
      c.name AS student_name,
      se.id AS enrollment_id,
      se.student_id
    FROM core.parent_student_links psl
    JOIN core.customers c ON c.id = psl.student_customer_id
    JOIN core.student_enrollments se
      ON se.customer_id = psl.student_customer_id
      AND se.organization_id = p_org_id
    WHERE psl.organization_id = p_org_id
      AND psl.parent_customer_id = p_parent_customer_id
  LOOP
    v_token := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    v_hash := encode(digest(v_token, 'sha256'), 'hex');

    INSERT INTO core.guardian_link_tokens (
      organization_id, student_id, enrollment_id, token_hash, token_type,
      expires_at, max_uses, created_by, metadata
    )
    VALUES (
      p_org_id,
      v_link.student_id,
      v_link.enrollment_id,
      v_hash,
      'invite_code',
      v_expires,
      1,
      auth.uid(),
      jsonb_build_object(
        'student_name', v_link.student_name,
        'customer_id', v_link.student_customer_id,
        'parent_customer_id', p_parent_customer_id,
        'source', 'parent_invite'
      )
    );

    v_codes := v_codes || jsonb_build_array(jsonb_build_object(
      'token', v_token,
      'student_name', v_link.student_name,
      'customer_id', v_link.student_customer_id,
      'expires_at', v_expires
    ));
  END LOOP;

  RETURN v_codes;
END;
$$;

GRANT EXECUTE ON FUNCTION core.create_parent_invite_link_tokens(UUID, UUID, INT) TO authenticated;

-- =============================================
-- invite_parent_member v3: auto link codes on invite
-- =============================================
CREATE OR REPLACE FUNCTION core.invite_parent_member(
  p_org_id UUID,
  p_parent_customer_id UUID,
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_email TEXT;
  v_parent RECORD;
  v_org_name TEXT;
  v_profile_id UUID;
  v_invitation_id UUID;
  v_global_parent_id UUID;
  v_link_codes JSONB := '[]'::JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_email := lower(trim(p_email));
  IF v_email = '' OR v_email NOT LIKE '%@%' THEN
    RAISE EXCEPTION 'Valid email is required';
  END IF;

  SELECT * INTO v_parent
  FROM core.customers
  WHERE id = p_parent_customer_id AND organization_id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent not found';
  END IF;

  SELECT name INTO v_org_name FROM core.organizations WHERE id = p_org_id;

  UPDATE core.customers SET email = v_email, updated_at = now()
  WHERE id = p_parent_customer_id;

  INSERT INTO core.parents (id, user_id, name, phone, email)
  VALUES (p_parent_customer_id, v_parent.user_id, v_parent.name, v_parent.phone, v_email)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    updated_at = now()
  RETURNING id INTO v_global_parent_id;

  INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id)
  VALUES (v_global_parent_id, p_org_id, p_parent_customer_id)
  ON CONFLICT (customer_id) DO UPDATE SET parent_id = EXCLUDED.parent_id, updated_at = now();

  IF v_parent.user_id IS NOT NULL THEN
    UPDATE core.parents SET user_id = v_parent.user_id, updated_at = now()
    WHERE id = v_global_parent_id;

    PERFORM core.sync_guardians_for_parent_org(v_global_parent_id, p_org_id);

    RETURN jsonb_build_object(
      'status', 'connected',
      'parent_customer_id', p_parent_customer_id,
      'user_id', v_parent.user_id,
      'organization_name', v_org_name,
      'link_codes', '[]'::JSONB
    );
  END IF;

  SELECT id INTO v_profile_id FROM core.profiles WHERE lower(email) = v_email LIMIT 1;

  IF v_profile_id IS NOT NULL THEN
    UPDATE core.customers SET user_id = v_profile_id, updated_at = now()
    WHERE id = p_parent_customer_id;

    UPDATE core.parents SET user_id = v_profile_id, updated_at = now()
    WHERE id = v_global_parent_id;

    UPDATE core.parent_invitations SET status = 'accepted', accepted_at = now()
    WHERE organization_id = p_org_id AND parent_customer_id = p_parent_customer_id;

    PERFORM core.sync_guardians_for_parent_org(v_global_parent_id, p_org_id);

    RETURN jsonb_build_object(
      'status', 'connected',
      'parent_customer_id', p_parent_customer_id,
      'user_id', v_profile_id,
      'organization_name', v_org_name,
      'link_codes', '[]'::JSONB
    );
  END IF;

  INSERT INTO core.parent_invitations (organization_id, parent_customer_id, email, role, invited_by, status)
  VALUES (p_org_id, p_parent_customer_id, v_email, 'parent', auth.uid(), 'pending')
  ON CONFLICT (organization_id, parent_customer_id)
  DO UPDATE SET email = EXCLUDED.email, status = 'pending', invited_by = EXCLUDED.invited_by, accepted_at = NULL
  RETURNING id INTO v_invitation_id;

  v_link_codes := core.create_parent_invite_link_tokens(p_org_id, p_parent_customer_id, 14);

  RETURN jsonb_build_object(
    'status', 'invited',
    'parent_customer_id', p_parent_customer_id,
    'invitation_id', v_invitation_id,
    'email', v_email,
    'organization_name', v_org_name,
    'link_codes', v_link_codes
  );
END;
$$;
