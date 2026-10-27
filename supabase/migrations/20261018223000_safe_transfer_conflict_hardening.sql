-- =============================================================================
-- Migration: 20261018223000_safe_transfer_conflict_hardening.sql
-- Description: safe_transfer_customer_identity RPC 고유 제약조건 충돌 방어 및 타인 계정 보호 강화
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION core.safe_transfer_customer_identity(
  p_token TEXT,
  p_organization_id UUID,
  p_customer_name TEXT,
  p_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth, pg_catalog
AS $$
DECLARE
  v_caller_uid UUID := auth.uid();
  v_token_hash TEXT;
  v_token RECORD;
  v_clean_phone TEXT;
  v_target_customer RECORD;
  v_placeholder_customer RECORD;
  v_destination_id UUID;
  v_placeholder_id UUID;
  v_lock_ids UUID[];
  v_other_bound_customer RECORD;
BEGIN
  -- 1. 인증 확인
  IF v_caller_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UNAUTHENTICATED', 'message', '로그인이 필요합니다.');
  END IF;

  IF p_organization_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ORG_REQUIRED', 'message', '소속 조직 ID가 누락되었습니다.');
  END IF;

  -- 2. 토큰 유효성 및 5분 TTL 검증
  v_token_hash := encode(sha256(convert_to(upper(trim(p_token)), 'utf8')), 'hex');

  SELECT * INTO v_token
  FROM core.customer_transfer_tokens
  WHERE organization_id = p_organization_id
    AND token_hash = v_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'TOKEN_NOT_FOUND', 'message', '유효하지 않은 인증 토큰입니다.');
  END IF;

  IF v_token.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'TOKEN_ALREADY_USED', 'message', '이미 사용 완료된 인증 토큰입니다.');
  END IF;

  IF v_token.expires_at < now() OR v_token.created_at < (now() - interval '5 minutes') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'TOKEN_EXPIRED', 'message', '인증 토큰 유효시간(5분)이 만료되었습니다.');
  END IF;

  -- 3. 고객 이름 일치 여부 확인 (Fail-Closed)
  IF lower(trim(p_customer_name)) <> lower(trim(v_token.target_customer_name)) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NAME_MISMATCH', 'message', '고객 성명이 토큰 발급 정보와 일치하지 않습니다.');
  END IF;

  v_clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');

  -- 3.5 타인 계정 바인딩 방지 (타인 장부 노출 차단)
  SELECT * INTO v_other_bound_customer
  FROM core.customers
  WHERE organization_id = p_organization_id
    AND user_id IS NOT NULL
    AND user_id <> v_caller_uid
    AND (phone = v_clean_phone OR phone = p_phone)
  LIMIT 1;

  IF v_other_bound_customer IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'ALREADY_BOUND_TO_ANOTHER_USER',
      'message', '해당 연락처는 이미 다른 사용자 계정에 연동되어 있어 신원을 인계할 수 없습니다.'
    );
  END IF;

  -- 4. 잠금 대상 식별 및 Deadlock 방어 (ID 오름차순 정렬 잠금)
  SELECT array_agg(id ORDER BY id ASC) INTO v_lock_ids
  FROM (
    SELECT id FROM core.customers
    WHERE organization_id = p_organization_id
      AND (
        id = v_token.target_customer_id
        OR user_id = v_caller_uid
        OR phone = v_clean_phone
        OR phone = p_phone
      )
  ) sub;

  IF v_lock_ids IS NOT NULL AND array_length(v_lock_ids, 1) > 0 THEN
    PERFORM 1 FROM core.customers
    WHERE id = ANY(v_lock_ids)
    ORDER BY id ASC
    FOR UPDATE;
  END IF;

  -- 5. 대상 레코드(Destination) 및 빈 레코드(Placeholder) 결정
  -- 5.1 이미 본인 계정에 바인딩된 고객 레코드가 있는지 확인
  SELECT * INTO v_target_customer
  FROM core.customers
  WHERE organization_id = p_organization_id
    AND user_id = v_caller_uid
  LIMIT 1;

  -- 5.2 없다면 토큰에 명시된 고객 확인
  IF v_target_customer IS NULL AND v_token.target_customer_id IS NOT NULL THEN
    SELECT * INTO v_target_customer
    FROM core.customers
    WHERE id = v_token.target_customer_id
      AND organization_id = p_organization_id
      AND (user_id IS NULL OR user_id = v_caller_uid);
  END IF;

  -- 5.3 없다면 전화번호 일치 게스트 고객 확인
  IF v_target_customer IS NULL THEN
    SELECT * INTO v_target_customer
    FROM core.customers
    WHERE organization_id = p_organization_id
      AND (phone = v_clean_phone OR phone = p_phone)
      AND user_id IS NULL
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- 5.4 여전히 없다면 신규 고객 레코드 생성
  BEGIN
    IF v_target_customer IS NULL THEN
      INSERT INTO core.customers (
        organization_id,
        name,
        phone,
        user_id,
        status,
        metadata
      ) VALUES (
        p_organization_id,
        trim(p_customer_name),
        v_clean_phone,
        v_caller_uid,
        'active',
        jsonb_build_object('transferred_at', now(), 'source', 'safe_transfer_rpc')
      )
      RETURNING * INTO v_target_customer;
      v_destination_id := v_target_customer.id;
    ELSE
      v_destination_id := v_target_customer.id;
      UPDATE core.customers
      SET name = trim(p_customer_name),
          phone = v_clean_phone,
          user_id = v_caller_uid,
          status = 'active',
          metadata = metadata || jsonb_build_object('transferred_at', now(), 'source', 'safe_transfer_rpc'),
          updated_at = now()
      WHERE id = v_destination_id;
    END IF;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'ERR_PHONE_DUPLICATE_IN_TENANT',
        'message', '동일한 전화번호를 가진 고객 레코드와 충돌이 발생했습니다. 기존 임시 고객 정보를 확인해 주세요.'
      );
  END;

  -- 6. 동일 조직 내 다른 빈 레코드(Placeholder: user_id IS NULL) 병합 처리
  SELECT * INTO v_placeholder_customer
  FROM core.customers
  WHERE organization_id = p_organization_id
    AND id <> v_destination_id
    AND user_id IS NULL
    AND (phone = v_clean_phone OR phone = p_phone)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_placeholder_customer IS NOT NULL THEN
    v_placeholder_id := v_placeholder_customer.id;

    -- 외래키 참조 레코드 원자적 승계
    UPDATE core.reservations
    SET customer_id = v_destination_id
    WHERE customer_id = v_placeholder_id;

    UPDATE core.attendance_sessions
    SET customer_id = v_destination_id
    WHERE customer_id = v_placeholder_id;

    UPDATE core.session_passes
    SET customer_id = v_destination_id
    WHERE customer_id = v_placeholder_id;

    UPDATE core.customer_contacts
    SET customer_id = v_destination_id
    WHERE customer_id = v_placeholder_id;

    -- 빈 레코드 고유 제약조건 충돌 방지를 위해 phone 정리 및 status 마킹
    UPDATE core.customers
    SET phone = NULL,
        status = 'merged',
        metadata = metadata || jsonb_build_object('merged_into', v_destination_id, 'merged_at', now()),
        updated_at = now()
    WHERE id = v_placeholder_id;
  END IF;

  -- 7. 토큰 일회성 소비 마킹
  UPDATE core.customer_transfer_tokens
  SET used_at = now()
  WHERE id = v_token.id;

  RETURN jsonb_build_object(
    'ok', true,
    'customer_id', v_destination_id,
    'merged_from_id', v_placeholder_id,
    'message', '고객 신원이 성공적으로 안전하게 인계되었습니다.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.safe_transfer_customer_identity(TEXT, UUID, TEXT, TEXT) TO authenticated;

COMMIT;
