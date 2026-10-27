-- Phase 1: Staff account linking — invitations + connect on login

CREATE TABLE core.staff_invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  staff_id        UUID NOT NULL REFERENCES core.staff(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  role            core.member_role NOT NULL DEFAULT 'staff',
  invited_by      UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at     TIMESTAMPTZ,
  UNIQUE (organization_id, staff_id)
);

CREATE INDEX idx_staff_invitations_email ON core.staff_invitations (lower(email), status);
CREATE INDEX idx_staff_invitations_org ON core.staff_invitations (organization_id, status);

ALTER TABLE core.staff_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_invitations_select ON core.staff_invitations
  FOR SELECT TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR lower(email) = lower((SELECT email FROM core.profiles WHERE id = auth.uid()))
  );

CREATE POLICY staff_invitations_insert ON core.staff_invitations
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY staff_invitations_update ON core.staff_invitations
  FOR UPDATE TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY staff_invitations_delete ON core.staff_invitations
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- Invite a staff member to create/login an account
CREATE OR REPLACE FUNCTION core.invite_staff_member(
  p_org_id UUID,
  p_staff_id UUID,
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_email TEXT;
  v_staff RECORD;
  v_profile_id UUID;
  v_member_id UUID;
  v_invitation_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT core.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_email := lower(trim(p_email));
  IF v_email = '' OR v_email NOT LIKE '%@%' THEN
    RAISE EXCEPTION 'Valid email is required';
  END IF;

  SELECT * INTO v_staff
  FROM core.staff
  WHERE id = p_staff_id AND organization_id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff not found';
  END IF;

  UPDATE core.staff
  SET email = v_email, updated_at = now()
  WHERE id = p_staff_id;

  -- Already linked to an account
  IF v_staff.user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'connected',
      'staff_id', p_staff_id,
      'user_id', v_staff.user_id
    );
  END IF;

  -- Existing user with same email → connect immediately
  SELECT id INTO v_profile_id
  FROM core.profiles
  WHERE lower(email) = v_email
  LIMIT 1;

  IF v_profile_id IS NOT NULL THEN
    UPDATE core.staff
    SET user_id = v_profile_id, updated_at = now()
    WHERE id = p_staff_id;

    INSERT INTO core.organization_members (organization_id, user_id, role, staff_id)
    VALUES (p_org_id, v_profile_id, 'staff', p_staff_id)
    ON CONFLICT (organization_id, user_id)
    DO UPDATE SET
      role = EXCLUDED.role,
      staff_id = EXCLUDED.staff_id,
      is_active = true,
      updated_at = now()
    RETURNING id INTO v_member_id;

    UPDATE core.staff_invitations
    SET status = 'accepted', accepted_at = now()
    WHERE organization_id = p_org_id AND staff_id = p_staff_id;

    RETURN jsonb_build_object(
      'status', 'connected',
      'staff_id', p_staff_id,
      'user_id', v_profile_id,
      'member_id', v_member_id
    );
  END IF;

  -- No account yet → store pending invitation
  INSERT INTO core.staff_invitations (
    organization_id, staff_id, email, role, invited_by, status
  )
  VALUES (p_org_id, p_staff_id, v_email, 'staff', auth.uid(), 'pending')
  ON CONFLICT (organization_id, staff_id)
  DO UPDATE SET
    email = EXCLUDED.email,
    status = 'pending',
    invited_by = EXCLUDED.invited_by,
    accepted_at = NULL
  RETURNING id INTO v_invitation_id;

  RETURN jsonb_build_object(
    'status', 'invited',
    'staff_id', p_staff_id,
    'invitation_id', v_invitation_id,
    'email', v_email
  );
END;
$$;

-- Connect pending invitations when staff logs in
CREATE OR REPLACE FUNCTION core.connect_staff_on_login()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_inv RECORD;
  v_connected INT := 0;
  v_results JSONB := '[]'::JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_email FROM core.profiles WHERE id = v_user_id;
  IF v_email IS NULL OR trim(v_email) = '' THEN
    RETURN jsonb_build_object('connected', 0, 'memberships', v_results);
  END IF;

  FOR v_inv IN
    SELECT si.*
    FROM core.staff_invitations si
    WHERE lower(si.email) = lower(v_email)
      AND si.status = 'pending'
  LOOP
    UPDATE core.staff
    SET user_id = v_user_id, updated_at = now()
    WHERE id = v_inv.staff_id AND organization_id = v_inv.organization_id;

    INSERT INTO core.organization_members (organization_id, user_id, role, staff_id)
    VALUES (v_inv.organization_id, v_user_id, v_inv.role, v_inv.staff_id)
    ON CONFLICT (organization_id, user_id)
    DO UPDATE SET
      role = EXCLUDED.role,
      staff_id = EXCLUDED.staff_id,
      is_active = true,
      updated_at = now();

    UPDATE core.staff_invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = v_inv.id;

    v_connected := v_connected + 1;
    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'organization_id', v_inv.organization_id,
        'staff_id', v_inv.staff_id
      )
    );
  END LOOP;

  RETURN jsonb_build_object('connected', v_connected, 'memberships', v_results);
END;
$$;

-- Revoke a pending invitation
CREATE OR REPLACE FUNCTION core.revoke_staff_invitation(
  p_org_id UUID,
  p_staff_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE core.staff_invitations
  SET status = 'revoked'
  WHERE organization_id = p_org_id
    AND staff_id = p_staff_id
    AND status = 'pending';

  RETURN FOUND;
END;
$$;

-- Account link status for staff list UI
CREATE OR REPLACE FUNCTION core.get_staff_account_statuses(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::JSONB), '[]'::JSONB)
  INTO v_result
  FROM (
    SELECT
      s.id AS staff_id,
      CASE
        WHEN s.user_id IS NOT NULL THEN 'connected'
        WHEN si.status = 'pending' THEN 'invited'
        ELSE 'none'
      END AS status,
      s.email,
      si.created_at AS invited_at
    FROM core.staff s
    LEFT JOIN core.staff_invitations si
      ON si.staff_id = s.id
      AND si.organization_id = s.organization_id
      AND si.status = 'pending'
    WHERE s.organization_id = p_org_id
  ) t;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION core.invite_staff_member(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.connect_staff_on_login() TO authenticated;
GRANT EXECUTE ON FUNCTION core.revoke_staff_invitation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.get_staff_account_statuses(UUID) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON core.staff_invitations TO authenticated;
