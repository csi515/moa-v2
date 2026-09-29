-- Applicant can cancel own pending join request; list with organization name

CREATE OR REPLACE FUNCTION core.cancel_my_customer_join_request(p_request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_row core.customer_join_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row
  FROM core.customer_join_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_row.applicant_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending requests can be cancelled';
  END IF;

  UPDATE core.customer_join_requests
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = p_request_id;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION core.cancel_my_customer_join_request(UUID) IS
  '성인 수강생이 본인 pending 가입 신청을 취소';

CREATE OR REPLACE FUNCTION core.list_my_customer_join_requests()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN COALESCE(
    (
      SELECT json_agg(row_to_json(x) ORDER BY x.created_at DESC)
      FROM (
        SELECT
          r.id,
          r.organization_id,
          o.name AS organization_name,
          o.public_code AS organization_public_code,
          r.applicant_user_id,
          r.applicant_name,
          r.applicant_phone,
          r.applicant_email,
          r.request_type,
          r.message,
          r.customer_metadata,
          r.status,
          r.reviewed_by,
          r.reviewed_at,
          r.reject_reason,
          r.created_at,
          r.updated_at
        FROM core.customer_join_requests r
        LEFT JOIN core.organizations o ON o.id = r.organization_id
        WHERE r.applicant_user_id = auth.uid()
      ) x
    ),
    '[]'::json
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.cancel_my_customer_join_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.list_my_customer_join_requests() TO authenticated;
