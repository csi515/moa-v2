-- Fill merged_into_id when the existing transfer RPC marks a customer as merged.

BEGIN;

CREATE OR REPLACE FUNCTION core.sync_customer_merged_into_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.metadata ? 'merged_into' AND (NEW.metadata->>'merged_into') ~* '^[0-9a-f-]{36}$' THEN
    NEW.merged_into_id := (NEW.metadata->>'merged_into')::uuid;
    IF NEW.deleted_at IS NULL THEN
      NEW.deleted_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_customer_merged_into_id ON core.customers;
CREATE TRIGGER trg_sync_customer_merged_into_id
  BEFORE UPDATE ON core.customers
  FOR EACH ROW
  EXECUTE FUNCTION core.sync_customer_merged_into_id();

COMMIT;
