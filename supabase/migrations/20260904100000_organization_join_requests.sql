-- Organization Join Requests
-- Allow teachers/staff to request to join an organization
-- Directors/admins can approve or reject these requests

CREATE TABLE core.organization_join_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES core.profiles(id) ON DELETE CASCADE,
  requested_role  core.member_role NOT NULL DEFAULT 'staff',
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  message         TEXT,
  rejection_reason TEXT,
  approved_by     UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ,
  CONSTRAINT unique_pending_request UNIQUE (organization_id, user_id, status),
  CONSTRAINT requested_role_is_staff CHECK (requested_role = 'staff')
);

CREATE INDEX idx_join_requests_org_status ON core.organization_join_requests(organization_id, status);
CREATE INDEX idx_join_requests_user_status ON core.organization_join_requests(user_id, status);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.organization_join_requests
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE core.organization_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS: Users can see their own requests
CREATE POLICY join_requests_select_own ON core.organization_join_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- RLS: Org admins/owners can see requests for their orgs
CREATE POLICY join_requests_select_admin ON core.organization_join_requests
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM core.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
  );

-- RLS: Authenticated users can create requests
CREATE POLICY join_requests_insert ON core.organization_join_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS: Only org admins/owners can update (approve/reject)
CREATE POLICY join_requests_update ON core.organization_join_requests
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM core.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM core.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
  );

-- Submit a join request
CREATE OR REPLACE FUNCTION core.submit_join_request(
  p_org_id UUID,
  p_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_user_id UUID;
  v_request_id UUID;
  v_existing_member BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if organization exists
  IF NOT EXISTS (SELECT 1 FROM core.organizations WHERE id = p_org_id AND is_active = true) THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- Check if already a member
  SELECT EXISTS (
    SELECT 1 FROM core.organization_members
    WHERE organization_id = p_org_id
      AND user_id = v_user_id
      AND is_active = true
  ) INTO v_existing_member;

  IF v_existing_member THEN
    RAISE EXCEPTION 'Already a member of this organization';
  END IF;

  -- Check for existing pending request
  IF EXISTS (
    SELECT 1 FROM core.organization_join_requests
    WHERE organization_id = p_org_id
      AND user_id = v_user_id
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'You already have a pending request for this organization';
  END IF;

  -- Create the request
  INSERT INTO core.organization_join_requests (
    organization_id,
    user_id,
    requested_role,
    message,
    status
  )
  VALUES (
    p_org_id,
    v_user_id,
    'staff',
    p_message,
    'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- Approve a join request
CREATE OR REPLACE FUNCTION core.approve_join_request(
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_request RECORD;
  v_staff_id UUID;
  v_member_id UUID;
  v_user_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get request details
  SELECT * INTO v_request
  FROM core.organization_join_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request is not pending';
  END IF;

  -- Check permissions
  IF NOT core.is_org_admin(v_request.organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Get user's name
  SELECT full_name INTO v_user_name
  FROM core.profiles
  WHERE id = v_request.user_id;

  -- Create staff record
  INSERT INTO core.staff (
    organization_id,
    user_id,
    name,
    email,
    status
  )
  SELECT
    v_request.organization_id,
    v_request.user_id,
    COALESCE(v_user_name, p.email),
    p.email,
    'active'
  FROM core.profiles p
  WHERE p.id = v_request.user_id
  RETURNING id INTO v_staff_id;

  -- Create organization membership
  INSERT INTO core.organization_members (
    organization_id,
    user_id,
    role,
    staff_id,
    is_active
  )
  VALUES (
    v_request.organization_id,
    v_request.user_id,
    v_request.requested_role,
    v_staff_id,
    true
  )
  RETURNING id INTO v_member_id;

  -- Update request status
  UPDATE core.organization_join_requests
  SET
    status = 'approved',
    approved_by = auth.uid(),
    resolved_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'request_id', p_request_id,
    'member_id', v_member_id,
    'staff_id', v_staff_id,
    'organization_id', v_request.organization_id,
    'user_id', v_request.user_id
  );
END;
$$;

-- Reject a join request
CREATE OR REPLACE FUNCTION core.reject_join_request(
  p_request_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_request RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get request details
  SELECT * INTO v_request
  FROM core.organization_join_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request is not pending';
  END IF;

  -- Check permissions
  IF NOT core.is_org_admin(v_request.organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Update request status
  UPDATE core.organization_join_requests
  SET
    status = 'rejected',
    rejection_reason = p_reason,
    approved_by = auth.uid(),
    resolved_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  RETURN true;
END;
$$;

-- Get join requests for an organization
CREATE OR REPLACE FUNCTION core.get_organization_join_requests(
  p_org_id UUID,
  p_status TEXT DEFAULT 'pending'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT core.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::JSONB), '[]'::JSONB)
  INTO v_result
  FROM (
    SELECT
      r.id,
      r.organization_id,
      r.user_id,
      r.requested_role,
      r.status,
      r.message,
      r.rejection_reason,
      r.created_at,
      r.resolved_at,
      p.full_name AS user_name,
      p.email AS user_email,
      approver.full_name AS approved_by_name
    FROM core.organization_join_requests r
    JOIN core.profiles p ON p.id = r.user_id
    LEFT JOIN core.profiles approver ON approver.id = r.approved_by
    WHERE r.organization_id = p_org_id
      AND (p_status IS NULL OR r.status = p_status)
    ORDER BY
      CASE r.status
        WHEN 'pending' THEN 1
        WHEN 'approved' THEN 2
        WHEN 'rejected' THEN 3
      END,
      r.created_at DESC
  ) t;

  RETURN v_result;
END;
$$;

-- Get user's own join requests
CREATE OR REPLACE FUNCTION core.get_my_join_requests()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
DECLARE
  v_result JSONB;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::JSONB), '[]'::JSONB)
  INTO v_result
  FROM (
    SELECT
      r.id,
      r.organization_id,
      r.requested_role,
      r.status,
      r.message,
      r.rejection_reason,
      r.created_at,
      r.resolved_at,
      o.name AS organization_name,
      o.industry_type
    FROM core.organization_join_requests r
    JOIN core.organizations o ON o.id = r.organization_id
    WHERE r.user_id = v_user_id
    ORDER BY
      CASE r.status
        WHEN 'pending' THEN 1
        WHEN 'approved' THEN 2
        WHEN 'rejected' THEN 3
      END,
      r.created_at DESC
  ) t;

  RETURN v_result;
END;
$$;

-- Revoke anon execute on SECURITY DEFINER functions (security best practice)
REVOKE EXECUTE ON FUNCTION core.submit_join_request(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION core.approve_join_request(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION core.reject_join_request(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION core.get_organization_join_requests(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION core.get_my_join_requests() FROM anon;

GRANT EXECUTE ON FUNCTION core.submit_join_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.approve_join_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.reject_join_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.get_organization_join_requests(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.get_my_join_requests() TO authenticated;

GRANT SELECT, INSERT, UPDATE ON core.organization_join_requests TO authenticated;
