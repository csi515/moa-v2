-- 조직 예약 조회에 exclusive toDate 추가. 기존 호출은 p_to_date NULL로 동작 유지.

BEGIN;

DROP FUNCTION IF EXISTS core.get_organization_reservations(UUID, core.reservation_status, TIMESTAMPTZ, INT, INT);

CREATE OR REPLACE FUNCTION core.get_organization_reservations(
  p_org_id UUID,
  p_status core.reservation_status DEFAULT NULL,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0,
  p_to_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  schedule_id UUID,
  schedule_title TEXT,
  schedule_starts_at TIMESTAMPTZ,
  schedule_ends_at TIMESTAMPTZ,
  customer_id UUID,
  applicant_name TEXT,
  applicant_phone TEXT,
  applicant_email TEXT,
  request_message TEXT,
  status core.reservation_status,
  confirmed_by_name TEXT,
  confirmed_at TIMESTAMPTZ,
  cancelled_by_name TEXT,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT
    r.id,
    r.schedule_id,
    s.title AS schedule_title,
    s.starts_at AS schedule_starts_at,
    s.ends_at AS schedule_ends_at,
    r.customer_id,
    r.applicant_name,
    r.applicant_phone,
    r.applicant_email,
    r.request_message,
    r.status,
    p_confirmed.full_name AS confirmed_by_name,
    r.confirmed_at,
    p_cancelled.full_name AS cancelled_by_name,
    r.cancelled_at,
    r.cancel_reason,
    r.created_at
  FROM core.reservations r
  INNER JOIN core.schedules s ON s.id = r.schedule_id
  LEFT JOIN core.profiles p_confirmed ON p_confirmed.id = r.confirmed_by
  LEFT JOIN core.profiles p_cancelled ON p_cancelled.id = r.cancelled_by
  WHERE r.organization_id = p_org_id
    AND (p_status IS NULL OR r.status = p_status)
    AND (p_from_date IS NULL OR s.starts_at >= p_from_date)
    AND (p_to_date IS NULL OR s.starts_at < p_to_date)
    AND core.is_org_owner_or_admin(p_org_id)
  ORDER BY
    CASE r.status
      WHEN 'requested' THEN 1
      WHEN 'confirmed' THEN 2
      WHEN 'cancelled' THEN 3
    END,
    s.starts_at DESC,
    r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

COMMENT ON FUNCTION core.get_organization_reservations(
  UUID, core.reservation_status, TIMESTAMPTZ, INT, INT, TIMESTAMPTZ
) IS
  '조직 예약 목록. from/to는 starts_at 반개 구간. 기존 5인자 호출은 toDate NULL.';

GRANT EXECUTE ON FUNCTION core.get_organization_reservations(
  UUID, core.reservation_status, TIMESTAMPTZ, INT, INT, TIMESTAMPTZ
) TO authenticated;
REVOKE EXECUTE ON FUNCTION core.get_organization_reservations(
  UUID, core.reservation_status, TIMESTAMPTZ, INT, INT, TIMESTAMPTZ
) FROM anon;

COMMIT;
