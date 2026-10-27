CREATE OR REPLACE FUNCTION core.bulk_import_customers(p_tenant_id uuid, p_records jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  item jsonb;
  idx int := 0;
  phone text;
  name text;
BEGIN
  IF NOT core.is_org_member(p_tenant_id) THEN
    RETURN jsonb_build_object('success', false, 'failed_row_index', 0, 'error_code', 'FORBIDDEN');
  END IF;

  IF jsonb_typeof(p_records) <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'failed_row_index', 0, 'error_code', 'INVALID_PAYLOAD');
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_records)
  LOOP
    name := btrim(COALESCE(item->>'name', ''));
    phone := regexp_replace(COALESCE(item->>'phone', ''), '[^0-9]', '', 'g');
    IF length(phone) = 10 AND left(phone, 2) = '10' THEN
      phone := '0' || phone;
    END IF;
    IF name = '' OR phone !~ '^010[0-9]{8}$' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = jsonb_build_object(
        'success', false, 'failed_row_index', idx, 'error_code', 'INVALID_PHONE'
      )::text;
    END IF;
    INSERT INTO core.customers (organization_id, name, phone, memo)
    VALUES (p_tenant_id, name, phone, NULLIF(item->>'memo', ''));
    idx := idx + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'imported', idx);
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%INVALID_PHONE%' THEN
    RETURN SQLERRM::jsonb;
  END IF;
  RETURN jsonb_build_object('success', false, 'failed_row_index', idx, 'error_code', 'INTEGRITY');
END;
$$;
