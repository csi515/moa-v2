DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'publication skipped';
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE core.attendance_sessions;
EXCEPTION WHEN duplicate_object OR undefined_table THEN
  NULL;
END $$;

DO $$
BEGIN
  IF to_regclass('core.bookings') IS NOT NULL THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE core.bookings;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  IF to_regclass('core.customer_notifications') IS NOT NULL THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE core.customer_notifications;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
