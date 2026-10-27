-- =============================================================================
-- jwt_revocation_rls: 세션 무효화 시차(JWT TTL) 방어 RLS 패치
--
-- 문제:
--   직원(member) 해고/권한 박탈 시 DB 상에서 권한을 회수하더라도, 이미 발급된
--   클라이언트의 JWT Access Token(기본 1시간 TTL)이 만료되기 전까지 탈취/유출된
--   세션으로 민감한 매출 및 재무 장부에 접근할 수 있는 보안 취약점(시차 간극)이 존재함.
--
-- 해결:
--   1. core.organization_members 테이블에 token_version 컬럼 신설 (기본값: 1).
--   2. 권한 박탈 / 비활성화(is_active = false) / 역할 변경 시 token_version 자동 증가 트리거 구축.
--   3. 수동 세션 즉시 만료 RPC: core.revoke_member_token(org_id, user_id).
--   4. 민감한 장부/매출 테이블(sales, sale_items, sale_returns, payments, payment_transactions,
--      expenses, income_entries)의 RLS 정책 내부에 token_version 검증 서브쿼리를 추가하여,
--      기존 JWT 토큰의 버전이 DB의 token_version보다 낮을 경우 즉시 403/차단.
-- =============================================================================

BEGIN;

-- 1. organization_members에 token_version 추가
ALTER TABLE core.organization_members
  ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1;

COMMENT ON COLUMN core.organization_members.token_version IS
  '멤버 세션 토큰 버전. 권한 박탈/탈퇴/변경 시 증가하여 기존 유효 JWT 토큰을 즉시 무효화함.';

-- 2. 멤버 비활성화/역할 변경 시 token_version 자동 증가 트리거
CREATE OR REPLACE FUNCTION core.handle_member_token_version_bump()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  IF (OLD.is_active IS DISTINCT FROM NEW.is_active AND NOT NEW.is_active)
     OR (OLD.role IS DISTINCT FROM NEW.role) THEN
    NEW.token_version := COALESCE(OLD.token_version, 1) + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_member_token_version ON core.organization_members;
CREATE TRIGGER trg_bump_member_token_version
  BEFORE UPDATE ON core.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION core.handle_member_token_version_bump();

-- 3. 관리자 전용 멤버 토큰 즉시 무효화 RPC
CREATE OR REPLACE FUNCTION core.revoke_member_token(
  p_organization_id UUID,
  p_user_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_new_version INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT core.is_org_admin(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE core.organization_members
  SET token_version = token_version + 1,
      is_active = false,
      updated_at = now()
  WHERE organization_id = p_organization_id
    AND user_id = p_user_id
  RETURNING token_version INTO v_new_version;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  RETURN v_new_version;
END;
$$;

GRANT EXECUTE ON FUNCTION core.revoke_member_token(UUID, UUID) TO authenticated;

-- 4. JWT Claim 내 token_version 추출 및 유효성 검증 헬퍼
CREATE OR REPLACE FUNCTION core.has_valid_staff_token(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.organization_members m
    WHERE m.organization_id = p_organization_id
      AND m.user_id = auth.uid()
      AND m.is_active = true
      AND m.role IN (
        'owner'::core.member_role,
        'admin'::core.member_role,
        'manager'::core.member_role,
        'staff'::core.member_role,
        'instructor'::core.member_role
      )
      AND m.token_version <= COALESCE(
        NULLIF(auth.jwt() ->> 'token_version', '')::int,
        NULLIF(auth.jwt() -> 'app_metadata' ->> 'token_version', '')::int,
        NULLIF(auth.jwt() -> 'user_metadata' ->> 'token_version', '')::int,
        1
      )
  );
$$;

CREATE OR REPLACE FUNCTION core.has_valid_owner_token(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.organization_members m
    WHERE m.organization_id = p_organization_id
      AND m.user_id = auth.uid()
      AND m.is_active = true
      AND m.role = 'owner'::core.member_role
      AND m.token_version <= COALESCE(
        NULLIF(auth.jwt() ->> 'token_version', '')::int,
        NULLIF(auth.jwt() -> 'app_metadata' ->> 'token_version', '')::int,
        NULLIF(auth.jwt() -> 'user_metadata' ->> 'token_version', '')::int,
        1
      )
  );
$$;

GRANT EXECUTE ON FUNCTION core.has_valid_staff_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.has_valid_owner_token(UUID) TO authenticated;

-- 5. 민감한 장부/매출 테이블 RLS 정책 업데이트
-- 5.1 core.sales (매출 장부)
DROP POLICY IF EXISTS core_sales_select ON core.sales;
CREATE POLICY core_sales_select
  ON core.sales
  FOR SELECT TO authenticated
  USING (
    core.has_valid_staff_token(organization_id)
    OR (
      customer_id IS NOT NULL
      AND (
        core.is_my_customer(organization_id, customer_id)
        OR core.parent_owns_student(organization_id, customer_id)
      )
    )
  );

-- 5.2 core.sale_items (매출 상세)
DROP POLICY IF EXISTS core_sale_items_select ON core.sale_items;
CREATE POLICY core_sale_items_select
  ON core.sale_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM core.sales s
      WHERE s.id = sale_id
        AND (
          core.has_valid_staff_token(s.organization_id)
          OR (
            s.customer_id IS NOT NULL
            AND (
              core.is_my_customer(s.organization_id, s.customer_id)
              OR core.parent_owns_student(s.organization_id, s.customer_id)
            )
          )
        )
    )
  );

-- 5.3 core.sale_returns (반품/환불 내역)
DROP POLICY IF EXISTS core_sale_returns_select ON core.sale_returns;
CREATE POLICY core_sale_returns_select
  ON core.sale_returns
  FOR SELECT TO authenticated
  USING (
    core.has_valid_staff_token(organization_id)
    OR EXISTS (
      SELECT 1
      FROM core.sales s
      WHERE s.id = sale_id
        AND s.organization_id = organization_id
        AND s.customer_id IS NOT NULL
        AND (
          core.is_my_customer(s.organization_id, s.customer_id)
          OR core.parent_owns_student(s.organization_id, s.customer_id)
        )
    )
  );

-- 5.4 core.payments (수납/결제)
DROP POLICY IF EXISTS payments_select ON core.payments;
CREATE POLICY payments_select
  ON core.payments
  FOR SELECT TO authenticated
  USING (
    core.has_valid_staff_token(organization_id)
    OR core.parent_owns_student(organization_id, customer_id)
    OR EXISTS (
      SELECT 1 FROM core.customers c
      WHERE c.id = customer_id
        AND c.organization_id = payments.organization_id
        AND c.user_id = auth.uid()
    )
  );

-- 5.5 core.payment_transactions (결제 트랜잭션)
DROP POLICY IF EXISTS payment_transactions_select ON core.payment_transactions;
CREATE POLICY payment_transactions_select
  ON core.payment_transactions
  FOR SELECT TO authenticated
  USING (
    core.has_valid_staff_token(organization_id)
    OR EXISTS (
      SELECT 1 FROM core.payments p
      WHERE p.id = payment_id
        AND p.organization_id = payment_transactions.organization_id
        AND (
          core.parent_owns_student(p.organization_id, p.customer_id)
          OR EXISTS (
            SELECT 1 FROM core.customers c
            WHERE c.id = p.customer_id
              AND c.organization_id = p.organization_id
              AND c.user_id = auth.uid()
          )
        )
    )
  );

-- 5.6 core.expenses (지출 장부: owner 전용)
DROP POLICY IF EXISTS core_expenses_select ON core.expenses;
CREATE POLICY core_expenses_select ON core.expenses
  FOR SELECT TO authenticated
  USING (core.has_valid_owner_token(organization_id));

DROP POLICY IF EXISTS core_expenses_insert ON core.expenses;
CREATE POLICY core_expenses_insert ON core.expenses
  FOR INSERT TO authenticated
  WITH CHECK (core.has_valid_owner_token(organization_id));

DROP POLICY IF EXISTS core_expenses_update ON core.expenses;
CREATE POLICY core_expenses_update ON core.expenses
  FOR UPDATE TO authenticated
  USING (core.has_valid_owner_token(organization_id))
  WITH CHECK (core.has_valid_owner_token(organization_id));

DROP POLICY IF EXISTS core_expenses_delete ON core.expenses;
CREATE POLICY core_expenses_delete ON core.expenses
  FOR DELETE TO authenticated
  USING (core.has_valid_owner_token(organization_id));

-- 5.7 core.income_entries (수입 장부: owner 전용)
DROP POLICY IF EXISTS core_income_select ON core.income_entries;
CREATE POLICY core_income_select ON core.income_entries
  FOR SELECT TO authenticated
  USING (core.has_valid_owner_token(organization_id));

DROP POLICY IF EXISTS core_income_insert ON core.income_entries;
CREATE POLICY core_income_insert ON core.income_entries
  FOR INSERT TO authenticated
  WITH CHECK (core.has_valid_owner_token(organization_id));

DROP POLICY IF EXISTS core_income_update ON core.income_entries;
CREATE POLICY core_income_update ON core.income_entries
  FOR UPDATE TO authenticated
  USING (core.has_valid_owner_token(organization_id))
  WITH CHECK (core.has_valid_owner_token(organization_id));

DROP POLICY IF EXISTS core_income_delete ON core.income_entries;
CREATE POLICY core_income_delete ON core.income_entries
  FOR DELETE TO authenticated
  USING (core.has_valid_owner_token(organization_id));

COMMIT;
