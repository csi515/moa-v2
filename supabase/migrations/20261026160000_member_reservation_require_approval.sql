-- 사내 직원 공용자원 예약: bookable_resources.metadata.require_approval 존중

BEGIN;

CREATE OR REPLACE FUNCTION core.request_member_room_reservation(
  p_org_id UUID,
  p_room_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_memo TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_meta jsonb;
  v_status core.room_reservation_status := 'approved';
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT core.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  SELECT COALESCE(metadata, '{}'::jsonb)
    INTO v_meta
  FROM core.bookable_resources
  WHERE id = p_room_id
    AND organization_id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resource not found';
  END IF;

  IF COALESCE((v_meta->>'require_approval')::boolean, false) THEN
    v_status := 'pending';
  END IF;

  RETURN core.book_room_reservation_guarded(
    p_org_id,
    p_room_id,
    NULL,
    auth.uid(),
    p_starts_at,
    p_ends_at,
    v_status,
    p_memo,
    CASE WHEN v_status = 'approved' THEN auth.uid() ELSE NULL END
  );
END;
$$;

COMMENT ON FUNCTION core.request_member_room_reservation IS
  '사내 직원 공용자원 예약. metadata.require_approval=true이면 pending, 아니면 approved.';

GRANT EXECUTE ON FUNCTION core.request_member_room_reservation(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT)
  TO authenticated;

COMMIT;
