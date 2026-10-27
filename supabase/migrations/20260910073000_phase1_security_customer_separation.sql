-- Phase 1: org membership RLS gaps + Customer/User separation
-- Membership table is core.organization_members (not organization_memberships).
--
-- organization_id tables (core): organization_members, customers, customer_contacts,
-- staff, services, schedules, payments, payment_transactions, consultations,
-- notifications, staff_invitations, parent_invitations, parent_student_links,
-- attendance_sessions, expenses, income_entries, student_enrollments,
-- org_parent_profiles, guardian_link_tokens, care_journals, medication_requests,
-- academy_data_sharing_consents, organization_join_requests, customer_join_requests,
-- guardian_enrollment_requests, reservations, organization_quotas,
-- availability_rules, availability_overrides, push_device_tokens, practice_rooms,
-- room_reservations
-- organization_id tables (piano): customers, class_members, attendance, lesson_records,
-- practice_records, textbooks, textbook_sales, textbook_payments,
-- textbook_inventory_transactions, songs, expenses, events, performance_videos,
-- curriculum_levels, curriculum_items, student_curriculum_progress,
-- weekly_assignments, assignment_items, achievements, learning_reports

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. customers.user_id: nullable guest customer (재확인)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE core.customers
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES core.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

COMMENT ON COLUMN core.customers.user_id IS
  '로그인 User 연결. NULL = 전화 예약·원 등록 비회원 Customer. 이후 link로 연결.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_core_customers_org_user_unique
  ON core.customers(organization_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_core_customers_org_phone
  ON core.customers(organization_id, phone)
  WHERE phone IS NOT NULL AND phone <> '';

-- ---------------------------------------------------------------------------
-- 2. RLS gaps — membership / auth.uid()
-- ---------------------------------------------------------------------------

-- Org 생성은 SECURITY DEFINER create_organization 만. 직접 INSERT 차단.
DROP POLICY IF EXISTS organizations_insert ON core.organizations;
CREATE POLICY organizations_insert ON core.organizations
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- 예약: 조직 멤버면 전부 보이던 정책 → 본인 Customer 또는 스태프/관리자만
DROP POLICY IF EXISTS reservations_select_own_customer ON core.reservations;
CREATE POLICY reservations_select_own_customer ON core.reservations
  FOR SELECT TO authenticated
  USING (
    customer_id IS NOT NULL
    AND core.is_my_customer(organization_id, customer_id)
  );

DROP POLICY IF EXISTS reservations_select_staff ON core.reservations;
CREATE POLICY reservations_select_staff ON core.reservations
  FOR SELECT TO authenticated
  USING (
    core.is_org_member(organization_id)
    AND (
      core.is_org_owner_or_admin(organization_id)
      OR EXISTS (
        SELECT 1 FROM core.organization_members om
        WHERE om.organization_id = reservations.organization_id
          AND om.user_id = auth.uid()
          AND om.is_active = true
          AND om.role IN ('owner', 'admin', 'manager', 'staff', 'instructor')
      )
    )
  );

-- 동의서: SELECT만 있던 테이블 — 본인 부모 / 관리자 쓰기
GRANT INSERT, UPDATE ON core.academy_data_sharing_consents TO authenticated;

DROP POLICY IF EXISTS academy_consents_parent_write ON core.academy_data_sharing_consents;
CREATE POLICY academy_consents_parent_write ON core.academy_data_sharing_consents
  FOR INSERT TO authenticated
  WITH CHECK (parent_id = core.get_my_parent_id());

DROP POLICY IF EXISTS academy_consents_parent_update ON core.academy_data_sharing_consents;
CREATE POLICY academy_consents_parent_update ON core.academy_data_sharing_consents
  FOR UPDATE TO authenticated
  USING (parent_id = core.get_my_parent_id())
  WITH CHECK (parent_id = core.get_my_parent_id());

DROP POLICY IF EXISTS academy_consents_admin_write ON core.academy_data_sharing_consents;
CREATE POLICY academy_consents_admin_write ON core.academy_data_sharing_consents
  FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

-- 쿼터: SELECT만 → owner/admin 쓰기 (서비스 롤/ DEFINER도 우회 가능)
DROP POLICY IF EXISTS org_quotas_write_owner_admin ON core.organization_quotas;
CREATE POLICY org_quotas_write_owner_admin ON core.organization_quotas
  FOR ALL TO authenticated
  USING (core.is_org_owner_or_admin(organization_id))
  WITH CHECK (core.is_org_owner_or_admin(organization_id));

-- rate_limit_configs: organization_id 없음. 전역 설정 — 클라이언트 직접 접근 차단
ALTER TABLE core.rate_limit_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rate_limit_configs_deny_client ON core.rate_limit_configs;
CREATE POLICY rate_limit_configs_deny_client ON core.rate_limit_configs
  FOR ALL TO authenticated, anon
  USING (false)
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- 3. Guest Customer ensure + User link
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.ensure_guest_customer(
  p_org_id UUID,
  p_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'walk_in'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_name TEXT := trim(COALESCE(p_name, ''));
  v_phone TEXT := NULLIF(regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g'), '');
  v_email TEXT := NULLIF(lower(trim(COALESCE(p_email, ''))), '');
  v_customer_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_name = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;

  -- 스태프/관리자만 비회원 Customer를 직접 만듦
  IF NOT (
    core.is_org_owner_or_admin(p_org_id)
    OR EXISTS (
      SELECT 1 FROM core.organization_members om
      WHERE om.organization_id = p_org_id
        AND om.user_id = v_uid
        AND om.is_active = true
        AND om.role IN ('owner', 'admin', 'manager', 'staff', 'instructor')
    )
  ) THEN
    RAISE EXCEPTION 'Not allowed to create guest customers';
  END IF;

  IF v_phone IS NOT NULL THEN
    SELECT c.id INTO v_customer_id
    FROM core.customers c
    WHERE c.organization_id = p_org_id
      AND regexp_replace(COALESCE(c.phone, ''), '[^0-9]', '', 'g') = v_phone
    ORDER BY
      CASE WHEN c.user_id IS NULL THEN 0 ELSE 1 END,
      c.updated_at DESC NULLS LAST
    LIMIT 1;

    IF v_customer_id IS NOT NULL THEN
      RETURN v_customer_id;
    END IF;
  END IF;

  INSERT INTO core.customers (
    organization_id,
    name,
    phone,
    email,
    status,
    user_id,
    metadata
  ) VALUES (
    p_org_id,
    v_name,
    CASE WHEN v_phone IS NULL THEN NULL ELSE v_phone END,
    COALESCE(v_email, ''),
    'active',
    NULL,
    jsonb_build_object('source', COALESCE(NULLIF(trim(p_source), ''), 'walk_in'), 'guest', true)
  )
  RETURNING id INTO v_customer_id;

  RETURN v_customer_id;
END;
$$;

COMMENT ON FUNCTION core.ensure_guest_customer IS
  '전화 예약·방문 등록용 비회원 Customer (user_id NULL). 스태프만 호출.';

CREATE OR REPLACE FUNCTION core.link_customer_to_current_user(
  p_customer_id UUID,
  p_expected_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_customer RECORD;
  v_expected TEXT := NULLIF(regexp_replace(COALESCE(p_expected_phone, ''), '[^0-9]', '', 'g'), '');
  v_phone TEXT;
  v_conflict UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_customer
  FROM core.customers
  WHERE id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF v_customer.user_id IS NOT NULL THEN
    IF v_customer.user_id = v_uid THEN
      RETURN jsonb_build_object(
        'status', 'already_linked',
        'customer_id', v_customer.id,
        'organization_id', v_customer.organization_id
      );
    END IF;
    RAISE EXCEPTION 'Customer already linked to another user';
  END IF;

  v_phone := NULLIF(regexp_replace(COALESCE(v_customer.phone, ''), '[^0-9]', '', 'g'), '');

  -- 전화가 있으면 확인 전화와 일치해야 가로채기 방지
  IF v_phone IS NOT NULL AND v_expected IS NOT NULL AND v_phone <> v_expected THEN
    RAISE EXCEPTION 'Phone does not match customer record';
  END IF;

  IF v_phone IS NULL AND v_expected IS NOT NULL THEN
    RAISE EXCEPTION 'Customer has no phone to verify';
  END IF;

  -- 같은 조직에 이미 연결된 Customer가 있으면 거부 (유니크 인덱스 보호)
  SELECT id INTO v_conflict
  FROM core.customers
  WHERE organization_id = v_customer.organization_id
    AND user_id = v_uid
    AND id <> v_customer.id
  LIMIT 1;

  IF v_conflict IS NOT NULL THEN
    RAISE EXCEPTION 'User already linked to another customer in this organization';
  END IF;

  UPDATE core.customers
  SET
    user_id = v_uid,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('guest', false, 'linkedAt', now()),
    updated_at = now()
  WHERE id = v_customer.id;

  -- customer 역할 멤버십이 없으면 추가 (성인/예약 계정)
  IF NOT EXISTS (
    SELECT 1 FROM core.organization_members
    WHERE organization_id = v_customer.organization_id
      AND user_id = v_uid
      AND role IN ('customer', 'member')
      AND is_active = true
  ) THEN
    INSERT INTO core.organization_members (organization_id, user_id, role, is_active)
    VALUES (v_customer.organization_id, v_uid, 'customer', true);
  END IF;

  RETURN jsonb_build_object(
    'status', 'linked',
    'customer_id', v_customer.id,
    'organization_id', v_customer.organization_id,
    'user_id', v_uid
  );
END;
$$;

COMMENT ON FUNCTION core.link_customer_to_current_user IS
  '비회원 Customer(user_id NULL)를 현재 로그인 User에 안전하게 연결.';

GRANT EXECUTE ON FUNCTION core.ensure_guest_customer(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.link_customer_to_current_user(UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION core.ensure_guest_customer(UUID, TEXT, TEXT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION core.link_customer_to_current_user(UUID, TEXT) FROM anon;

-- ---------------------------------------------------------------------------
-- 4. request_reservation: 로그인 User ↔ Customer 우선 연결
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.request_reservation(
  p_schedule_id UUID,
  p_applicant_name TEXT,
  p_applicant_phone TEXT DEFAULT NULL,
  p_applicant_email TEXT DEFAULT NULL,
  p_request_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_org_id UUID;
  v_schedule RECORD;
  v_confirmed_count INT;
  v_customer_id UUID;
  v_reservation_id UUID;
  v_user_id UUID;
  v_phone TEXT := NULLIF(regexp_replace(COALESCE(p_applicant_phone, ''), '[^0-9]', '', 'g'), '');
  v_name TEXT := trim(COALESCE(p_applicant_name, ''));
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_name = '' THEN
    RAISE EXCEPTION 'Applicant name is required';
  END IF;

  SELECT
    s.organization_id,
    s.is_bookable,
    s.max_capacity,
    s.starts_at,
    o.is_active
  INTO v_schedule
  FROM core.schedules s
  INNER JOIN core.organizations o ON o.id = s.organization_id
  WHERE s.id = p_schedule_id
  FOR UPDATE OF s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule not found';
  END IF;

  IF NOT v_schedule.is_active THEN
    RAISE EXCEPTION 'Organization is not active';
  END IF;

  IF NOT v_schedule.is_bookable THEN
    RAISE EXCEPTION 'This schedule is not bookable';
  END IF;

  IF v_schedule.starts_at < now() THEN
    RAISE EXCEPTION 'Cannot book past schedules';
  END IF;

  v_org_id := v_schedule.organization_id;

  SELECT COUNT(*)
  INTO v_confirmed_count
  FROM core.reservations
  WHERE schedule_id = p_schedule_id
    AND status IN ('requested', 'confirmed');

  IF v_confirmed_count >= v_schedule.max_capacity THEN
    RAISE EXCEPTION 'Schedule is fully booked';
  END IF;

  IF EXISTS (
    SELECT 1 FROM core.reservations
    WHERE schedule_id = p_schedule_id
      AND user_id = v_user_id
      AND status IN ('requested', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'You already have a reservation for this schedule';
  END IF;

  -- 1) 이미 연결된 Customer
  SELECT id INTO v_customer_id
  FROM core.customers
  WHERE organization_id = v_org_id
    AND user_id = v_user_id
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  -- 2) 전화로 비회원 Customer 찾아 연결
  IF v_customer_id IS NULL AND v_phone IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM core.customers
    WHERE organization_id = v_org_id
      AND user_id IS NULL
      AND regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = v_phone
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;

    IF v_customer_id IS NOT NULL THEN
      PERFORM core.link_customer_to_current_user(v_customer_id, v_phone);
    END IF;
  END IF;

  -- 3) 없으면 로그인 User에 묶인 Customer 생성 (비회원이 아님)
  IF v_customer_id IS NULL THEN
    INSERT INTO core.customers (
      organization_id,
      name,
      phone,
      email,
      status,
      user_id,
      metadata
    ) VALUES (
      v_org_id,
      v_name,
      v_phone,
      COALESCE(NULLIF(lower(trim(COALESCE(p_applicant_email, ''))), ''), ''),
      'active',
      v_user_id,
      jsonb_build_object('source', 'reservation', 'guest', false)
    )
    RETURNING id INTO v_customer_id;
  END IF;

  INSERT INTO core.reservations (
    organization_id,
    schedule_id,
    customer_id,
    user_id,
    applicant_name,
    applicant_phone,
    applicant_email,
    request_message,
    status
  ) VALUES (
    v_org_id,
    p_schedule_id,
    v_customer_id,
    v_user_id,
    v_name,
    p_applicant_phone,
    p_applicant_email,
    p_request_message,
    'requested'
  )
  RETURNING id INTO v_reservation_id;

  RETURN v_reservation_id;
END;
$$;

COMMENT ON FUNCTION core.request_reservation IS
  '예약 신청. Customer는 user_id 연결을 우선하고, 전화 비회원은 link 후 재사용.';

COMMIT;
