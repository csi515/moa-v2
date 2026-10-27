CREATE OR REPLACE FUNCTION core.batch_expire_passes_and_invoices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  UPDATE core.passes
    SET status = 'EXPIRED', updated_at = now()
    WHERE status = 'ACTIVE' AND expires_at < now() AND deleted_at IS NULL;

  IF to_regclass('core.billing_invoices') IS NOT NULL THEN
    EXECUTE $sql$
      UPDATE core.billing_invoices
        SET status = 'OVERDUE', updated_at = now()
        WHERE status = 'UNPAID' AND due_date < current_date
    $sql$;
  END IF;

  IF to_regclass('core.bookings') IS NOT NULL THEN
    EXECUTE $sql$
      UPDATE core.bookings
        SET status = 'NO_SHOW', updated_at = now()
        WHERE status = 'CONFIRMED' AND end_time < now()
    $sql$;
  END IF;
END;
$$;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule(
    'moa-daily-lifecycle',
    '5 0 * * *',
    'SELECT core.batch_expire_passes_and_invoices()'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron unavailable: %', SQLERRM;
END $$;
