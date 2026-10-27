-- 지점 접근(locations.read)과 고객 조회(customers.read)를 분리한다.
-- 기존 RLS / customers.read 의미 / location 테이블 구조는 바꾸지 않는다.

BEGIN;

INSERT INTO core.permission_catalog (permission, resource, action, description)
VALUES ('locations.read', 'locations', 'read', '지점 접근')
ON CONFLICT (permission) DO NOTHING;

CREATE OR REPLACE FUNCTION core.role_has_default_permission(
  p_role core.member_role,
  p_permission TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT CASE
    WHEN p_role IN ('owner'::core.member_role, 'admin'::core.member_role, 'manager'::core.member_role) THEN
      core.is_known_permission(p_permission)
    WHEN p_role IN ('staff'::core.member_role, 'instructor'::core.member_role) THEN
      p_permission = ANY (ARRAY[
        'customers.read',
        'customers.write',
        'sales.read',
        'sales.create',
        'sales.refund',
        'locations.read',
        'rooms.read',
        'staff.read',
        'reports.read'
      ]::text[])
    ELSE false
  END;
$$;

COMMENT ON FUNCTION core.role_has_default_permission(core.member_role, TEXT) IS
  '역할 기본 권한. src/core/authorization/roleDefaults.ts 와 키가 동일해야 한다.';

COMMIT;
