-- =============================================================================
-- HOTFIX: 이메일 기반 자동 연결 차단 (학부모·교직원 계정 탈취 경로 제거)
--
-- 문제
--   1) core.profiles.email 은 authenticated 사용자가 자기 행을 UPDATE 할 수 있었다
--      (테이블 단위 GRANT UPDATE + profiles_update_own RLS). 즉 누구나 자기
--      profiles.email 을 남의 이메일로 바꿀 수 있었다.
--   2) connect_parent_on_login / connect_staff_on_login / invite_parent_member 가
--      profiles.email(또는 auth_providers.email)이 초대 이메일과 같으면
--      "본인"으로 보고 자동 연결했다. 가입 이메일 인증도 자동 확인 처리된다.
--   → 다른 사람 이메일만 알면 그 사람의 자녀 정보(학부모) 또는 사업장(교직원)에
--     접근할 수 있었다.
--
-- 이번 migration
--   A. profiles.email 은 항상 auth.users.email 과 같도록 강제 (BEFORE 트리거)
--      + auth.users.email 변경 시 profiles.email 동기화 (AFTER 트리거)
--      + 적용 전 불일치 행을 snapshot 테이블에 보존 (감사용, 이후 동기화)
--   B. 이메일 매칭 helper 는 auth.users.email 만 신뢰. 일반 사용자 EXECUTE 회수.
--   C. connect_parent_on_login / connect_staff_on_login → 같은 시그니처·반환 형태의 no-op
--   D. invite_parent_member → 이메일 일치 자동 연결 분기 제거. 항상 pending 초대 +
--      연결 코드 발급 후 'invited' 반환 (시그니처·반환 키 유지)
--   E. send-parent-invitation Edge Function 용 서버 권위 조회 RPC
--      core.get_parent_invite_email_context(TEXT[])
--
-- 하위 호환: 기존 RPC 이름·인자·반환 형태를 유지한다 (구버전 모바일 앱 대응).
-- redeem_guardian_link_token(TEXT, JSONB) 는 변경하지 않는다 (토큰 기반 수락 경로).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A-0. 적용 전 profiles.email ≠ auth.users.email 행 보존 (service_role 전용)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.security_profile_email_snapshot (
  user_id        UUID PRIMARY KEY,
  profile_email  TEXT,
  auth_email     TEXT,
  captured_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE core.security_profile_email_snapshot IS
  '20260928 hotfix 적용 직전 profiles.email 과 auth.users.email 이 달랐던 사용자. 감사 전용(service_role). supabase/audits/20260928_parent_link_audit.sql 참고.';

ALTER TABLE core.security_profile_email_snapshot ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON core.security_profile_email_snapshot FROM PUBLIC;
REVOKE ALL ON core.security_profile_email_snapshot FROM anon, authenticated;

INSERT INTO core.security_profile_email_snapshot (user_id, profile_email, auth_email)
SELECT p.id, p.email, u.email
FROM core.profiles p
JOIN auth.users u ON u.id = p.id
WHERE lower(trim(COALESCE(p.email, ''))) IS DISTINCT FROM lower(trim(COALESCE(u.email, '')))
ON CONFLICT (user_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- A-1. profiles.email 은 auth.users.email 만 반영 (사용자 직접 변경 무효화)
--   테이블 단위 GRANT UPDATE 가 있어 컬럼 단위 REVOKE 만으로는 막을 수 없다.
--   트리거는 모든 INSERT/UPDATE 경로(PostgREST, SECURITY DEFINER 함수)에 적용된다.
--   다른 컬럼 수정은 그대로 허용하고 email 만 조용히 auth 값으로 되돌린다
--   (구버전 클라이언트가 오류 없이 동작하도록 예외를 던지지 않는다).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.enforce_profile_email_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_auth_email TEXT;
BEGIN
  SELECT u.email INTO v_auth_email
  FROM auth.users u
  WHERE u.id = NEW.id;

  IF FOUND THEN
    NEW.email := v_auth_email;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.email := OLD.email;
  ELSE
    NEW.email := NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION core.enforce_profile_email_from_auth() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_profiles_email_from_auth ON core.profiles;
CREATE TRIGGER trg_profiles_email_from_auth
  BEFORE INSERT OR UPDATE ON core.profiles
  FOR EACH ROW EXECUTE FUNCTION core.enforce_profile_email_from_auth();

-- auth 쪽 이메일 변경(확인 완료 후)이 profiles 에 반영되도록
CREATE OR REPLACE FUNCTION core.sync_profile_email_from_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE core.profiles
    SET email = NEW.email, updated_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION core.sync_profile_email_from_auth_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION core.sync_profile_email_from_auth_user();

-- 기존 불일치 행 동기화 (snapshot 보존 후). BEFORE 트리거가 auth 값으로 맞춘다.
UPDATE core.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id
  AND p.email IS DISTINCT FROM u.email;

-- -----------------------------------------------------------------------------
-- B. 이메일 identity helper: auth.users.email 만 신뢰
--   auth_providers.email 은 register_auth_provider(p_email) 로 클라이언트가 채울 수 있고,
--   profiles.email 은 과거 사용자 수정 가능했으므로 신뢰하지 않는다.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.user_identity_matches_email(p_user_id UUID, p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT
    core.normalize_identity_email(p_email) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = p_user_id
        AND core.normalize_identity_email(u.email) = core.normalize_identity_email(p_email)
    );
$$;

CREATE OR REPLACE FUNCTION core.find_user_id_by_identity_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
  SELECT u.id
  FROM auth.users u
  WHERE core.normalize_identity_email(p_email) IS NOT NULL
    AND core.normalize_identity_email(u.email) = core.normalize_identity_email(p_email)
  ORDER BY u.created_at
  LIMIT 1;
$$;

-- 이메일 → user_id 조회는 계정 존재 여부 오라클이므로 일반 사용자에게 열지 않는다.
REVOKE EXECUTE ON FUNCTION core.user_identity_matches_email(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION core.find_user_id_by_identity_email(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION core.user_identity_matches_email(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION core.find_user_id_by_identity_email(TEXT) TO service_role;

-- email identity 동기화도 auth.users.email 기준 (hijack guard 버전 유지)
CREATE OR REPLACE FUNCTION core.sync_auth_providers_for_user(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_auth_email TEXT;
  v_count INT := 0;
  v_email TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'sync_auth_providers_for_user: caller may only sync own user';
  END IF;

  SELECT email INTO v_auth_email FROM auth.users WHERE id = p_user_id;
  v_email := core.normalize_identity_email(v_auth_email);

  IF v_email IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO core.auth_providers (user_id, provider, provider_user_id, email, verified_at)
  VALUES (p_user_id, 'email', v_email, v_email, now())
  ON CONFLICT (provider, provider_user_id) DO UPDATE SET
    email = EXCLUDED.email,
    verified_at = COALESCE(core.auth_providers.verified_at, EXCLUDED.verified_at),
    updated_at = now()
  WHERE core.auth_providers.user_id = EXCLUDED.user_id;

  IF EXISTS (
    SELECT 1
    FROM core.auth_providers ap
    WHERE ap.provider = 'email'
      AND ap.provider_user_id = v_email
      AND ap.user_id = p_user_id
  ) THEN
    v_count := 1;
  END IF;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION core.sync_auth_providers_for_user(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- C. 로그인 시 이메일 자동 연결 → no-op (시그니처·반환 형태 유지)
--   구버전 앱은 로그인마다 두 RPC 를 호출하고 오류 시 조직 로딩이 실패하므로
--   DROP 하지 않고 { connected: 0, memberships: [] } 를 반환한다.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.connect_parent_on_login()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  -- 20260928 hotfix: 이메일 일치만으로 학부모 레코드를 연결하지 않는다.
  -- 연결은 redeem_guardian_link_token(연결 코드/QR + 학부모 수락)으로만 한다.
  RETURN jsonb_build_object('connected', 0, 'memberships', '[]'::JSONB);
END;
$$;

COMMENT ON FUNCTION core.connect_parent_on_login() IS
  '20260928 hotfix: no-op (구버전 앱 호환). 이메일 기반 자동 연결 제거. 연결 코드 수락만 허용.';

GRANT EXECUTE ON FUNCTION core.connect_parent_on_login() TO authenticated;
REVOKE EXECUTE ON FUNCTION core.connect_parent_on_login() FROM anon;

CREATE OR REPLACE FUNCTION core.connect_staff_on_login()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 20260928 hotfix: pending staff_invitations 를 이메일 일치만으로 수락하지 않는다.
  RETURN jsonb_build_object('connected', 0, 'memberships', '[]'::JSONB);
END;
$$;

COMMENT ON FUNCTION core.connect_staff_on_login() IS
  '20260928 hotfix: no-op (구버전 앱 호환). pending 교직원 초대의 이메일 기반 자동 수락 제거.';

GRANT EXECUTE ON FUNCTION core.connect_staff_on_login() TO authenticated;
REVOKE EXECUTE ON FUNCTION core.connect_staff_on_login() FROM anon;

-- -----------------------------------------------------------------------------
-- D. invite_parent_member: 이메일 일치 자동 연결 제거
--   항상 pending 초대 + 자녀별 연결 코드 발급 → status 'invited'.
--   반환 키(status, parent_customer_id, invitation_id, email, organization_name, link_codes) 유지.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.invite_parent_member(
  p_org_id UUID,
  p_parent_customer_id UUID,
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_email TEXT;
  v_parent RECORD;
  v_org_name TEXT;
  v_invitation_id UUID;
  v_global_parent_id UUID;
  v_link_codes JSONB := '[]'::JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_email := core.normalize_identity_email(p_email);
  IF v_email IS NULL OR v_email NOT LIKE '%@%' THEN
    RAISE EXCEPTION 'Valid email is required';
  END IF;

  SELECT * INTO v_parent
  FROM core.customers
  WHERE id = p_parent_customer_id AND organization_id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent not found';
  END IF;

  SELECT name INTO v_org_name FROM core.organizations WHERE id = p_org_id;

  UPDATE core.customers SET email = v_email, updated_at = now()
  WHERE id = p_parent_customer_id;

  -- user_id 는 기존 값을 유지만 한다 (새로 붙이지 않음)
  INSERT INTO core.parents (id, user_id, name, phone, email)
  VALUES (p_parent_customer_id, v_parent.user_id, v_parent.name, v_parent.phone, v_email)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    updated_at = now()
  RETURNING id INTO v_global_parent_id;

  INSERT INTO core.org_parent_profiles (parent_id, organization_id, customer_id)
  VALUES (v_global_parent_id, p_org_id, p_parent_customer_id)
  ON CONFLICT (customer_id) DO UPDATE SET parent_id = EXCLUDED.parent_id, updated_at = now();

  INSERT INTO core.parent_invitations (organization_id, parent_customer_id, email, role, invited_by, status)
  VALUES (p_org_id, p_parent_customer_id, v_email, 'parent', auth.uid(), 'pending')
  ON CONFLICT (organization_id, parent_customer_id)
  DO UPDATE SET email = EXCLUDED.email, status = 'pending', invited_by = EXCLUDED.invited_by, accepted_at = NULL
  RETURNING id INTO v_invitation_id;

  v_link_codes := core.create_parent_invite_link_tokens(p_org_id, p_parent_customer_id, 14);

  RETURN jsonb_build_object(
    'status', 'invited',
    'parent_customer_id', p_parent_customer_id,
    'invitation_id', v_invitation_id,
    'email', v_email,
    'organization_name', v_org_name,
    'link_codes', v_link_codes
  );
END;
$$;

COMMENT ON FUNCTION core.invite_parent_member(UUID, UUID, TEXT) IS
  '20260928 hotfix: 이메일 일치 자동 연결 제거. 항상 pending 초대 + 연결 코드, status=invited.';

GRANT EXECUTE ON FUNCTION core.invite_parent_member(UUID, UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION core.invite_parent_member(UUID, UUID, TEXT) FROM anon;

-- -----------------------------------------------------------------------------
-- E. send-parent-invitation Edge Function 용 서버 권위 컨텍스트
--   토큰은 DB에 해시만 있으므로, 호출자가 방금 받은 평문 연결 코드를 넘기면
--   서버가 해시로 검증하고 조직·학부모·수신 이메일·자녀 이름을 DB에서 돌려준다.
--   - 호출자 JWT 로 실행 (auth.uid 필수)
--   - 모든 코드가 유효·미사용·미만료, 같은 조직·같은 학부모(parent_invite) 여야 함
--   - 호출자는 해당 조직 관리자여야 함 (invite_parent_member 와 동일 권한)
--   - 실패 사유를 구분하지 않는다 (코드 유효성 오라클 방지)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.get_parent_invite_email_context(p_tokens TEXT[])
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, public, extensions
AS $$
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

  SELECT array_agg(DISTINCT upper(trim(t)))
  INTO v_tokens
  FROM unnest(COALESCE(p_tokens, ARRAY[]::TEXT[])) AS t
  WHERE NULLIF(trim(t), '') IS NOT NULL;

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
    ON glt.token_hash = encode(digest(t.token, 'sha256'), 'hex')
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
    ON glt.token_hash = encode(digest(t.token, 'sha256'), 'hex')
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
$$;

COMMENT ON FUNCTION core.get_parent_invite_email_context(TEXT[]) IS
  'send-parent-invitation 전용. 연결 코드 해시 검증 + 조직 관리자 확인 후 수신자·이름을 DB에서 반환.';

REVOKE ALL ON FUNCTION core.get_parent_invite_email_context(TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.get_parent_invite_email_context(TEXT[]) TO authenticated;
