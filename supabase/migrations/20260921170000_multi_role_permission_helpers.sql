-- multi-role: 권한 helper를 EXISTS 기반으로 고정 (get_org_role 단일 반환 의존 제거)
-- active_membership_id(UI 컨텍스트)와 권한 판정을 혼동하지 않음 — auth.uid()+org+is_active만 사용

BEGIN;

-- 활성 membership 중 지정 role 중 하나라도 있으면하면 true
CREATE OR REPLACE FUNCTION core.has_any_org_role(
  org_id UUID,
  roles core.member_role[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT COALESCE(roles, ARRAY[]::core.member_role[]) <> ARRAY[]::core.member_role[]
    AND EXISTS (
      SELECT 1
      FROM core.organization_members m
      WHERE m.organization_id = org_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
        AND m.role = ANY (roles)
    );
$$;

COMMENT ON FUNCTION core.has_any_org_role(UUID, core.member_role[]) IS
  '동일 org에 활성 multi-role이 있어도 지정 role 중 하나면 true. active_membership_id와 무관.';

CREATE OR REPLACE FUNCTION core.has_org_role(
  org_id UUID,
  want_role core.member_role
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT core.has_any_org_role(org_id, ARRAY[want_role]::core.member_role[]);
$$;

COMMENT ON FUNCTION core.has_org_role(UUID, core.member_role) IS
  '동일 org 활성 membership에 해당 role이 있으면 true (multi-role 안전).';

GRANT EXECUTE ON FUNCTION core.has_any_org_role(UUID, core.member_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION core.has_org_role(UUID, core.member_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION core.has_any_org_role(UUID, core.member_role[]) FROM anon;
REVOKE EXECUTE ON FUNCTION core.has_org_role(UUID, core.member_role) FROM anon;

-- 단일 role 조회가 필요할 때: 권한 우선순위로 deterministic
CREATE OR REPLACE FUNCTION core.get_org_role(org_id UUID)
RETURNS core.member_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT m.role
  FROM core.organization_members m
  WHERE m.organization_id = org_id
    AND m.user_id = auth.uid()
    AND m.is_active = true
  ORDER BY
    CASE m.role
      WHEN 'owner'::core.member_role THEN 1
      WHEN 'admin'::core.member_role THEN 2
      WHEN 'manager'::core.member_role THEN 3
      WHEN 'staff'::core.member_role THEN 4
      WHEN 'instructor'::core.member_role THEN 5
      WHEN 'parent'::core.member_role THEN 6
      WHEN 'guardian'::core.member_role THEN 7
      WHEN 'member'::core.member_role THEN 8
      WHEN 'customer'::core.member_role THEN 9
      ELSE 99
    END,
    m.id
  LIMIT 1;
$$;

COMMENT ON FUNCTION core.get_org_role(UUID) IS
  '활성 membership 중 권한 우선순위가 가장 높은 단일 role (deterministic). '
  '권한 판정에는 has_any_org_role / is_org_admin 등을 사용.';

-- 권한 helper: get_org_role 단일값에 의존하지 않음
CREATE OR REPLACE FUNCTION core.is_org_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT core.has_any_org_role(
    org_id,
    ARRAY['owner', 'admin', 'manager']::core.member_role[]
  );
$$;

CREATE OR REPLACE FUNCTION core.is_org_owner_or_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT core.has_any_org_role(
    org_id,
    ARRAY['owner', 'admin']::core.member_role[]
  );
$$;

CREATE OR REPLACE FUNCTION core.is_org_owner(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT core.has_org_role(org_id, 'owner'::core.member_role);
$$;

CREATE OR REPLACE FUNCTION core.is_org_staff(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT core.has_org_role(org_id, 'staff'::core.member_role);
$$;

CREATE OR REPLACE FUNCTION core.is_org_parent(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT core.has_org_role(org_id, 'parent'::core.member_role);
$$;

COMMENT ON FUNCTION core.is_org_admin(UUID) IS
  'owner/admin/manager 중 하나라도 활성 membership이면 true (multi-role 안전).';
COMMENT ON FUNCTION core.is_org_owner_or_admin(UUID) IS
  'owner/admin 중 하나라도 활성 membership이면 true (multi-role 안전).';
COMMENT ON FUNCTION core.is_org_owner(UUID) IS
  'owner 활성 membership 존재 여부 (multi-role 안전).';
COMMENT ON FUNCTION core.is_org_staff(UUID) IS
  'staff 활성 membership 존재 여부 (instructor와 별개, multi-role 안전).';
COMMENT ON FUNCTION core.is_org_parent(UUID) IS
  'parent 활성 membership 존재 여부 (multi-role 안전).';

-- point SELECT: get_org_role IN (...) → has_any_org_role (의미 동일, multi-role 안전)
DROP POLICY IF EXISTS core_point_accounts_select ON core.point_accounts;
CREATE POLICY core_point_accounts_select
  ON core.point_accounts
  FOR SELECT TO authenticated
  USING (
    core.is_my_customer(organization_id, customer_id)
    OR core.has_any_org_role(
      organization_id,
      ARRAY[
        'owner'::core.member_role,
        'admin'::core.member_role,
        'manager'::core.member_role,
        'staff'::core.member_role,
        'instructor'::core.member_role
      ]
    )
  );

DROP POLICY IF EXISTS core_point_transactions_select ON core.point_transactions;
CREATE POLICY core_point_transactions_select
  ON core.point_transactions
  FOR SELECT TO authenticated
  USING (
    core.is_my_customer(organization_id, customer_id)
    OR core.has_any_org_role(
      organization_id,
      ARRAY[
        'owner'::core.member_role,
        'admin'::core.member_role,
        'manager'::core.member_role,
        'staff'::core.member_role,
        'instructor'::core.member_role
      ]
    )
  );

COMMIT;
