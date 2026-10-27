-- Fix search_path on security definer functions to prevent search_path-based attacks
-- References:
-- - https://supabase.com/docs/guides/database/postgres-security
-- - https://www.postgresql.org/docs/current/sql-createfunction.html

-- Public schema trigger function
ALTER FUNCTION public.set_updated_at() SET search_path TO 'public', 'pg_catalog';

-- Auth and identity functions
ALTER FUNCTION core.normalize_identity_email(text) SET search_path TO 'pg_catalog', 'public';

-- Enrollment status function
ALTER FUNCTION core.customer_status_to_enrollment(text) SET search_path TO 'core', 'pg_catalog', 'public';

-- Attendance action labels
ALTER FUNCTION core.attendance_action_labels(text, text) SET search_path TO 'pg_catalog', 'public';

-- Check-in PIN hashing function
ALTER FUNCTION core.hash_check_in_pin(uuid, uuid, text) SET search_path TO 'extensions', 'pg_catalog', 'public';
