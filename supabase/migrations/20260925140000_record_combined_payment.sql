-- 통합 수납 command. 기존 record_tuition_payment / record_textbook_payment 를
-- 한 plpgsql 트랜잭션에서 호출한다. 수납 금액 계산은 기존 함수에만 둔다.

CREATE OR REPLACE FUNCTION core.record_combined_payment(
  p_organization_id UUID,
  p_tuition_items JSONB,
  p_textbook_items JSONB,
  p_payment_method core.payment_method,
  p_paid_at DATE DEFAULT CURRENT_DATE,
  p_memo TEXT DEFAULT NULL,
  p_cash_receipt_issued BOOLEAN DEFAULT false,
  p_command_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, piano, public
AS $$
DECLARE
  v_key TEXT;
  v_hash TEXT;
  v_begin JSONB;
  v_item JSONB;
  v_one JSONB;
  v_tuition JSONB := '[]'::jsonb;
  v_textbooks JSONB := '[]'::jsonb;
  v_sale_id UUID;
  v_sale_meta JSONB;
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_organization_id IS NULL OR p_payment_method IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  IF jsonb_typeof(COALESCE(p_tuition_items, '[]'::jsonb)) IS DISTINCT FROM 'array'
     OR jsonb_typeof(COALESCE(p_textbook_items, '[]'::jsonb)) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid combined payment items';
  END IF;
  IF jsonb_array_length(COALESCE(p_tuition_items, '[]'::jsonb)) = 0
     AND jsonb_array_length(COALESCE(p_textbook_items, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'No combined payment items';
  END IF;

  v_key := NULLIF(btrim(COALESCE(p_command_key, '')), '');
  IF v_key IS NOT NULL THEN
    v_hash := core.idempotency_request_hash(
      p_organization_id::text || ':' ||
      COALESCE(p_tuition_items, '[]'::jsonb)::text || ':' ||
      COALESCE(p_textbook_items, '[]'::jsonb)::text || ':' ||
      p_payment_method::text || ':' ||
      to_char(COALESCE(p_paid_at, CURRENT_DATE), 'YYYY-MM-DD') || ':' ||
      CASE WHEN p_memo IS NULL THEN 'n' ELSE 's:' || p_memo END || ':' ||
      CASE WHEN COALESCE(p_cash_receipt_issued, false) THEN 'true' ELSE 'false' END
    );
    v_begin := core.begin_idempotency(p_organization_id, v_key, 'payment', v_hash);
    IF v_begin->>'outcome' = 'replay' THEN
      RETURN v_begin->'response';
    END IF;
  END IF;

  FOR v_item IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_tuition_items, '[]'::jsonb)) AS t(value)
  LOOP
    IF NULLIF(btrim(COALESCE(v_item->>'invoice_id', '')), '') IS NULL THEN
      RAISE EXCEPTION 'Invalid tuition item';
    END IF;
    v_one := core.record_tuition_payment(
      p_organization_id,
      (v_item->>'invoice_id')::uuid,
      COALESCE((v_item->>'amount')::numeric, 0),
      p_payment_method,
      p_paid_at,
      p_memo,
      COALESCE(p_cash_receipt_issued, false),
      NULLIF(btrim(COALESCE(v_item->>'idempotency_key', '')), '')
    );
    v_tuition := v_tuition || jsonb_build_array(v_one);
  END LOOP;

  FOR v_item IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_textbook_items, '[]'::jsonb)) AS t(value)
  LOOP
    IF NULLIF(btrim(COALESCE(v_item->>'sale_id', '')), '') IS NULL THEN
      RAISE EXCEPTION 'Invalid textbook item';
    END IF;
    v_sale_id := (v_item->>'sale_id')::uuid;
    SELECT s.metadata INTO v_sale_meta
    FROM piano.textbook_sales s
    WHERE s.id = v_sale_id;

    IF COALESCE(v_sale_meta->>'billingInvoiceId', '') <> '' THEN
      v_textbooks := v_textbooks || jsonb_build_array(
        jsonb_build_object('action', 'skipped_linked', 'sale_id', v_sale_id)
      );
      CONTINUE;
    END IF;

    v_one := core.record_textbook_payment(
      p_organization_id,
      v_sale_id,
      COALESCE((v_item->>'amount')::numeric, 0),
      p_payment_method,
      p_paid_at,
      p_memo,
      NULLIF(btrim(COALESCE(v_item->>'idempotency_key', '')), ''),
      NULLIF(v_item->>'student_name', ''),
      NULLIF(v_item->>'textbook_title', '')
    );
    v_textbooks := v_textbooks || jsonb_build_array(v_one);
  END LOOP;

  v_result := jsonb_build_object(
    'action', 'paid',
    'tuition', v_tuition,
    'textbooks', v_textbooks
  );

  IF v_key IS NOT NULL THEN
    PERFORM core.complete_idempotency(p_organization_id, v_key, v_result);
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION core.record_combined_payment(UUID, JSONB, JSONB, core.payment_method, DATE, TEXT, BOOLEAN, TEXT) IS
  '통합 수납 command. 기존 record_tuition_payment / record_textbook_payment 를 한 트랜잭션에서 호출. 중간 실패 시 전부 롤백.';

REVOKE ALL ON FUNCTION core.record_combined_payment(UUID, JSONB, JSONB, core.payment_method, DATE, TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.record_combined_payment(UUID, JSONB, JSONB, core.payment_method, DATE, TEXT, BOOLEAN, TEXT) TO authenticated;
