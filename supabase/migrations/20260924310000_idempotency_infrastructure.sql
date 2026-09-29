-- 공통 Idempotency. organization_id + key 가 tenant 경계.
-- 기존 atomic RPC 본문을 교체하지 않는다. 파일럿은 wrapper.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE core.idempotency_keys (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  key              TEXT NOT NULL,
  operation        TEXT NOT NULL,
  actor_user_id    UUID,
  request_hash     TEXT NOT NULL,
  status           TEXT NOT NULL,
  response_payload JSONB,
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  CONSTRAINT idempotency_keys_key_check
    CHECK (length(btrim(key)) > 0 AND length(key) <= 200),
  CONSTRAINT idempotency_keys_hash_check CHECK (length(btrim(request_hash)) > 0),
  CONSTRAINT idempotency_keys_status_check
    CHECK (status IN ('processing', 'succeeded', 'failed')),
  CONSTRAINT idempotency_keys_operation_check CHECK (
    operation IN (
      'payment', 'refund', 'booking', 'reservation',
      'pass_consume', 'pass_refund', 'check_in', 'check_out',
      'sale', 'inventory_movement'
    )
  ),
  CONSTRAINT uq_idempotency_keys_org_key UNIQUE (organization_id, key)
);

COMMENT ON TABLE core.idempotency_keys IS
  '중요 command 재시도 가드. 같은 org+key 는 한 번만 성공 반영. payload hash 불일치 시 오류.';

CREATE INDEX idx_idempotency_keys_org_created
  ON core.idempotency_keys (organization_id, created_at DESC);

ALTER TABLE core.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY idempotency_keys_staff_select ON core.idempotency_keys
  FOR SELECT TO authenticated
  USING (core.is_org_staff_actor(organization_id));

GRANT SELECT ON core.idempotency_keys TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON core.idempotency_keys FROM authenticated, anon;

CREATE OR REPLACE FUNCTION core.idempotency_advisory_lock(
  p_organization_id UUID,
  p_key TEXT
)
RETURNS VOID
LANGUAGE sql
AS $$
  SELECT pg_advisory_xact_lock(
    hashtext('core.idempotency_keys'),
    hashtext(p_organization_id::text || ':' || p_key)
  );
$$;

CREATE OR REPLACE FUNCTION core.idempotency_request_hash(p_canonical TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(digest(convert_to(p_canonical, 'utf8'), 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION core.begin_idempotency(
  p_organization_id UUID,
  p_key TEXT,
  p_operation TEXT,
  p_request_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_row core.idempotency_keys%ROWTYPE;
  v_key TEXT;
BEGIN
  v_key := NULLIF(btrim(COALESCE(p_key, '')), '');
  IF p_organization_id IS NULL OR v_key IS NULL OR p_operation IS NULL OR p_request_hash IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;

  PERFORM core.idempotency_advisory_lock(p_organization_id, v_key);

  SELECT * INTO v_row
  FROM core.idempotency_keys
  WHERE organization_id = p_organization_id AND key = v_key
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO core.idempotency_keys (
      organization_id, key, operation, actor_user_id, request_hash, status
    ) VALUES (
      p_organization_id, v_key, p_operation, auth.uid(), p_request_hash, 'processing'
    );
    RETURN jsonb_build_object('outcome', 'execute');
  END IF;

  IF v_row.operation IS DISTINCT FROM p_operation
     OR v_row.request_hash IS DISTINCT FROM p_request_hash THEN
    RAISE EXCEPTION 'Idempotency payload mismatch';
  END IF;

  IF v_row.status = 'succeeded' THEN
    RETURN jsonb_build_object('outcome', 'replay', 'response', v_row.response_payload);
  END IF;

  IF v_row.status = 'failed' OR v_row.expires_at <= now() THEN
    UPDATE core.idempotency_keys
    SET status = 'processing',
        actor_user_id = auth.uid(),
        response_payload = NULL,
        error_message = NULL,
        created_at = now(),
        expires_at = now() + interval '24 hours'
    WHERE id = v_row.id;
    RETURN jsonb_build_object('outcome', 'execute');
  END IF;

  RAISE EXCEPTION 'Idempotency request in progress';
END;
$$;

CREATE OR REPLACE FUNCTION core.complete_idempotency(
  p_organization_id UUID,
  p_key TEXT,
  p_response JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  UPDATE core.idempotency_keys
  SET status = 'succeeded',
      response_payload = p_response,
      error_message = NULL
  WHERE organization_id = p_organization_id
    AND key = btrim(p_key)
    AND status = 'processing';
END;
$$;

CREATE OR REPLACE FUNCTION core.fail_idempotency(
  p_organization_id UUID,
  p_key TEXT,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  UPDATE core.idempotency_keys
  SET status = 'failed',
      error_message = NULLIF(btrim(COALESCE(p_error, '')), '')
  WHERE organization_id = p_organization_id
    AND key = btrim(p_key)
    AND status = 'processing';
END;
$$;

-- 파일럿: 예약+이용권. 기존 update_booking_status_with_pass 를 호출만 한다.
CREATE OR REPLACE FUNCTION core.update_booking_status_with_pass_idempotent(
  p_organization_id UUID,
  p_booking_id UUID,
  p_new_status core.schedule_status,
  p_consume_on_no_show BOOLEAN DEFAULT false,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_key TEXT;
  v_hash TEXT;
  v_begin JSONB;
  v_result JSONB;
BEGIN
  v_key := NULLIF(btrim(COALESCE(p_idempotency_key, '')), '');
  IF v_key IS NULL THEN
    RETURN core.update_booking_status_with_pass(
      p_organization_id, p_booking_id, p_new_status, p_consume_on_no_show
    );
  END IF;

  v_hash := core.idempotency_request_hash(
    p_organization_id::text || ':' || p_booking_id::text || ':' ||
    p_new_status::text || ':' || COALESCE(p_consume_on_no_show, false)::text
  );
  v_begin := core.begin_idempotency(p_organization_id, v_key, 'booking', v_hash);
  IF v_begin->>'outcome' = 'replay' THEN
    RETURN v_begin->'response';
  END IF;

  v_result := core.update_booking_status_with_pass(
    p_organization_id, p_booking_id, p_new_status, p_consume_on_no_show
  );
  PERFORM core.complete_idempotency(p_organization_id, v_key, v_result);
  RETURN v_result;
END;
$$;

-- 수강료 수납 mutation 입력 전체. 같은 입력은 항상 같은 문자열.
CREATE OR REPLACE FUNCTION core.tuition_payment_idempotency_canonical(
  p_organization_id UUID,
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_payment_method core.payment_method,
  p_paid_at DATE,
  p_memo TEXT,
  p_cash_receipt_issued BOOLEAN
)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT
    p_organization_id::text || ':' ||
    p_invoice_id::text || ':' ||
    trim(both from to_char(COALESCE(p_amount, 0), 'FM999999999999990.00')) || ':' ||
    p_payment_method::text || ':' ||
    to_char(COALESCE(p_paid_at, CURRENT_DATE), 'YYYY-MM-DD') || ':' ||
    CASE WHEN p_memo IS NULL THEN 'n' ELSE 's:' || p_memo END || ':' ||
    CASE WHEN COALESCE(p_cash_receipt_issued, false) THEN 'true' ELSE 'false' END;
$$;

-- 파일럿: 수강료 수납. 기존 record_tuition_payment 를 호출만 한다.
CREATE OR REPLACE FUNCTION core.record_tuition_payment_idempotent(
  p_organization_id UUID,
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_payment_method core.payment_method,
  p_paid_at DATE DEFAULT CURRENT_DATE,
  p_memo TEXT DEFAULT NULL,
  p_cash_receipt_issued BOOLEAN DEFAULT false,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_key TEXT;
  v_hash TEXT;
  v_begin JSONB;
  v_result JSONB;
BEGIN
  v_key := NULLIF(btrim(COALESCE(p_idempotency_key, '')), '');
  IF v_key IS NULL THEN
    RETURN core.record_tuition_payment(
      p_organization_id, p_invoice_id, p_amount, p_payment_method,
      p_paid_at, p_memo, p_cash_receipt_issued, p_idempotency_key
    );
  END IF;

  v_hash := core.idempotency_request_hash(
    core.tuition_payment_idempotency_canonical(
      p_organization_id,
      p_invoice_id,
      p_amount,
      p_payment_method,
      p_paid_at,
      p_memo,
      p_cash_receipt_issued
    )
  );
  v_begin := core.begin_idempotency(p_organization_id, v_key, 'payment', v_hash);
  IF v_begin->>'outcome' = 'replay' THEN
    RETURN v_begin->'response';
  END IF;

  v_result := core.record_tuition_payment(
    p_organization_id, p_invoice_id, p_amount, p_payment_method,
    p_paid_at, p_memo, p_cash_receipt_issued, p_idempotency_key
  );
  PERFORM core.complete_idempotency(p_organization_id, v_key, v_result);
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION core.begin_idempotency(UUID, TEXT, TEXT, TEXT) IS
  '동일 트랜잭션 advisory lock + FOR UPDATE. replay / execute. payload 불일치는 예외.';
COMMENT ON FUNCTION core.update_booking_status_with_pass_idempotent(UUID, UUID, core.schedule_status, BOOLEAN, TEXT) IS
  '파일럿. 기존 update_booking_status_with_pass 호출. key 없으면 기존과 동일.';
COMMENT ON FUNCTION core.tuition_payment_idempotency_canonical(UUID, UUID, NUMERIC, core.payment_method, DATE, TEXT, BOOLEAN) IS
  '수강료 수납 request hash 입력. org/invoice/amount/method/paid_at/memo/cash_receipt 포함.';
COMMENT ON FUNCTION core.record_tuition_payment_idempotent(UUID, UUID, NUMERIC, core.payment_method, DATE, TEXT, BOOLEAN, TEXT) IS
  '파일럿. 기존 record_tuition_payment 호출. 같은 key+다른 payload 는 mismatch.';

GRANT EXECUTE ON FUNCTION core.update_booking_status_with_pass_idempotent(UUID, UUID, core.schedule_status, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.record_tuition_payment_idempotent(UUID, UUID, NUMERIC, core.payment_method, DATE, TEXT, BOOLEAN, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION core.update_booking_status_with_pass_idempotent(UUID, UUID, core.schedule_status, BOOLEAN, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION core.record_tuition_payment_idempotent(UUID, UUID, NUMERIC, core.payment_method, DATE, TEXT, BOOLEAN, TEXT) FROM anon;
REVOKE ALL ON FUNCTION core.tuition_payment_idempotency_canonical(UUID, UUID, NUMERIC, core.payment_method, DATE, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION core.begin_idempotency(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION core.complete_idempotency(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION core.fail_idempotency(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION core.idempotency_advisory_lock(UUID, TEXT) FROM PUBLIC, anon, authenticated;

COMMIT;
