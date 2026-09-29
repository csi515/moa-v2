-- LocationAware 도메인 전략 helper.
-- 기존 테이블에 location_id 를 추가하지 않는다.
-- 기존 RLS / RPC / Core 도메인 동작을 바꾸지 않는다.

BEGIN;

COMMENT ON TABLE core.locations IS
  '영업 지점. Organization 이 테넌트 경계. '
  '신규 location-scoped 테이블만 organization_id + location_id(NOT NULL) 패턴을 쓴다. '
  '기존 customers/products/staff/sales/schedules 등에는 location_id 를 일괄 추가하지 않는다.';

CREATE OR REPLACE FUNCTION core.location_belongs_to_organization(
  p_organization_id UUID,
  p_location_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT p_organization_id IS NOT NULL
    AND p_location_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM core.locations l
      WHERE l.id = p_location_id
        AND l.organization_id = p_organization_id
    );
$$;

CREATE OR REPLACE FUNCTION core.assert_location_in_organization(
  p_organization_id UUID,
  p_location_id UUID,
  p_required BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;

  IF p_location_id IS NULL THEN
    IF p_required THEN
      RAISE EXCEPTION 'Location required';
    END IF;
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM core.locations l WHERE l.id = p_location_id
  ) THEN
    RAISE EXCEPTION 'Location not found';
  END IF;

  IF NOT core.location_belongs_to_organization(p_organization_id, p_location_id) THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;

  RETURN p_location_id;
END;
$$;

-- 선택 지점 조회 호환: 선택 없음=조직 전체, row location 없음=레거시 포함
CREATE OR REPLACE FUNCTION core.location_aware_visible(
  p_row_location_id UUID,
  p_selected_location_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_selected_location_id IS NULL
    OR p_row_location_id IS NULL
    OR p_row_location_id = p_selected_location_id;
$$;

COMMENT ON FUNCTION core.location_belongs_to_organization(UUID, UUID) IS
  'location 이 해당 organization 소속인지. null location 은 false. 기존 RLS를 교체하지 않는다.';
COMMENT ON FUNCTION core.assert_location_in_organization(UUID, UUID, BOOLEAN) IS
  '신규 location-scoped 쓰기용. p_required=false 이고 location null 이면 NULL 반환(기존 레코드 호환).';
COMMENT ON FUNCTION core.location_aware_visible(UUID, UUID) IS
  '선택 지점 필터. selected null → 전체. row location null → 레거시 포함. 기존 조회에 적용하지 않는다.';

GRANT EXECUTE ON FUNCTION core.location_belongs_to_organization(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.assert_location_in_organization(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION core.location_aware_visible(UUID, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION core.location_belongs_to_organization(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION core.assert_location_in_organization(UUID, UUID, BOOLEAN) FROM anon;
REVOKE EXECUTE ON FUNCTION core.location_aware_visible(UUID, UUID) FROM anon;

COMMIT;
