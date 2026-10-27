-- session_passes.organization_id 와 customer_id 의 조직 일치를 DB에서 강제.
-- RLS와 별개. INSERT/UPDATE 모두 교차 연결 불가.
-- 기존 customer_id NOT NULL · update_booking_status_with_pass 는 유지.

BEGIN;

-- 기존 mismatch 가 있으면 제약 추가를 거부 (부분 적용 금지)
DO $$
DECLARE
  v_mismatch INTEGER;
BEGIN
  SELECT count(*)
    INTO v_mismatch
  FROM core.session_passes sp
  JOIN core.customers c ON c.id = sp.customer_id
  WHERE c.organization_id IS DISTINCT FROM sp.organization_id;

  IF v_mismatch > 0 THEN
    RAISE EXCEPTION
      'core.session_passes has % rows whose organization_id does not match customers.organization_id. Fix data before applying session_passes_customer_org_fkey.',
      v_mismatch;
  END IF;
END $$;

-- composite FK 대상: customers(id) PK 위에 (id, organization_id) 유일
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customers_id_organization_id_key'
      AND conrelid = 'core.customers'::regclass
  ) THEN
    ALTER TABLE core.customers
      ADD CONSTRAINT customers_id_organization_id_key
      UNIQUE (id, organization_id);
  END IF;
END $$;

-- 이용권 org + customer 가 동일 고객 행을 가리키게 함
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'session_passes_customer_org_fkey'
      AND conrelid = 'core.session_passes'::regclass
  ) THEN
    ALTER TABLE core.session_passes
      ADD CONSTRAINT session_passes_customer_org_fkey
      FOREIGN KEY (customer_id, organization_id)
      REFERENCES core.customers (id, organization_id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 현재 계약 재확인: customer_id NULL 불가
ALTER TABLE core.session_passes
  ALTER COLUMN customer_id SET NOT NULL;

COMMENT ON CONSTRAINT customers_id_organization_id_key ON core.customers IS
  'session_passes 복합 FK 대상. (id, organization_id) 유일.';

COMMENT ON CONSTRAINT session_passes_customer_org_fkey ON core.session_passes IS
  '이용권 organization_id와 customer_id는 동일 조직이어야 함. INSERT/UPDATE 모두 강제.';

COMMIT;
