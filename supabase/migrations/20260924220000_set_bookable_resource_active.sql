-- Resource 활성 토글. practice_rooms 호환 행은 같이 갱신한다.
-- 새 테이블을 만들지 않는다. Core는 kind로 업종 분기하지 않는다.

CREATE OR REPLACE FUNCTION core.set_bookable_resource_active(
  p_org_id UUID,
  p_id UUID,
  p_active BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT core.is_org_staff_actor(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE core.bookable_resources
  SET is_active = p_active, updated_at = now()
  WHERE id = p_id
    AND organization_id = p_org_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Resource not found in organization';
  END IF;

  UPDATE core.practice_rooms
  SET is_active = p_active, updated_at = now()
  WHERE id = p_id
    AND organization_id = p_org_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION core.set_bookable_resource_active(UUID, UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.set_bookable_resource_active(UUID, UUID, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION core.set_bookable_resource_active IS
  '조직 스태프만 자원 활성 변경. 비활성 자원은 book_room_reservation_guarded 가 차단한다.';
