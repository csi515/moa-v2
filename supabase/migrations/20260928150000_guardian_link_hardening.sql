-- =============================================================================
-- STEP 2: 보호자(학부모) 연결 코드 보강 (guardian link hardening)
--
-- 선행: 20260928130000_parent_link_hotfix_email_identity.sql,
--       20260928140000_staff_invite_token_flow.sql  (PR #84)
--
-- 1) 연결 코드: 20자 Crockford base32(~100bit), builtin gen_random_uuid()/sha256 만 사용
--    (pgcrypto digest() 비의존 → pgcrypto 가 public/extensions 어디에 있든 동작).
--    max_uses=1 강제, 만료 최대 7일, 동일 학생 재발급 시 이전 활성 코드 자동 폐기.
--    기존 8자리 코드는 만료 전까지 계속 사용 가능(해시 방식 동일: sha256(hex)).
-- 2) preview/redeem 시도 기록(core.guardian_link_attempts) + rate limit + audit_logs.
--    실패는 예외 대신 JSON 상태로 반환(예외 시 시도 기록이 롤백되므로).
-- 3) redeem 은 퇴원/졸업(withdrawn/alumni) 등록을 재활성화하지 않고
--    guardian_enrollment_requests(pending) 로 남겨 직원 승인(approve_guardian_enrollment)에 맡김.
--    휴원(leave) 상태도 더 이상 자동 변경하지 않음.
-- 4) 학생당 계정 연결 보호자 수 상한(core.max_linked_guardians_per_student(), 기본 2).
-- 5) 연결 성공 시 core.notifications 에 직원용 알림(type='guardian_linked').
-- 호환: redeem_guardian_link_token(TEXT,JSONB), create_guardian_link_token(UUID,UUID,INT,INT),
--       preview_guardian_link_token(TEXT), create_parent_invite_link_tokens(UUID,UUID,INT),
--       list/revoke 시그니처 유지.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. 상수·코드 헬퍼
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.max_linked_guardians_per_student()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$ SELECT 2 $$;

CREATE OR REPLACE FUNCTION core.guardian_link_token_ttl()
RETURNS INTERVAL
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$ SELECT interval '7 days' $$;

-- 대문자·영숫자만 남기고 Crockford 혼동 문자(O→0, I/L→1) 보정.
-- 기존 8자리 코드는 16진수(0-9A-F)라 보정 영향 없음.
CREATE OR REPLACE FUNCTION core.normalize_guardian_link_code(p_token TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT translate(regexp_replace(upper(COALESCE(p_token, '')), '[^0-9A-Z]', '', 'g'), 'OIL', '011')
$$;

-- builtin sha256 → 기존 encode(digest(code,'sha256'),'hex') 와 동일한 값
CREATE OR REPLACE FUNCTION core.guardian_link_code_hash(p_token TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT CASE
    WHEN core.normalize_guardian_link_code(p_token) = '' THEN NULL
    ELSE encode(sha256(convert_to(core.normalize_guardian_link_code(p_token), 'UTF8')), 'hex')
  END
$$;

-- 20자 Crockford base32 (0-9, A-Z 중 I L O U 제외). gen_random_uuid() 2개의 랜덤 바이트 사용
-- (UUID v4 version/variant 바이트 6·8 제외, 바이트당 하위 5bit → 20×5 = 100bit)
CREATE OR REPLACE FUNCTION core.generate_guardian_link_code()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path = pg_catalog
AS $$
DECLARE
  v_alphabet CONSTANT TEXT := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_bytes BYTEA;
  v_out TEXT := '';
  i INT;
BEGIN
  v_bytes := uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid());
  FOR i IN 0..31 LOOP
    CONTINUE WHEN i IN (6, 8, 22, 24);
    v_out := v_out || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    EXIT WHEN length(v_out) = 20;
  END LOOP;
  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION core.generate_guardian_link_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION core.normalize_guardian_link_code(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION core.guardian_link_code_hash(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION core.guardian_link_token_ttl() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION core.max_linked_guardians_per_student() TO authenticated;

-- ---------------------------------------------------------------------------
-- 1. guardian_link_tokens 강제 규칙 + 인덱스 + 정책
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_guardian_link_tokens_hash
  ON core.guardian_link_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_guardian_link_tokens_org_student
  ON core.guardian_link_tokens (organization_id, student_id);

CREATE OR REPLACE FUNCTION core.enforce_guardian_link_token_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = core, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.max_uses := 1;
    NEW.used_count := GREATEST(COALESCE(NEW.used_count, 0), 0);
    IF NEW.expires_at IS NULL OR NEW.expires_at > now() + core.guardian_link_token_ttl() THEN
      NEW.expires_at := now() + core.guardian_link_token_ttl();
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: 사용 한도 증가·만료 연장·해시 변경·사용 횟수 되돌리기 금지
  IF NEW.max_uses > OLD.max_uses THEN
    NEW.max_uses := OLD.max_uses;
  END IF;
  IF OLD.expires_at IS NOT NULL
     AND (NEW.expires_at IS NULL OR NEW.expires_at > OLD.expires_at) THEN
    NEW.expires_at := OLD.expires_at;
  END IF;
  IF NEW.token_hash IS DISTINCT FROM OLD.token_hash THEN
    NEW.token_hash := OLD.token_hash;
  END IF;
  IF NEW.used_count < OLD.used_count THEN
    NEW.used_count := OLD.used_count;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION core.enforce_guardian_link_token_limits() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guardian_link_tokens_enforce_limits ON core.guardian_link_tokens;
CREATE TRIGGER trg_guardian_link_tokens_enforce_limits
  BEFORE INSERT OR UPDATE ON core.guardian_link_tokens
  FOR EACH ROW EXECUTE FUNCTION core.enforce_guardian_link_token_limits();

-- 일반 구성원이 token_hash 를 직접 읽지 못하게 함 (8자리 코드는 오프라인 대입 가능).
-- 관리자 ALL 정책(guardian_link_tokens_admin)은 유지. 클라이언트는 RPC 만 사용.
DROP POLICY IF EXISTS guardian_link_tokens_member_select ON core.guardian_link_tokens;

-- ---------------------------------------------------------------------------
-- 2. 시도 기록 테이블 + rate limit 설정
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.guardian_link_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('preview', 'redeem')),
  token_hash TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  organization_id UUID REFERENCES core.organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE core.guardian_link_attempts IS
  '보호자 연결 코드 preview/redeem 시도 기록 (rate limit·감사용). 클라이언트 직접 접근 불가. 보관 주기 정리 필요.';

CREATE INDEX IF NOT EXISTS idx_guardian_link_attempts_user_created
  ON core.guardian_link_attempts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guardian_link_attempts_token_created
  ON core.guardian_link_attempts (token_hash, created_at DESC);

ALTER TABLE core.guardian_link_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON core.guardian_link_attempts FROM PUBLIC, anon, authenticated;

INSERT INTO core.rate_limit_configs (limit_type, max_requests, window_seconds, description)
VALUES
  ('guardian_link_attempt_per_user', 30, 900, '보호자 연결 코드 preview/redeem 시도 (사용자당 15분)'),
  ('guardian_link_failure_per_user', 10, 900, '보호자 연결 코드 실패 시도 (사용자당 15분)'),
  ('guardian_link_attempt_per_token', 10, 900, '동일 연결 코드 시도 (코드당 15분)')
ON CONFLICT (limit_type) DO NOTHING;

-- check_rate_limit(uuid,text) 확장: guardian_link_* 분기 추가 (시그니처 동일)
CREATE OR REPLACE FUNCTION core.check_rate_limit(p_user_id uuid, p_limit_type text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'core', 'public'
AS $function$
DECLARE
  v_config RECORD;
  v_last_action TIMESTAMPTZ;
  v_action_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_is_allowed BOOLEAN;
  v_retry_after INTEGER;
BEGIN
  SELECT * INTO v_config
  FROM core.rate_limit_configs
  WHERE limit_type = p_limit_type AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'allowed', true,
      'limit_type', p_limit_type,
      'reason', 'no_limit_configured'
    );
  END IF;

  v_window_start := now() - (v_config.window_seconds || ' seconds')::interval;

  IF p_limit_type LIKE 'org_creation%' THEN
    SELECT last_org_created_at INTO v_last_action
    FROM core.profiles
    WHERE id = p_user_id;

    SELECT COUNT(*) INTO v_action_count
    FROM core.organizations
    WHERE id IN (
      SELECT organization_id
      FROM core.organization_members
      WHERE user_id = p_user_id AND role = 'owner'
    )
    AND created_at > v_window_start;

  ELSIF p_limit_type LIKE 'join_request%' THEN
    SELECT COUNT(*) INTO v_action_count
    FROM core.customer_join_requests
    WHERE applicant_user_id = p_user_id
    AND created_at > v_window_start;

  ELSIF p_limit_type = 'guardian_link_attempt_per_user' THEN
    -- rate_limited 로 거절된 기록은 제외 (재시도 폭주로 잠금이 무한 연장되지 않도록)
    SELECT COUNT(*), MIN(created_at) INTO v_action_count, v_last_action
    FROM core.guardian_link_attempts
    WHERE user_id = p_user_id
      AND created_at > v_window_start
      AND COALESCE(reason, '') <> 'rate_limited';

  ELSIF p_limit_type = 'guardian_link_failure_per_user' THEN
    SELECT COUNT(*), MIN(created_at) INTO v_action_count, v_last_action
    FROM core.guardian_link_attempts
    WHERE user_id = p_user_id
      AND created_at > v_window_start
      AND success = false
      AND COALESCE(reason, '') <> 'rate_limited';
  ELSE
    v_action_count := 0;
  END IF;

  v_is_allowed := v_action_count < v_config.max_requests;

  IF NOT v_is_allowed AND v_last_action IS NOT NULL THEN
    v_retry_after := EXTRACT(EPOCH FROM (v_last_action + (v_config.window_seconds || ' seconds')::interval - now()))::INTEGER;
  ELSE
    v_retry_after := 0;
  END IF;

  RETURN json_build_object(
    'allowed', v_is_allowed,
    'limit_type', p_limit_type,
    'current_count', v_action_count,
    'max_requests', v_config.max_requests,
    'window_seconds', v_config.window_seconds,
    'retry_after', GREATEST(v_retry_after, 0)
  );
END;
$function$;

-- 사용자·코드 단위 통합 가드 (내부 전용)
CREATE OR REPLACE FUNCTION core.guardian_link_rate_guard(p_user_id UUID, p_token_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_res JSON;
  v_type TEXT;
  v_cfg RECORD;
  v_cnt INT;
  v_oldest TIMESTAMPTZ;
BEGIN
  FOREACH v_type IN ARRAY ARRAY['guardian_link_failure_per_user', 'guardian_link_attempt_per_user'] LOOP
    v_res := core.check_rate_limit(p_user_id, v_type);
    IF NOT COALESCE((v_res->>'allowed')::BOOLEAN, true) THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'limit_type', v_type,
        'retry_after', GREATEST(COALESCE((v_res->>'retry_after')::INT, 0), 1)
      );
    END IF;
  END LOOP;

  IF p_token_hash IS NOT NULL THEN
    SELECT * INTO v_cfg
    FROM core.rate_limit_configs
    WHERE limit_type = 'guardian_link_attempt_per_token' AND is_active = true;

    IF FOUND THEN
      SELECT COUNT(*), MIN(created_at) INTO v_cnt, v_oldest
      FROM core.guardian_link_attempts
      WHERE token_hash = p_token_hash
        AND created_at > now() - make_interval(secs => v_cfg.window_seconds)
        AND COALESCE(reason, '') <> 'rate_limited';

      IF v_cnt >= v_cfg.max_requests THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'limit_type', 'guardian_link_attempt_per_token',
          'retry_after', GREATEST(
            EXTRACT(EPOCH FROM (v_oldest + make_interval(secs => v_cfg.window_seconds) - now()))::INT,
            1
          )
        );
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

CREATE OR REPLACE FUNCTION core.log_guardian_link_attempt(
  p_user_id UUID,
  p_action TEXT,
  p_token_hash TEXT,
  p_success BOOLEAN,
  p_reason TEXT,
  p_org_id UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = core, public
AS $$
  INSERT INTO core.guardian_link_attempts (user_id, action, token_hash, success, reason, organization_id)
  VALUES (p_user_id, p_action, p_token_hash, p_success, p_reason, p_org_id);
$$;

REVOKE ALL ON FUNCTION core.guardian_link_rate_guard(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION core.log_guardian_link_attempt(UUID, TEXT, TEXT, BOOLEAN, TEXT, UUID) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. audit_logs entity_type 확장 + 헬퍼
-- ---------------------------------------------------------------------------
ALTER TABLE core.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_entity_type_check;
ALTER TABLE core.audit_logs ADD CONSTRAINT audit_logs_entity_type_check CHECK (
  entity_type = ANY (ARRAY[
    'customer', 'staff', 'booking', 'reservation', 'payment', 'refund',
    'pass', 'membership', 'sale', 'inventory', 'permissions', 'guardian_link'
  ]::TEXT[])
);

CREATE OR REPLACE FUNCTION core.write_guardian_link_audit(
  p_org_id UUID,
  p_action TEXT,
  p_entity_id TEXT,
  p_after JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  IF p_org_id IS NULL OR NULLIF(trim(COALESCE(p_entity_id, '')), '') IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO core.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, after_data)
  VALUES (p_org_id, auth.uid(), p_action, 'guardian_link', p_entity_id, COALESCE(p_after, '{}'::JSONB));
END;
$$;

REVOKE ALL ON FUNCTION core.write_guardian_link_audit(UUID, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. 학생당 계정 연결 보호자 상한 (BEFORE INSERT)
--    - 계정(user_id) 이 연결된 보호자만 센다. 직원이 등록한 계정 없는 보호자 행은 제외.
--    - 직원이 parent_student_links 로 명시 연결한 관계(동기화 트리거 경유 포함)는 예외:
--      직원 저장/동기화가 실패하지 않도록 함. 코드 기반 연결은 redeem 사전 검사가 적용됨.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.enforce_guardian_limit_per_student()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_count INT;
  v_max INT := core.max_linked_guardians_per_student();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM core.parents p WHERE p.id = NEW.parent_id AND p.user_id IS NOT NULL
  ) THEN
    RETURN NEW;
  END IF;

  -- ON CONFLICT DO UPDATE 로 기존 관계를 갱신하는 경우
  IF EXISTS (
    SELECT 1 FROM core.parent_student_guardians g
    WHERE g.parent_id = NEW.parent_id AND g.student_id = NEW.student_id
  ) THEN
    RETURN NEW;
  END IF;

  -- 직원 동기화 트리거(parent_student_links → guardians) 경유
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- 직원이 명시적으로 연결한 관계
  IF EXISTS (
    SELECT 1
    FROM core.parent_student_links psl
    JOIN core.student_enrollments se
      ON se.customer_id = psl.student_customer_id
     AND se.organization_id = psl.organization_id
    WHERE psl.parent_customer_id = NEW.parent_id
      AND se.student_id = NEW.student_id
  ) THEN
    RETURN NEW;
  END IF;

  PERFORM 1 FROM core.students s WHERE s.id = NEW.student_id FOR UPDATE;

  SELECT COUNT(*) INTO v_count
  FROM core.parent_student_guardians g
  JOIN core.parents p ON p.id = g.parent_id
  WHERE g.student_id = NEW.student_id
    AND g.parent_id <> NEW.parent_id
    AND p.user_id IS NOT NULL;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Guardian limit reached (max % linked guardians per student)', v_max
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION core.enforce_guardian_limit_per_student() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_parent_student_guardians_limit ON core.parent_student_guardians;
CREATE TRIGGER trg_parent_student_guardians_limit
  BEFORE INSERT ON core.parent_student_guardians
  FOR EACH ROW EXECUTE FUNCTION core.enforce_guardian_limit_per_student();

-- ---------------------------------------------------------------------------
-- 5. 발급 RPC (시그니처 유지)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.create_guardian_link_token(
  p_org_id uuid,
  p_customer_id uuid,
  p_expires_days integer DEFAULT 7,
  p_max_uses integer DEFAULT 1
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'core', 'public'
AS $function$
DECLARE
  v_enrollment RECORD;
  v_token TEXT;
  v_hash TEXT;
  v_id UUID;
  v_expires TIMESTAMPTZ;
  v_revoked INT := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT se.*, s.display_name AS student_name
  INTO v_enrollment
  FROM core.student_enrollments se
  JOIN core.students s ON s.id = se.student_id
  WHERE se.customer_id = p_customer_id AND se.organization_id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student enrollment not found';
  END IF;

  -- p_max_uses 는 호환용으로만 받고 무시 (항상 1회용). 만료는 1~7일.
  v_expires := now() + make_interval(days => LEAST(GREATEST(COALESCE(p_expires_days, 7), 1), 7));

  -- 동일 학생의 이전 활성 일반 코드 자동 폐기 (학부모 초대 코드는 별도 범위)
  WITH revoked AS (
    UPDATE core.guardian_link_tokens glt
    SET used_count = glt.max_uses,
        metadata = glt.metadata || jsonb_build_object(
          'revoked', true,
          'revoked_at', now(),
          'revoked_reason', 'reissued',
          'revoked_by', auth.uid()
        )
    WHERE glt.organization_id = p_org_id
      AND glt.student_id = v_enrollment.student_id
      AND glt.used_count < glt.max_uses
      AND (glt.expires_at IS NULL OR glt.expires_at > now())
      AND NULLIF(glt.metadata->>'parent_customer_id', '') IS NULL
    RETURNING glt.id
  )
  SELECT COUNT(*) INTO v_revoked FROM revoked;

  v_token := core.generate_guardian_link_code();
  v_hash := core.guardian_link_code_hash(v_token);

  INSERT INTO core.guardian_link_tokens (
    organization_id, student_id, enrollment_id, token_hash, token_type,
    expires_at, max_uses, created_by, metadata
  )
  VALUES (
    p_org_id, v_enrollment.student_id, v_enrollment.id, v_hash, 'invite_code',
    v_expires, 1, auth.uid(),
    jsonb_build_object(
      'student_name', v_enrollment.student_name,
      'customer_id', p_customer_id,
      'code_format', 'v2'
    )
  )
  RETURNING id INTO v_id;

  PERFORM core.write_guardian_link_audit(
    p_org_id, 'guardian_link.issue', v_id::TEXT,
    jsonb_build_object(
      'student_id', v_enrollment.student_id,
      'customer_id', p_customer_id,
      'expires_at', v_expires,
      'revoked_previous', v_revoked
    )
  );

  RETURN jsonb_build_object(
    'id', v_id,
    'token', v_token,
    'expires_at', v_expires,
    'student_name', v_enrollment.student_name,
    'organization_id', p_org_id,
    'max_uses', 1,
    'revoked_previous', v_revoked
  );
END;
$function$;

CREATE OR REPLACE FUNCTION core.create_parent_invite_link_tokens(
  p_org_id uuid,
  p_parent_customer_id uuid,
  p_expires_days integer DEFAULT 7
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'core', 'public'
AS $function$
DECLARE
  v_link RECORD;
  v_token TEXT;
  v_hash TEXT;
  v_id UUID;
  v_expires TIMESTAMPTZ;
  v_revoked INT;
  v_codes JSONB := '[]'::JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- 기존 호출부(invite_parent_member)가 14 를 넘겨도 최대 7일
  v_expires := now() + make_interval(days => LEAST(GREATEST(COALESCE(p_expires_days, 7), 1), 7));

  FOR v_link IN
    SELECT
      psl.student_customer_id,
      c.name AS student_name,
      se.id AS enrollment_id,
      se.student_id
    FROM core.parent_student_links psl
    JOIN core.customers c ON c.id = psl.student_customer_id
    JOIN core.student_enrollments se
      ON se.customer_id = psl.student_customer_id
      AND se.organization_id = p_org_id
    WHERE psl.organization_id = p_org_id
      AND psl.parent_customer_id = p_parent_customer_id
  LOOP
    -- 동일 학생 + 동일 학부모 대상 이전 활성 초대 코드 자동 폐기
    WITH revoked AS (
      UPDATE core.guardian_link_tokens glt
      SET used_count = glt.max_uses,
          metadata = glt.metadata || jsonb_build_object(
            'revoked', true,
            'revoked_at', now(),
            'revoked_reason', 'reissued',
            'revoked_by', auth.uid()
          )
      WHERE glt.organization_id = p_org_id
        AND glt.student_id = v_link.student_id
        AND glt.used_count < glt.max_uses
        AND (glt.expires_at IS NULL OR glt.expires_at > now())
        AND glt.metadata->>'parent_customer_id' = p_parent_customer_id::TEXT
      RETURNING glt.id
    )
    SELECT COUNT(*) INTO v_revoked FROM revoked;

    v_token := core.generate_guardian_link_code();
    v_hash := core.guardian_link_code_hash(v_token);

    INSERT INTO core.guardian_link_tokens (
      organization_id, student_id, enrollment_id, token_hash, token_type,
      expires_at, max_uses, created_by, metadata
    )
    VALUES (
      p_org_id,
      v_link.student_id,
      v_link.enrollment_id,
      v_hash,
      'invite_code',
      v_expires,
      1,
      auth.uid(),
      jsonb_build_object(
        'student_name', v_link.student_name,
        'customer_id', v_link.student_customer_id,
        'parent_customer_id', p_parent_customer_id,
        'source', 'parent_invite',
        'code_format', 'v2'
      )
    )
    RETURNING id INTO v_id;

    PERFORM core.write_guardian_link_audit(
      p_org_id, 'guardian_link.issue', v_id::TEXT,
      jsonb_build_object(
        'student_id', v_link.student_id,
        'customer_id', v_link.student_customer_id,
        'parent_customer_id', p_parent_customer_id,
        'source', 'parent_invite',
        'expires_at', v_expires,
        'revoked_previous', v_revoked
      )
    );

    v_codes := v_codes || jsonb_build_array(jsonb_build_object(
      'token', v_token,
      'student_name', v_link.student_name,
      'customer_id', v_link.student_customer_id,
      'expires_at', v_expires
    ));
  END LOOP;

  RETURN v_codes;
END;
$function$;

CREATE OR REPLACE FUNCTION core.revoke_guardian_link_token(p_org_id uuid, p_token_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'core', 'public'
AS $function$
DECLARE
  v_found BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE core.guardian_link_tokens
  SET used_count = max_uses,
      metadata = metadata || jsonb_build_object(
        'revoked', true,
        'revoked_at', now(),
        'revoked_reason', 'manual',
        'revoked_by', auth.uid()
      )
  WHERE id = p_token_id AND organization_id = p_org_id;

  v_found := FOUND;

  IF v_found THEN
    PERFORM core.write_guardian_link_audit(
      p_org_id, 'guardian_link.revoke', p_token_id::TEXT,
      jsonb_build_object('reason', 'manual')
    );
  END IF;

  RETURN v_found;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 6. preview (시그니처 유지, STABLE → VOLATILE: 시도 기록)
--    성공: {valid:true, status:'valid', organization_name, student_name, expires_at}
--    실패: {valid:false, status:'invalid_or_expired'|'rate_limited'|'guardian_limit_reached',
--           error, retry_after_seconds?}
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.preview_guardian_link_token(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO 'core', 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_hash TEXT;
  v_guard JSONB;
  v_row RECORD;
  v_linked INT;
  v_found BOOLEAN := false;
  v_max INT := core.max_linked_guardians_per_student();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_hash := core.guardian_link_code_hash(p_token);

  v_guard := core.guardian_link_rate_guard(v_uid, v_hash);
  IF NOT (v_guard->>'allowed')::BOOLEAN THEN
    PERFORM core.log_guardian_link_attempt(v_uid, 'preview', v_hash, false, 'rate_limited', NULL);
    RETURN jsonb_build_object(
      'valid', false,
      'status', 'rate_limited',
      'error', 'Too many attempts',
      'retry_after_seconds', (v_guard->>'retry_after')::INT
    );
  END IF;

  IF v_hash IS NOT NULL THEN
    SELECT
      glt.id,
      glt.organization_id,
      glt.student_id,
      glt.expires_at,
      glt.metadata,
      o.name AS org_name,
      COALESCE(NULLIF(trim(s.display_name), ''), NULLIF(trim(glt.metadata->>'student_name'), '')) AS student_name
    INTO v_row
    FROM core.guardian_link_tokens glt
    JOIN core.organizations o ON o.id = glt.organization_id
    LEFT JOIN core.students s ON s.id = glt.student_id
    WHERE glt.token_hash = v_hash
      AND glt.used_count < glt.max_uses
      AND (glt.expires_at IS NULL OR glt.expires_at > now())
      AND COALESCE(glt.metadata->>'revoked', 'false') <> 'true'
    ORDER BY glt.created_at DESC
    LIMIT 1;
    v_found := FOUND;
  END IF;

  IF NOT v_found THEN
    PERFORM core.log_guardian_link_attempt(v_uid, 'preview', v_hash, false, 'invalid_or_expired', NULL);
    RETURN jsonb_build_object(
      'valid', false,
      'status', 'invalid_or_expired',
      'error', 'Invalid or expired link code'
    );
  END IF;

  SELECT COUNT(*) INTO v_linked
  FROM core.parent_student_guardians g
  JOIN core.parents p ON p.id = g.parent_id
  WHERE g.student_id = v_row.student_id
    AND p.user_id IS NOT NULL
    AND p.user_id <> v_uid
    AND g.parent_id IS DISTINCT FROM NULLIF(v_row.metadata->>'parent_customer_id', '')::UUID;

  IF v_linked >= v_max THEN
    PERFORM core.log_guardian_link_attempt(v_uid, 'preview', v_hash, false, 'guardian_limit_reached', v_row.organization_id);
    RETURN jsonb_build_object(
      'valid', false,
      'status', 'guardian_limit_reached',
      'error', 'Guardian limit reached',
      'max_guardians', v_max
    );
  END IF;

  PERFORM core.log_guardian_link_attempt(v_uid, 'preview', v_hash, true, NULL, v_row.organization_id);
  PERFORM core.write_guardian_link_audit(
    v_row.organization_id, 'guardian_link.preview', v_row.id::TEXT,
    jsonb_build_object('student_id', v_row.student_id)
  );

  RETURN jsonb_build_object(
    'valid', true,
    'status', 'valid',
    'organization_name', v_row.org_name,
    'student_name', COALESCE(v_row.student_name, ''),
    'expires_at', v_row.expires_at
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 7. redeem (시그니처·기존 반환 키 유지)
--    실패: {success:false, status:'invalid_or_expired'|'rate_limited'|'guardian_limit_reached', error}
--    성공: {success:true, status:'linked'|'linked_enrollment_pending', ..., enrollment_request_id}
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.redeem_guardian_link_token(
  p_token text,
  p_shared_fields jsonb DEFAULT '["display_name", "birth_date"]'::jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'core', 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_hash TEXT;
  v_guard JSONB;
  v_row RECORD;
  v_parent_id UUID;
  v_profile RECORD;
  v_parent_customer_id UUID;
  v_token_parent_customer_id UUID;
  v_relationship core.guardian_relationship := 'other';
  v_is_primary BOOLEAN := false;
  v_student_customer_id UUID;
  v_merged INT;
  v_links_synced INT;
  v_linked INT;
  v_max INT := core.max_linked_guardians_per_student();
  v_enrollment_status TEXT;
  v_status TEXT := 'linked';
  v_request_id UUID;
  v_found BOOLEAN := false;
  v_shared JSONB := COALESCE(p_shared_fields, '["display_name","birth_date"]'::JSONB);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_hash := core.guardian_link_code_hash(p_token);

  v_guard := core.guardian_link_rate_guard(v_uid, v_hash);
  IF NOT (v_guard->>'allowed')::BOOLEAN THEN
    PERFORM core.log_guardian_link_attempt(v_uid, 'redeem', v_hash, false, 'rate_limited', NULL);
    RETURN jsonb_build_object(
      'success', false,
      'status', 'rate_limited',
      'error', 'Too many attempts',
      'retry_after_seconds', (v_guard->>'retry_after')::INT
    );
  END IF;

  IF v_hash IS NOT NULL THEN
    SELECT glt.*, s.display_name AS student_name, o.name AS org_name
    INTO v_row
    FROM core.guardian_link_tokens glt
    JOIN core.students s ON s.id = glt.student_id
    JOIN core.organizations o ON o.id = glt.organization_id
    WHERE glt.token_hash = v_hash
      AND glt.used_count < glt.max_uses
      AND (glt.expires_at IS NULL OR glt.expires_at > now())
      AND COALESCE(glt.metadata->>'revoked', 'false') <> 'true'
    ORDER BY glt.created_at DESC
    LIMIT 1
    FOR UPDATE OF glt;
    v_found := FOUND;
  END IF;

  IF NOT v_found THEN
    PERFORM core.log_guardian_link_attempt(v_uid, 'redeem', v_hash, false, 'invalid_or_expired', NULL);
    RETURN jsonb_build_object(
      'success', false,
      'status', 'invalid_or_expired',
      'error', 'Invalid or expired link code'
    );
  END IF;

  v_student_customer_id := NULLIF(v_row.metadata->>'customer_id', '')::UUID;
  v_token_parent_customer_id := NULLIF(v_row.metadata->>'parent_customer_id', '')::UUID;

  -- 보호자 상한 사전 검사 (코드 소비·변경 전). 동시 redeem 직렬화를 위해 학생 행 잠금.
  PERFORM 1 FROM core.students s WHERE s.id = v_row.student_id FOR UPDATE;

  SELECT COUNT(*) INTO v_linked
  FROM core.parent_student_guardians g
  JOIN core.parents p ON p.id = g.parent_id
  WHERE g.student_id = v_row.student_id
    AND p.user_id IS NOT NULL
    AND p.user_id <> v_uid
    AND g.parent_id IS DISTINCT FROM v_token_parent_customer_id;

  IF v_linked >= v_max THEN
    PERFORM core.log_guardian_link_attempt(v_uid, 'redeem', v_hash, false, 'guardian_limit_reached', v_row.organization_id);
    PERFORM core.write_guardian_link_audit(
      v_row.organization_id, 'guardian_link.redeem_rejected', v_row.id::TEXT,
      jsonb_build_object(
        'reason', 'guardian_limit_reached',
        'student_id', v_row.student_id,
        'max_guardians', v_max
      )
    );
    RETURN jsonb_build_object(
      'success', false,
      'status', 'guardian_limit_reached',
      'error', 'Guardian limit reached',
      'max_guardians', v_max,
      'student_name', v_row.student_name,
      'organization_name', v_row.org_name,
      'organization_id', v_row.organization_id
    );
  END IF;

  v_parent_id := core.ensure_global_parent_profile();
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Could not create parent profile';
  END IF;

  SELECT * INTO v_profile FROM core.profiles WHERE id = v_uid;

  UPDATE core.parents
  SET name = COALESCE(NULLIF(name, '학부모'), v_profile.full_name, '학부모'),
      email = COALESCE(email, v_profile.email),
      updated_at = now()
  WHERE id = v_parent_id;

  v_parent_customer_id := v_token_parent_customer_id;

  IF v_parent_customer_id IS NOT NULL THEN
    IF v_parent_id <> v_parent_customer_id THEN
      UPDATE core.parents
      SET user_id = NULL, updated_at = now()
      WHERE id = v_parent_id AND user_id = v_uid;
    END IF;

    UPDATE core.customers
    SET user_id = v_uid, updated_at = now()
    WHERE id = v_parent_customer_id AND organization_id = v_row.organization_id;

    INSERT INTO core.parents (id, user_id, name, phone, email)
    SELECT c.id, v_uid, c.name, c.phone, c.email
    FROM core.customers c
    WHERE c.id = v_parent_customer_id
    ON CONFLICT (id) DO UPDATE SET
      user_id = v_uid,
      name = COALESCE(EXCLUDED.name, core.parents.name),
      phone = COALESCE(EXCLUDED.phone, core.parents.phone),
      email = COALESCE(EXCLUDED.email, core.parents.email),
      updated_at = now();

    IF v_parent_id <> v_parent_customer_id THEN
      UPDATE core.parent_student_guardians
      SET parent_id = v_parent_customer_id, updated_at = now()
      WHERE parent_id = v_parent_id;

      DELETE FROM core.parents p
      WHERE p.id = v_parent_id
        AND NOT EXISTS (
          SELECT 1 FROM core.parent_student_guardians psg WHERE psg.parent_id = p.id
        );

      v_parent_id := v_parent_customer_id;
    END IF;
  END IF;

  v_parent_customer_id := core.ensure_org_parent_customer(v_parent_id, v_row.organization_id);

  IF v_student_customer_id IS NOT NULL AND v_parent_customer_id IS NOT NULL THEN
    SELECT psl.relationship, psl.is_primary
    INTO v_relationship, v_is_primary
    FROM core.parent_student_links psl
    WHERE psl.organization_id = v_row.organization_id
      AND psl.parent_customer_id = v_parent_customer_id
      AND psl.student_customer_id = v_student_customer_id
    LIMIT 1;
  END IF;

  IF v_is_primary THEN
    UPDATE core.parent_student_guardians
    SET is_primary = false, updated_at = now()
    WHERE parent_id = v_parent_id AND is_primary = true;
  END IF;

  INSERT INTO core.parent_student_guardians (parent_id, student_id, relationship, is_primary)
  VALUES (v_parent_id, v_row.student_id, COALESCE(v_relationship, 'other'), COALESCE(v_is_primary, false))
  ON CONFLICT (parent_id, student_id) DO UPDATE SET
    relationship = COALESCE(EXCLUDED.relationship, core.parent_student_guardians.relationship),
    is_primary = EXCLUDED.is_primary OR core.parent_student_guardians.is_primary,
    updated_at = now();

  v_merged := core.merge_parent_created_student_if_duplicate(v_parent_id, v_row.student_id);

  INSERT INTO core.academy_data_sharing_consents (
    parent_id, student_id, organization_id, shared_fields
  )
  VALUES (
    v_parent_id,
    v_row.student_id,
    v_row.organization_id,
    v_shared
  )
  ON CONFLICT (parent_id, student_id, organization_id) DO UPDATE SET
    shared_fields = EXCLUDED.shared_fields,
    consented_at = now();

  -- 등록 상태는 자동 변경하지 않음.
  -- 퇴원/졸업(withdrawn/alumni) 이면 직원 승인 대기 요청을 생성 (approve_guardian_enrollment 로 재등록).
  IF v_row.enrollment_id IS NOT NULL THEN
    SELECT se.status::TEXT INTO v_enrollment_status
    FROM core.student_enrollments se
    WHERE se.id = v_row.enrollment_id;
  END IF;

  IF v_enrollment_status IN ('withdrawn', 'alumni') THEN
    v_status := 'linked_enrollment_pending';

    INSERT INTO core.guardian_enrollment_requests (
      parent_id, student_id, organization_id, status, consent_fields, notes, metadata
    )
    VALUES (
      v_parent_id,
      v_row.student_id,
      v_row.organization_id,
      'pending',
      v_shared,
      '보호자 연결 코드로 연결됨 (퇴원 상태 — 재등록 승인 필요)',
      jsonb_build_object(
        'source', 'guardian_link_redeem',
        'token_id', v_row.id,
        'enrollment_id', v_row.enrollment_id,
        'enrollment_status', v_enrollment_status
      )
    )
    ON CONFLICT (parent_id, student_id, organization_id) WHERE status = 'pending'
    DO NOTHING
    RETURNING id INTO v_request_id;

    IF v_request_id IS NULL THEN
      SELECT ger.id INTO v_request_id
      FROM core.guardian_enrollment_requests ger
      WHERE ger.parent_id = v_parent_id
        AND ger.student_id = v_row.student_id
        AND ger.organization_id = v_row.organization_id
        AND ger.status = 'pending'
      LIMIT 1;
    END IF;
  END IF;

  UPDATE core.guardian_link_tokens
  SET used_count = used_count + 1,
      metadata = metadata || jsonb_build_object(
        'redeemed_by', v_uid,
        'redeemed_at', now(),
        'redeem_status', v_status
      )
  WHERE id = v_row.id;

  v_links_synced := core.sync_parent_student_links_for_parent_org(v_parent_id, v_row.organization_id);

  PERFORM core.log_guardian_link_attempt(v_uid, 'redeem', v_hash, true, v_status, v_row.organization_id);
  PERFORM core.write_guardian_link_audit(
    v_row.organization_id, 'guardian_link.redeem', v_row.id::TEXT,
    jsonb_build_object(
      'status', v_status,
      'student_id', v_row.student_id,
      'parent_id', v_parent_id,
      'enrollment_status', v_enrollment_status,
      'enrollment_request_id', v_request_id,
      'shared_fields', v_shared
    )
  );

  -- 직원용 알림 (학부모 RLS 대상 타입 아님 → 관리자만 조회)
  INSERT INTO core.notifications (
    organization_id, type, title, message, target_type, target_id,
    status, channel, sent_at, metadata
  )
  VALUES (
    v_row.organization_id,
    'guardian_linked',
    '학부모 계정 연결',
    COALESCE(NULLIF(trim(v_row.student_name), ''), '학생') || ' 학생에 학부모 계정이 연결되었습니다.'
      || CASE WHEN v_status = 'linked_enrollment_pending'
              THEN ' 퇴원 상태라 재등록 승인이 필요합니다.' ELSE '' END,
    'student',
    COALESCE(v_student_customer_id, v_row.student_id),
    'sent',
    'app',
    now(),
    jsonb_build_object(
      'source', 'guardian_link_redeem',
      'student_id', v_row.student_id,
      'parent_id', v_parent_id,
      'token_id', v_row.id,
      'status', v_status,
      'enrollment_request_id', v_request_id,
      'audience', 'staff'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', v_status,
    'student_name', v_row.student_name,
    'organization_name', v_row.org_name,
    'organization_id', v_row.organization_id,
    'student_id', v_row.student_id,
    'merged_duplicates', v_merged,
    'links_synced', v_links_synced,
    'enrollment_status', v_enrollment_status,
    'enrollment_request_id', v_request_id
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 8. 초대 메일 컨텍스트: 정규화·해시 헬퍼 사용 (digest 비의존)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.get_parent_invite_email_context(p_tokens text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'core', 'public', 'extensions'
AS $function$
DECLARE
  v_tokens TEXT[];
  v_matched INT;
  v_org_ids UUID[];
  v_parent_ids TEXT[];
  v_org_id UUID;
  v_parent_customer_id UUID;
  v_email TEXT;
  v_parent_name TEXT;
  v_org_name TEXT;
  v_codes JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT array_agg(DISTINCT core.normalize_guardian_link_code(t))
  INTO v_tokens
  FROM unnest(COALESCE(p_tokens, ARRAY[]::TEXT[])) AS t
  WHERE core.normalize_guardian_link_code(t) <> '';

  IF v_tokens IS NULL OR cardinality(v_tokens) = 0 OR cardinality(v_tokens) > 20 THEN
    RAISE EXCEPTION 'Invalid invitation request';
  END IF;

  SELECT
    count(*),
    array_agg(DISTINCT glt.organization_id),
    array_agg(DISTINCT COALESCE(glt.metadata->>'parent_customer_id', ''))
  INTO v_matched, v_org_ids, v_parent_ids
  FROM unnest(v_tokens) AS t(token)
  JOIN core.guardian_link_tokens glt
    ON glt.token_hash = core.guardian_link_code_hash(t.token)
  WHERE glt.used_count < glt.max_uses
    AND (glt.expires_at IS NULL OR glt.expires_at > now())
    AND COALESCE(glt.metadata->>'revoked', 'false') <> 'true';

  IF v_matched IS DISTINCT FROM cardinality(v_tokens)
     OR cardinality(v_org_ids) <> 1
     OR cardinality(v_parent_ids) <> 1
     OR v_parent_ids[1] = '' THEN
    RAISE EXCEPTION 'Invalid invitation request';
  END IF;

  v_org_id := v_org_ids[1];
  v_parent_customer_id := v_parent_ids[1]::UUID;

  IF NOT core.is_org_admin(v_org_id) THEN
    RAISE EXCEPTION 'Invalid invitation request';
  END IF;

  SELECT pi.email INTO v_email
  FROM core.parent_invitations pi
  WHERE pi.organization_id = v_org_id
    AND pi.parent_customer_id = v_parent_customer_id
    AND pi.status = 'pending';

  IF core.normalize_identity_email(v_email) IS NULL THEN
    RAISE EXCEPTION 'Invalid invitation request';
  END IF;

  SELECT c.name INTO v_parent_name
  FROM core.customers c
  WHERE c.id = v_parent_customer_id AND c.organization_id = v_org_id;

  SELECT o.name INTO v_org_name FROM core.organizations o WHERE o.id = v_org_id;

  SELECT jsonb_agg(
    jsonb_build_object(
      'token', t.token,
      'student_name', COALESCE(NULLIF(trim(s.display_name), ''), glt.metadata->>'student_name', ''),
      'expires_at', glt.expires_at
    )
    ORDER BY COALESCE(s.display_name, glt.metadata->>'student_name', '')
  )
  INTO v_codes
  FROM unnest(v_tokens) AS t(token)
  JOIN core.guardian_link_tokens glt
    ON glt.token_hash = core.guardian_link_code_hash(t.token)
  LEFT JOIN core.students s ON s.id = glt.student_id;

  RETURN jsonb_build_object(
    'organization_id', v_org_id,
    'organization_name', COALESCE(v_org_name, ''),
    'parent_customer_id', v_parent_customer_id,
    'parent_name', COALESCE(v_parent_name, ''),
    'email', core.normalize_identity_email(v_email),
    'link_codes', COALESCE(v_codes, '[]'::JSONB)
  );
END;
$function$;

-- 권한 재확인 (CREATE OR REPLACE 는 기존 GRANT 유지하지만 명시)
REVOKE ALL ON FUNCTION core.preview_guardian_link_token(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION core.redeem_guardian_link_token(TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.preview_guardian_link_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.redeem_guardian_link_token(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION core.create_guardian_link_token(UUID, UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.create_parent_invite_link_tokens(UUID, UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.revoke_guardian_link_token(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.list_guardian_link_tokens(UUID) TO authenticated;
