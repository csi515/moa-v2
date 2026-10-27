-- Retail Staff 판매/반품 권한 정합성
-- UI(plugin staffTabs: sales·members·income·inventory조회)와 DB 게이트를 맞춤.
-- is_org_admin(owner/admin/manager)은 확대하지 않음.
-- 판매·반품·판매연동 포인트만 is_org_staff_actor(staff/instructor 포함)로 허용.
-- 재고 inbound/adjustment(apply_stock_movement)·상품 쓰기 등은 admin 유지.

BEGIN;

-- multi-role 헬퍼와 동일 계약으로 정렬 (active_membership_id 무관)
CREATE OR REPLACE FUNCTION core.is_org_staff_actor(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT core.has_any_org_role(
    p_org_id,
    ARRAY[
      'owner'::core.member_role,
      'admin'::core.member_role,
      'manager'::core.member_role,
      'staff'::core.member_role,
      'instructor'::core.member_role
    ]
  );
$$;

COMMENT ON FUNCTION core.is_org_staff_actor(UUID) IS
  '판매·반품 등 현장 업무 가능 역할(owner/admin/manager/staff/instructor). '
  '학부모·고객 제외. is_org_admin을 대체하지 않음.';

-- RPC 권한 게이트: is_org_admin → is_org_staff_actor (대상 함수만)
DO $$
DECLARE
  r RECORD;
  def TEXT;
  old_gate TEXT := 'IF NOT core.is_org_admin(p_organization_id) THEN';
  new_gate TEXT := 'IF NOT core.is_org_staff_actor(p_organization_id) THEN';
BEGIN
  FOR r IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'core'
      AND p.proname IN (
        'create_sale',
        'create_sale_return',
        'apply_point_redeem_for_sale',
        'apply_point_earn_for_sale',
        'apply_point_adjust_for_sale_return'
      )
  LOOP
    def := pg_get_functiondef(r.oid);
    IF position(old_gate in def) = 0 THEN
      IF position(new_gate in def) > 0 THEN
        CONTINUE; -- 이미 적용됨
      END IF;
      RAISE EXCEPTION 'permission gate not found in %', r.proname;
    END IF;
    def := replace(def, old_gate, new_gate);
    EXECUTE def;
  END LOOP;
END $$;

-- apply_stock_movement 는 admin 전용 유지 (입고·조정)
DO $$
DECLARE
  def TEXT;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'core' AND p.proname = 'apply_stock_movement';

  IF def IS NULL THEN
    RAISE EXCEPTION 'apply_stock_movement missing';
  END IF;
  IF position('is_org_staff_actor(p_organization_id)' in def) > 0 THEN
    RAISE EXCEPTION 'apply_stock_movement must remain is_org_admin-only';
  END IF;
  IF position('IF NOT core.is_org_admin(p_organization_id) THEN' in def) = 0 THEN
    RAISE EXCEPTION 'apply_stock_movement admin gate missing';
  END IF;
END $$;

-- RLS: 판매/반품 INSERT만 staff_actor 허용 (UPDATE/DELETE는 기존 admin FOR ALL 유지)
DROP POLICY IF EXISTS core_sales_staff_insert ON core.sales;
CREATE POLICY core_sales_staff_insert
  ON core.sales
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_staff_actor(organization_id));

DROP POLICY IF EXISTS core_sale_items_staff_insert ON core.sale_items;
CREATE POLICY core_sale_items_staff_insert
  ON core.sale_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM core.sales s
      WHERE s.id = sale_id
        AND core.is_org_staff_actor(s.organization_id)
    )
  );

DROP POLICY IF EXISTS core_sale_returns_staff_insert ON core.sale_returns;
CREATE POLICY core_sale_returns_staff_insert
  ON core.sale_returns
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_staff_actor(organization_id));

DROP POLICY IF EXISTS core_sale_return_items_staff_insert ON core.sale_return_items;
CREATE POLICY core_sale_return_items_staff_insert
  ON core.sale_return_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM core.sale_returns r
      WHERE r.id = sale_return_id
        AND core.is_org_staff_actor(r.organization_id)
    )
  );

COMMENT ON POLICY core_sales_staff_insert ON core.sales IS
  'Staff/instructor 판매 INSERT (create_sale RPC·직접 insert). 상품/재고 관리 정책과 분리.';
COMMENT ON POLICY core_sale_returns_staff_insert ON core.sale_returns IS
  'Staff/instructor 반품 INSERT. is_org_admin FOR ALL(수정·삭제)과 병존.';

COMMIT;
