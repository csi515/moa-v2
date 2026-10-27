-- core.customers.organization_id 는 행이 생긴 뒤 바꿀 수 없다.
--
-- customers_update (20260822130100) 의 USING / WITH CHECK 는 둘 다
-- core.rls_staff_or_admin 이다. owner/admin/manager 가 조직 A 와 B 에
-- 동시에 있으면 UPDATE 로 organization_id 를 A 에서 B 로 옮길 수 있다.
-- 앱 dataProvider 는 이 컬럼을 빼지만, 직접 Supabase 호출은 그대로다.
-- 다른 테이블과 customers_update 정책은 건드리지 않고 BEFORE UPDATE 트리거로 막는다.

BEGIN;

CREATE OR REPLACE FUNCTION core.prevent_customers_organization_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = core, public
AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'core.customers.organization_id is immutable'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION core.prevent_customers_organization_id_change() IS
  'core.customers.organization_id 변경을 거부한다. customers_update RLS 는 재작성하지 않는다.';

DROP TRIGGER IF EXISTS trg_customers_organization_id_immutable ON core.customers;
CREATE TRIGGER trg_customers_organization_id_immutable
  BEFORE UPDATE ON core.customers
  FOR EACH ROW
  EXECUTE FUNCTION core.prevent_customers_organization_id_change();

COMMIT;
