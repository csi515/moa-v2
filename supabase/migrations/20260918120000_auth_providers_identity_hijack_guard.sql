-- P0: auth_providers identity 탈취 가드
-- register_auth_provider / sync_auth_providers_for_user 가 타 user_id로
-- (provider, provider_user_id) 행을 덮어쓰지 못하도록 막는다.

CREATE OR REPLACE FUNCTION core.sync_auth_providers_for_user(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_profile RECORD;
  v_auth_email TEXT;
  v_count INT := 0;
  v_email TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  -- authenticated 세션이 다른 사용자 id로 호출하는 것 차단
  -- (trigger/service role 등 auth.uid() NULL 인 경우는 허용)
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'sync_auth_providers_for_user: caller may only sync own user';
  END IF;

  SELECT * INTO v_profile FROM core.profiles WHERE id = p_user_id;
  SELECT email INTO v_auth_email FROM auth.users WHERE id = p_user_id;

  v_email := COALESCE(
    core.normalize_identity_email(v_profile.email),
    core.normalize_identity_email(v_auth_email)
  );

  IF v_email IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO core.auth_providers (user_id, provider, provider_user_id, email, verified_at)
  VALUES (
    p_user_id,
    'email',
    v_email,
    v_email,
    now()
  )
  ON CONFLICT (provider, provider_user_id) DO UPDATE SET
    email = EXCLUDED.email,
    verified_at = COALESCE(core.auth_providers.verified_at, EXCLUDED.verified_at),
    updated_at = now()
  WHERE core.auth_providers.user_id = EXCLUDED.user_id;

  -- 타 사용자 소유 identity면 INSERT/UPDATE 모두 스킵 (탈취 금지)
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_provider_user_id := trim(p_provider_user_id);
  IF v_provider_user_id IS NULL OR v_provider_user_id = '' THEN
    RAISE EXCEPTION 'provider_user_id is required';
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
    core.normalize_identity_email(p_email),
    NULLIF(trim(p_phone), ''),
    COALESCE(p_metadata, '{}'::JSONB),
    now()
  )
  ON CONFLICT (provider, provider_user_id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, core.auth_providers.email),
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

GRANT EXECUTE ON FUNCTION core.sync_auth_providers_for_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.register_auth_provider(
  core.auth_provider_type, TEXT, TEXT, TEXT, JSONB
) TO authenticated;
