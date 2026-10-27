-- =============================================================================
-- safe_transfer_customer_identity: 신원 인증 및 데이터 무결성 원자적 RPC (Deadlock 방어)
-- 
-- 문제:
--   고객의 전화번호 변경이나 중복 가입/인계 시 프론트엔드 단독 예외 처리만 할 경우,
--   (organization_id, user_id) 또는 (organization_id, phone) 등의 고유 제약조건 충돌과
--   비순차적 행 락 획득으로 인해 트랜잭션 교착 상태(Deadlock)가 발생함.
--
-- 해결:
--   1. 5분 TTL 일회성 토큰 검증 (만료/재사용 방지, sha256 내장 해시 비교)
--   2. 고객 이름 일치성 검증 (Fail-Closed)
--   3. 결정론적 행 잠금(ID 오름차순 정렬 FOR UPDATE)으로 상호 락 경합/Deadlock 원천 방어
--   4. 기존 빈/게스트 레코드(user_id IS NULL)의 원자적 병합(Merge) 및 안전한 계정 인계
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS core.customer_transfer_tokens (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  token_hash           TEXT NOT NULL,
  target_phone         TEXT NOT NULL,
  target_customer_name TEXT NOT NULL,
  target_customer_id   UUID REFERENCES core.customers(id) ON DELETE SET NULL,
  created_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at           TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  used_at              TIMESTAMPTZ,
  metadata             JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_customer_transfer_tokens_hash
  ON core.customer_transfer_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_customer_transfer_tokens_org
  ON core.customer_transfer_tokens (organization_id);

ALTER TABLE core.customer_transfer_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_transfer_tokens_select ON core.customer_transfer_tokens;
CREATE POLICY customer_transfer_tokens_select ON core.customer_transfer_tokens
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() OR
    core.is_org_staff_actor(organization_id)
  );

GRANT SELECT ON core.customer_transfer_tokens TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON core.customer_transfer_tokens FROM authenticated, anon;

-- 토큰 발급 헬퍼 RPC
CREATE OR REPLACE FUNCTION core.issue_customer_transfer_token(
  p_organization_id UUID,
  p_phone TEXT,
  p_customer_name TEXT,
  p_target_customer_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth, pg_catalog
AS $$
DECLARE
  v_raw_token TEXT;
  v_token_hash TEXT;
  v_clean_phone TEXT;
  v_expires_at TIMESTAMPTZ := now() + interval '5 minutes';
  v_token_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF length(v_clean_phone) < 8 THEN
    RAISE EXCEPTION 'Invalid phone number';
  END IF;

  -- 6자리 숫자 보안 토큰 생성
  v_raw_token := lpad(floor(random() * 900000 + 100000)::text, 6, '0');
  v_token_hash := encode(sha256(convert_to(upper(trim(v_raw_token)), 'utf8')), 'hex');

  INSERT INTO core.customer_transfer_tokens (
    organization_id,
    token_hash,
    target_phone,
    target_customer_name,
    target_customer_id,
    created_by,
    expires_at
  ) VALUES (
    p_organization_id,
    v_token_hash,
    v_clean_phone,
    trim(p_customer_name),
    p_target_customer_id,
    auth.uid(),
    v_expires_at
  )
  RETURNING id INTO v_token_id;

  RETURN jsonb_build_object(
    'ok', true,
    'token_id', v_token_id,
    'token', v_raw_token,
    'expires_at', v_expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.issue_customer_transfer_token(UUID, TEXT, TEXT, UUID) TO authenticated;

-- 원자적 신원 인계 RPC
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

  -- 3. 고객 이름 일치 여부 확인
  IF lower(trim(p_customer_name)) <> lower(trim(v_token.target_customer_name)) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NAME_MISMATCH', 'message', '고객 성명이 토큰 발급 정보와 일치하지 않습니다.');
  END IF;

  v_clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');

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
    -- 대상 레코드 업데이트
    UPDATE core.customers
    SET name = trim(p_customer_name),
        phone = v_clean_phone,
        user_id = v_caller_uid,
        status = 'active',
        metadata = metadata || jsonb_build_object('transferred_at', now(), 'source', 'safe_transfer_rpc'),
        updated_at = now()
    WHERE id = v_destination_id;
  END IF;

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
