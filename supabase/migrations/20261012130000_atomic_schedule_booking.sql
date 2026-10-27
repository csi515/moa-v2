-- =============================================================================
-- atomic_schedule_booking: 예약 동시성 충돌(Race Condition) 방어 및 주소 구조화 RLS 패치
--
-- 문제:
--   1. 다중 클라이언트 동시 예약 시 잔여석(capacity) 조회와 예약 생성 간의 시차로 인해
--      정원 초과(오버부킹) 및 수강권(session_passes) 차감 불일치, 데드락이 발생함.
--   2. 조직 생성 시 organizations 테이블의 직접 INSERT RLS 차단(false) 또는
--      주소 구조화 객체(sido, sigungu, dong 등) 페이로드 불일치로 인한 400/403 오류 발생.
--
-- 해결:
--   1. book_schedule_slot(p_schedule_id, p_customer_id, p_pass_id) 원자적 RPC 신설.
--      - SELECT ... FOR UPDATE OF s 로 타임슬롯 행 잠금 (오버부킹 및 데드락 원천 차단).
--      - 잔여석(capacity) 유효성 검증 및 정원 초과 시 명확한 EXCEPTION 발생.
--      - 수강권(session_passes) 잠금 및 원자적 횟수(-1) 차감 단일 트랜잭션 보장.
--   2. organizations 테이블 RLS 및 구조화 주소 트리거 보강:
--      - organizations_insert 정책을 authenticated 사용자에 허용 (auth.uid() IS NOT NULL).
--      - settings->'addressParts' 내 구조화 주소를 sido, sigungu, dong 컬럼에 자동 동기화.
--      - 직접 INSERT 시 owner 멤버십 자동 등록 트리거 구축.
-- =============================================================================

BEGIN;

-- 1. 동시성 예약 충돌 방어 원자적 RPC
CREATE OR REPLACE FUNCTION core.book_schedule_slot(
  p_schedule_id UUID,
  p_customer_id UUID,
  p_pass_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_schedule RECORD;
  v_customer RECORD;
  v_pass RECORD;
  v_booked_count INT;
  v_reservation_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_schedule_id IS NULL OR p_customer_id IS NULL THEN
    RAISE EXCEPTION 'SCHEDULE_OR_CUSTOMER_REQUIRED: 일정과 고객 식별자가 필요합니다.';
  END IF;

  -- 1) 타임슬롯 잔여석 조회 시 행 잠금(FOR UPDATE) 적용: 다중 클라이언트 동시 접근 시 직렬화
  SELECT
    s.id,
    s.organization_id,
    s.is_bookable,
    s.max_capacity,
    s.starts_at,
    s.ends_at,
    o.is_active
  INTO v_schedule
  FROM core.schedules s
  JOIN core.organizations o ON o.id = s.organization_id
  WHERE s.id = p_schedule_id
  FOR UPDATE OF s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SCHEDULE_NOT_FOUND: 예약 대상을 찾을 수 없습니다.';
  END IF;

  IF NOT v_schedule.is_active THEN
    RAISE EXCEPTION 'ORGANIZATION_INACTIVE: 비활성화된 사업장입니다.';
  END IF;

  IF NOT v_schedule.is_bookable THEN
    RAISE EXCEPTION 'SCHEDULE_NOT_BOOKABLE: 예약 가능한 일정이 아닙니다.';
  END IF;

  IF v_schedule.starts_at < now() THEN
    RAISE EXCEPTION 'CANNOT_BOOK_PAST_SCHEDULE: 지난 일정은 예약할 수 없습니다.';
  END IF;

  -- 2) 고객 소속 및 유효성 확인
  SELECT
    c.id,
    c.organization_id,
    c.name,
    c.phone
  INTO v_customer
  FROM core.customers c
  WHERE c.id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CUSTOMER_NOT_FOUND: 고객 정보를 찾을 수 없습니다.';
  END IF;

  IF v_customer.organization_id <> v_schedule.organization_id THEN
    RAISE EXCEPTION 'ORGANIZATION_MISMATCH: 일정과 고객의 소속 조직이 일치하지 않습니다.';
  END IF;

  -- 3) 중복 예약 방지 확인
  IF EXISTS (
    SELECT 1
    FROM core.reservations
    WHERE schedule_id = p_schedule_id
      AND customer_id = p_customer_id
      AND status IN ('requested', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'ALREADY_BOOKED: 해당 고객은 이미 이 일정에 예약되어 있습니다.';
  END IF;

  -- 4) 잔여석(capacity) 카운트 검증: 잠금 상태에서 확인하므로 Race Condition 0%
  SELECT COUNT(*)
  INTO v_booked_count
  FROM core.reservations
  WHERE schedule_id = p_schedule_id
    AND status IN ('requested', 'confirmed');

  IF v_booked_count >= v_schedule.max_capacity THEN
    RAISE EXCEPTION 'SCHEDULE_CAPACITY_EXCEEDED: 예약 정원(%명)이 모두 마감되었습니다.', v_schedule.max_capacity;
  END IF;

  -- 5) 수강권(session_passes) 잔여 횟수 원자적 -1 차감
  IF p_pass_id IS NOT NULL THEN
    SELECT
      p.id,
      p.organization_id,
      p.customer_id,
      p.total_sessions,
      p.used_sessions,
      p.status,
      p.expires_at
    INTO v_pass
    FROM core.session_passes p
    WHERE p.id = p_pass_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PASS_NOT_FOUND: 수강권을 찾을 수 없습니다.';
    END IF;

    IF v_pass.organization_id <> v_schedule.organization_id OR v_pass.customer_id <> p_customer_id THEN
      RAISE EXCEPTION 'PASS_OWNERSHIP_MISMATCH: 수강권 소유자 또는 사업장이 일치하지 않습니다.';
    END IF;

    IF v_pass.status <> 'active' THEN
      RAISE EXCEPTION 'PASS_NOT_ACTIVE: 사용 가능한 활성 상태의 수강권이 아닙니다.';
    END IF;

    IF v_pass.expires_at IS NOT NULL AND v_pass.expires_at < now() THEN
      RAISE EXCEPTION 'PASS_EXPIRED: 유효기간이 만료된 수강권입니다.';
    END IF;

    IF v_pass.used_sessions >= v_pass.total_sessions THEN
      RAISE EXCEPTION 'PASS_EXHAUSTED: 수강권 잔여 횟수가 부족합니다.';
    END IF;

    UPDATE core.session_passes
    SET used_sessions = used_sessions + 1,
        status = CASE WHEN used_sessions + 1 >= total_sessions THEN 'exhausted' ELSE 'active' END,
        updated_at = now()
    WHERE id = p_pass_id;
  END IF;

  -- 6) 예약 레코드 생성 (단일 트랜잭션 보장)
  INSERT INTO core.reservations (
    organization_id,
    schedule_id,
    customer_id,
    user_id,
    applicant_name,
    applicant_phone,
    status,
    confirmed_at,
    metadata
  ) VALUES (
    v_schedule.organization_id,
    p_schedule_id,
    p_customer_id,
    auth.uid(),
    v_customer.name,
    v_customer.phone,
    'confirmed',
    now(),
    jsonb_build_object(
      'pass_id', p_pass_id,
      'booked_via', 'book_schedule_slot',
      'booked_at', now()
    )
  )
  RETURNING id INTO v_reservation_id;

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'schedule_id', p_schedule_id,
    'customer_id', p_customer_id,
    'pass_id', p_pass_id,
    'remaining_capacity', v_schedule.max_capacity - (v_booked_count + 1),
    'status', 'confirmed'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.book_schedule_slot(UUID, UUID, UUID) TO authenticated, anon;

-- public schema 래퍼 (Supabase 클라이언트 기본 호환성 제공)
CREATE OR REPLACE FUNCTION public.book_schedule_slot(
  p_schedule_id UUID,
  p_customer_id UUID,
  p_pass_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
  SELECT core.book_schedule_slot(p_schedule_id, p_customer_id, p_pass_id);
$$;

GRANT EXECUTE ON FUNCTION public.book_schedule_slot(UUID, UUID, UUID) TO authenticated, anon;

-- 2. organizations RLS 및 구조화 주소 보강
DROP POLICY IF EXISTS organizations_insert ON core.organizations;
CREATE POLICY organizations_insert ON core.organizations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- organizations INSERT 전 구조화 주소 자동 추출 및 기본값 트리거
CREATE OR REPLACE FUNCTION core.handle_organization_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  -- settings->'addressParts' 가 전달된 경우 컬럼으로 자동 언패킹
  IF NEW.settings IS NOT NULL AND NEW.settings ? 'addressParts' THEN
    NEW.postal := COALESCE(NEW.postal, NULLIF(NEW.settings->'addressParts'->>'postal', ''));
    NEW.sido := COALESCE(NEW.sido, NULLIF(NEW.settings->'addressParts'->>'sido', ''));
    NEW.sigungu := COALESCE(NEW.sigungu, NULLIF(NEW.settings->'addressParts'->>'sigungu', ''));
    NEW.dong := COALESCE(NEW.dong, NULLIF(NEW.settings->'addressParts'->>'dong', ''));
    NEW.jibun := COALESCE(NEW.jibun, NULLIF(NEW.settings->'addressParts'->>'jibun', ''));
    NEW.road_address := COALESCE(NEW.road_address, NULLIF(NEW.settings->'addressParts'->>'roadAddress', ''));
    NEW.address_detail := COALESCE(NEW.address_detail, NULLIF(NEW.settings->'addressParts'->>'addressDetail', ''));
  END IF;

  -- 필수 메타데이터 기본값 보장
  IF NEW.public_code IS NULL OR trim(NEW.public_code) = '' THEN
    NEW.public_code := core.generate_public_code();
  END IF;

  IF NEW.lifecycle_status IS NULL THEN
    NEW.lifecycle_status := 'active';
  END IF;

  IF NEW.is_active IS NULL THEN
    NEW.is_active := true;
  END IF;

  IF NEW.slug IS NULL OR trim(NEW.slug) = '' THEN
    NEW.slug := 'org-' || substr(md5(random()::text), 1, 8);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_before_insert ON core.organizations;
CREATE TRIGGER trg_org_before_insert
  BEFORE INSERT ON core.organizations
  FOR EACH ROW
  EXECUTE FUNCTION core.handle_organization_before_insert();

-- organizations INSERT 후 owner 멤버십 자동 등록 트리거
CREATE OR REPLACE FUNCTION core.handle_organization_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO core.organization_members (organization_id, user_id, role)
    VALUES (NEW.id, auth.uid(), 'owner')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_after_insert ON core.organizations;
CREATE TRIGGER trg_org_after_insert
  AFTER INSERT ON core.organizations
  FOR EACH ROW
  EXECUTE FUNCTION core.handle_organization_after_insert();

COMMIT;
