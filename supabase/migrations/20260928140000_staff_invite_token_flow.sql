-- =============================================================================
-- HOTFIX 2: 교직원 초대를 "이메일 일치 즉시 연결" → "토큰 기반 명시적 수락"으로 전환
--
-- 문제
--   core.invite_staff_member 는 초대 이메일과 같은 profiles.email 을 가진 계정이 있으면
--   그 계정을 즉시 staff/organization_members 로 연결했다. 가입 시 이메일 인증이
--   자동 확인되므로, 남의 이메일로 먼저 가입한 계정이 사업장에 들어올 수 있었다.
--
-- 이번 migration (선행: 20260928130000_parent_link_hotfix_email_identity.sql)
--   A. staff_invitations 에 토큰 컬럼 추가 (token_hash, expires_at, token_issued_at,
--      revoked_at, accepted_by). 원문 토큰은 저장하지 않는다 (SHA-256 hex 만 저장).
--      직접 INSERT/UPDATE 정책 제거 (RPC 만 쓰기), SELECT 는 관리자만.
--   B. invite_staff_member(UUID,UUID,TEXT): 시그니처 유지. 이메일 일치 연결 제거.
--      항상 pending 초대 + 새 토큰(12자, 60bit, 7일, 1회용) 발급 후 'invited' 반환.
--      재초대(재발급) 시 이전 토큰은 즉시 무효화 (행당 token_hash 1개).
--   C. preview_staff_invite(TEXT) / accept_staff_invite(TEXT): 로그인 사용자가 코드로
--      확인·수락. 서버에서 pending·미만료·미사용·미취소 검증 후에만 organization_members 추가.
--      부여 역할은 항상 'staff' (초대 행의 role 과 무관 — 권한 상승 방지).
--   D. revoke_staff_invitation: 토큰 즉시 폐기 (시그니처 유지).
--   E. get_staff_account_statuses: 만료/토큰 유무 키 추가 (기존 키 유지).
--   F. 레거시 redeem_guardian_link_token(TEXT) 오버로드 제거 (호출 불가·안전하지 않은 구버전 로직).
--      (TEXT,JSONB) 는 유지되며 {p_token} 만 보내는 호출도 이쪽으로 해석된다.
--   G. register_auth_provider: 클라이언트가 보낸 email 을 신뢰하지 않음 (auth.users.email 사용),
--      provider='email' 은 본인 auth 이메일만 등록 가능. 시그니처 유지.
--
-- 해시/난수는 pgcrypto 없이 PostgreSQL 내장 sha256() / gen_random_uuid() 만 사용한다.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. staff_invitations 토큰 컬럼 + 정책
-- -----------------------------------------------------------------------------
ALTER TABLE core.staff_invitations
  ADD COLUMN IF NOT EXISTS token_hash      TEXT,
  ADD COLUMN IF NOT EXISTS expires_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS token_issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_by     UUID REFERENCES core.profiles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_invitations_token_hash
  ON core.staff_invitations (token_hash)
  WHERE token_hash IS NOT NULL;

COMMENT ON COLUMN core.staff_invitations.token_hash IS
  'SHA-256 hex of the staff invite code (원문 미저장). 수락/취소/재발급 시 NULL 또는 교체.';

-- 초대받은 사람의 이메일 일치 SELECT 정책 제거 (토큰 해시 노출 방지). 조회는 관리자만.
DROP POLICY IF EXISTS staff_invitations_select ON core.staff_invitations;
DROP POLICY IF EXISTS staff_invitations_select_admin ON core.staff_invitations;
CREATE POLICY staff_invitations_select_admin ON core.staff_invitations
  FOR SELECT TO authenticated
  USING (core.is_org_admin(organization_id));

-- 직접 쓰기 금지 (token_hash/role 조작 방지). 쓰기는 SECURITY DEFINER RPC 로만.
DROP POLICY IF EXISTS staff_invitations_insert ON core.staff_invitations;
DROP POLICY IF EXISTS staff_invitations_update ON core.staff_invitations;

-- -----------------------------------------------------------------------------
-- 내부 helper: 토큰 생성 / 정규화 / 해시
-- -----------------------------------------------------------------------------
-- 12자, 알파벳 32종(I,O,0,1 제외) → 60bit. gen_random_uuid() 는 pg_strong_random 기반.
CREATE OR REPLACE FUNCTION core.generate_staff_invite_token()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path = pg_catalog
AS $$
DECLARE
  v_alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  -- UUIDv4 의 version(byte 6)/variant(byte 8) 바이트는 제외
  v_idx CONSTANT INT[] := ARRAY[0, 1, 2, 3, 4, 5, 7, 9, 10, 11, 12, 13];
  v_bytes BYTEA;
  v_token TEXT := '';
  i INT;
BEGIN
  v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  FOR i IN 1 .. array_length(v_idx, 1) LOOP
    v_token := v_token || substr(v_alphabet, (get_byte(v_bytes, v_idx[i]) % 32) + 1, 1);
  END LOOP;
  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION core.normalize_staff_invite_token(p_token TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT upper(regexp_replace(COALESCE(p_token, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION core.hash_staff_invite_token(p_token TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT encode(sha256(convert_to(core.normalize_staff_invite_token(p_token), 'UTF8')), 'hex');
$$;

REVOKE ALL ON FUNCTION core.generate_staff_invite_token() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION core.normalize_staff_invite_token(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION core.hash_staff_invite_token(TEXT) FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- B. invite_staff_member — 이메일 일치 즉시 연결 제거, 항상 토큰 발급
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.invite_staff_member(
  p_org_id UUID,
  p_staff_id UUID,
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_email TEXT;
  v_staff RECORD;
  v_invitation_id UUID;
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
  v_org_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT core.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_email := lower(trim(p_email));
  IF v_email IS NULL OR v_email = '' OR v_email NOT LIKE '%@%' THEN
    RAISE EXCEPTION 'Valid email is required';
  END IF;

  SELECT * INTO v_staff
  FROM core.staff
  WHERE id = p_staff_id AND organization_id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff not found';
  END IF;

  UPDATE core.staff
  SET email = v_email, updated_at = now()
  WHERE id = p_staff_id;

  -- 이미 계정이 연결된 교직원: 새 연결을 만들지 않고 상태만 알린다
  IF v_staff.user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'connected',
      'staff_id', p_staff_id,
      'user_id', v_staff.user_id
    );
  END IF;

  v_token := core.generate_staff_invite_token();
  v_expires_at := now() + interval '7 days';

  INSERT INTO core.staff_invitations (
    organization_id, staff_id, email, role, invited_by, status,
    token_hash, expires_at, token_issued_at, revoked_at, accepted_at, accepted_by
  )
  VALUES (
    p_org_id, p_staff_id, v_email, 'staff', auth.uid(), 'pending',
    core.hash_staff_invite_token(v_token), v_expires_at, now(), NULL, NULL, NULL
  )
  ON CONFLICT (organization_id, staff_id)
  DO UPDATE SET
    email = EXCLUDED.email,
    role = 'staff',
    status = 'pending',
    invited_by = EXCLUDED.invited_by,
    token_hash = EXCLUDED.token_hash,       -- 이전 토큰 즉시 무효화
    expires_at = EXCLUDED.expires_at,
    token_issued_at = EXCLUDED.token_issued_at,
    revoked_at = NULL,
    accepted_at = NULL,
    accepted_by = NULL
  RETURNING id INTO v_invitation_id;

  SELECT name INTO v_org_name FROM core.organizations WHERE id = p_org_id;

  RETURN jsonb_build_object(
    'status', 'invited',
    'staff_id', p_staff_id,
    'invitation_id', v_invitation_id,
    'email', v_email,
    'token', v_token,
    'expires_at', v_expires_at,
    'organization_name', v_org_name,
    'staff_name', v_staff.name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.invite_staff_member(UUID, UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION core.invite_staff_member(UUID, UUID, TEXT) FROM anon;

-- -----------------------------------------------------------------------------
-- C. 코드 확인(preview) / 수락(accept)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.preview_staff_invite(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_norm TEXT;
  v_row RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_norm := core.normalize_staff_invite_token(p_token);
  IF length(v_norm) < 8 OR length(v_norm) > 64 THEN
    RAISE EXCEPTION 'Invalid or expired invitation code';
  END IF;

  SELECT si.expires_at, s.name AS staff_name, s.user_id AS staff_user_id, o.name AS org_name
  INTO v_row
  FROM core.staff_invitations si
  JOIN core.staff s ON s.id = si.staff_id AND s.organization_id = si.organization_id
  JOIN core.organizations o ON o.id = si.organization_id
  WHERE si.token_hash = core.hash_staff_invite_token(v_norm)
    AND si.status = 'pending'
    AND si.revoked_at IS NULL
    AND si.expires_at IS NOT NULL
    AND si.expires_at > now();

  IF NOT FOUND OR (v_row.staff_user_id IS NOT NULL AND v_row.staff_user_id <> auth.uid()) THEN
    RAISE EXCEPTION 'Invalid or expired invitation code';
  END IF;

  RETURN jsonb_build_object(
    'organization_name', v_row.org_name,
    'staff_name', v_row.staff_name,
    'role', 'staff',
    'expires_at', v_row.expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION core.accept_staff_invite(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_norm TEXT;
  v_inv RECORD;
  v_staff RECORD;
  v_org_name TEXT;
  v_member_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_norm := core.normalize_staff_invite_token(p_token);
  IF length(v_norm) < 8 OR length(v_norm) > 64 THEN
    RAISE EXCEPTION 'Invalid or expired invitation code';
  END IF;

  SELECT si.* INTO v_inv
  FROM core.staff_invitations si
  WHERE si.token_hash = core.hash_staff_invite_token(v_norm)
    AND si.status = 'pending'
    AND si.revoked_at IS NULL
    AND si.expires_at IS NOT NULL
    AND si.expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation code';
  END IF;

  SELECT * INTO v_staff
  FROM core.staff
  WHERE id = v_inv.staff_id AND organization_id = v_inv.organization_id
  FOR UPDATE;

  IF NOT FOUND OR (v_staff.user_id IS NOT NULL AND v_staff.user_id <> v_uid) THEN
    RAISE EXCEPTION 'Invalid or expired invitation code';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM core.profiles WHERE id = v_uid) THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  UPDATE core.staff
  SET user_id = v_uid, updated_at = now()
  WHERE id = v_staff.id;

  -- 역할은 항상 'staff' (초대 행 role 과 무관)
  INSERT INTO core.organization_members (organization_id, user_id, role, staff_id, is_active)
  VALUES (v_inv.organization_id, v_uid, 'staff', v_staff.id, true)
  ON CONFLICT (organization_id, user_id, role)
  DO UPDATE SET
    staff_id = EXCLUDED.staff_id,
    is_active = true,
    updated_at = now()
  RETURNING id INTO v_member_id;

  UPDATE core.staff_invitations
  SET status = 'accepted',
      accepted_at = now(),
      accepted_by = v_uid,
      token_hash = NULL
  WHERE id = v_inv.id;

  SELECT name INTO v_org_name FROM core.organizations WHERE id = v_inv.organization_id;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_inv.organization_id,
    'organization_name', v_org_name,
    'staff_id', v_staff.id,
    'staff_name', v_staff.name,
    'member_id', v_member_id
  );
END;
$$;

REVOKE ALL ON FUNCTION core.preview_staff_invite(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION core.accept_staff_invite(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.preview_staff_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.accept_staff_invite(TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- D. revoke_staff_invitation — 토큰 즉시 폐기 (시그니처·반환 유지)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.revoke_staff_invitation(p_org_id UUID, p_staff_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE core.staff_invitations
  SET status = 'revoked',
      revoked_at = now(),
      token_hash = NULL
  WHERE organization_id = p_org_id
    AND staff_id = p_staff_id
    AND status = 'pending';

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION core.revoke_staff_invitation(UUID, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION core.revoke_staff_invitation(UUID, UUID) FROM anon;

-- -----------------------------------------------------------------------------
-- E. get_staff_account_statuses — 기존 키 유지 + 만료/토큰 정보 추가
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.get_staff_account_statuses(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_result JSONB;
  v_is_admin BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR NOT core.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_is_admin := core.is_org_admin(p_org_id);

  SELECT COALESCE(jsonb_agg(row_to_json(t)::JSONB), '[]'::JSONB)
  INTO v_result
  FROM (
    SELECT
      s.id AS staff_id,
      CASE
        WHEN s.user_id IS NOT NULL THEN 'connected'
        WHEN si.status = 'pending' THEN 'invited'
        ELSE 'none'
      END AS status,
      s.email,
      si.created_at AS invited_at,
      CASE WHEN v_is_admin THEN si.expires_at END AS invite_expires_at,
      CASE WHEN v_is_admin THEN COALESCE(si.token_issued_at, si.created_at) END AS invite_issued_at,
      (si.id IS NOT NULL AND (si.expires_at IS NULL OR si.expires_at <= now())) AS invite_expired,
      (si.token_hash IS NOT NULL) AS invite_has_code
    FROM core.staff s
    LEFT JOIN core.staff_invitations si
      ON si.staff_id = s.id
      AND si.organization_id = s.organization_id
      AND si.status = 'pending'
    WHERE s.organization_id = p_org_id
  ) t;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION core.get_staff_account_statuses(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- F. 레거시 redeem_guardian_link_token(TEXT) 오버로드 제거
--   (TEXT,JSONB) 버전의 p_shared_fields 에 DEFAULT 가 있어서, 인자 1개 호출은
--   PostgreSQL 에서 "function ... is not unique" 로 실패했다 (PostgREST 도 같은 SQL 을 생성).
--   즉 1-인자 버전은 호출 불가능한 죽은 코드이면서, 본문은 parent_customer 연결·동의 기록 없이
--   org_parent_profiles 를 덮어쓰는 안전하지 않은 구버전 로직이었다.
--   제거하면 {p_token} 만 보내는 구버전 앱 호출도 (TEXT,JSONB) + 기본 공유 항목으로 해석되어
--   오히려 정상 동작한다. (TEXT,JSONB) 시그니처는 변경하지 않는다.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS core.redeem_guardian_link_token(TEXT);

-- -----------------------------------------------------------------------------
-- G. register_auth_provider — 클라이언트 email 불신 (시그니처 유지)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.register_auth_provider(
  p_provider core.auth_provider_type,
  p_provider_user_id TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_user_id UUID;
  v_id UUID;
  v_existing_user UUID;
  v_provider_user_id TEXT;
  v_auth_email TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_provider_user_id := trim(p_provider_user_id);
  IF v_provider_user_id IS NULL OR v_provider_user_id = '' THEN
    RAISE EXCEPTION 'provider_user_id is required';
  END IF;

  -- p_email 은 무시하고 서버가 아는 auth 이메일만 기록한다
  SELECT core.normalize_identity_email(u.email) INTO v_auth_email
  FROM auth.users u
  WHERE u.id = v_user_id;

  -- email identity 는 본인 auth 이메일만 (남의 이메일 identity 선점 방지)
  IF p_provider = 'email' THEN
    IF v_auth_email IS NULL OR lower(v_provider_user_id) <> v_auth_email THEN
      RAISE EXCEPTION 'email identity must match the account email';
    END IF;
    v_provider_user_id := v_auth_email;
  END IF;

  SELECT ap.user_id
  INTO v_existing_user
  FROM core.auth_providers ap
  WHERE ap.provider = p_provider
    AND ap.provider_user_id = v_provider_user_id;

  IF v_existing_user IS NOT NULL AND v_existing_user IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'auth_provider identity already linked to another user';
  END IF;

  INSERT INTO core.auth_providers (
    user_id, provider, provider_user_id, email, phone, metadata, verified_at
  )
  VALUES (
    v_user_id,
    p_provider,
    v_provider_user_id,
    v_auth_email,
    NULLIF(trim(p_phone), ''),
    COALESCE(p_metadata, '{}'::JSONB),
    now()
  )
  ON CONFLICT (provider, provider_user_id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, core.auth_providers.phone),
    metadata = core.auth_providers.metadata || EXCLUDED.metadata,
    verified_at = COALESCE(core.auth_providers.verified_at, EXCLUDED.verified_at),
    updated_at = now()
  WHERE core.auth_providers.user_id = EXCLUDED.user_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT ap.id INTO v_id
    FROM core.auth_providers ap
    WHERE ap.provider = p_provider
      AND ap.provider_user_id = v_provider_user_id
      AND ap.user_id = v_user_id;
  END IF;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'auth_provider identity already linked to another user';
  END IF;

  RETURN jsonb_build_object(
    'id', v_id,
    'provider', p_provider,
    'provider_user_id', v_provider_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.register_auth_provider(core.auth_provider_type, TEXT, TEXT, TEXT, JSONB) TO authenticated;
REVOKE EXECUTE ON FUNCTION core.register_auth_provider(core.auth_provider_type, TEXT, TEXT, TEXT, JSONB) FROM anon;

-- 레거시 pending 초대(토큰 없음)는 수락 불가. 관리자가 "재발급"하면 새 코드가 생긴다.
