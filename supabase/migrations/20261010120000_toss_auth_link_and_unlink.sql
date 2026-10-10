-- =============================================================================
-- Moa v2: Apps in Toss Account Linking & Unlink Atomic RPCs
-- =============================================================================

BEGIN;

-- 1. Atomic RPC: link_toss_customer_by_phone
-- 동일 전화번호를 가진 기존 고객 장부(customers) 레코드를 찾아
-- customer_id를 유지하면서 auth_user_id 및 toss_user_key를 원자적으로 연결합니다.
CREATE OR REPLACE FUNCTION core.link_toss_customer_by_phone(
  p_user_id UUID,
  p_toss_user_key TEXT,
  p_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_norm_phone TEXT;
  v_cust_rec RECORD;
  v_is_staff BOOLEAN := false;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  v_norm_phone := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');

  IF v_norm_phone <> '' THEN
    SELECT * INTO v_cust_rec
    FROM core.customers
    WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = v_norm_phone
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      UPDATE core.customers
      SET auth_user_id = p_user_id,
          user_id = COALESCE(user_id, p_user_id),
          metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{toss_user_key}',
            to_jsonb(p_toss_user_key)
          ),
          updated_at = now()
      WHERE id = v_cust_rec.id;
    END IF;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM core.organization_members
    WHERE user_id = p_user_id
  ) INTO v_is_staff;

  RETURN jsonb_build_object(
    'success', true,
    'linked_customer_id', v_cust_rec.id,
    'organization_id', v_cust_rec.organization_id,
    'is_staff', v_is_staff
  );
END;
$$;

-- 2. Atomic RPC: handle_toss_unlink
-- 토스 앱 내에서 '연결 끊기' 시 매장 장부의 고객/결제 데이터는 영구 보존하며
-- 토스 연동 메타데이터에 연결 해제 상태를 기록합니다.
CREATE OR REPLACE FUNCTION core.handle_toss_unlink(
  p_toss_user_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_updated_count INT := 0;
BEGIN
  IF p_toss_user_key IS NULL OR p_toss_user_key = '' THEN
    RAISE EXCEPTION 'p_toss_user_key is required';
  END IF;

  UPDATE core.customers
  SET metadata = (
        COALESCE(metadata, '{}'::jsonb) - 'toss_user_key'
      ) || jsonb_build_object(
        'toss_unlinked', true,
        'unlinked_at', now()
      ),
      updated_at = now()
  WHERE metadata->>'toss_user_key' = p_toss_user_key;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'updated_customers_count', v_updated_count
  );
END;
$$;

COMMIT;
