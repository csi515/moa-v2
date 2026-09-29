-- 문법 검사기 self-test: 통과해야 한다
CREATE OR REPLACE FUNCTION core.probe_migration_syntax_ok()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_x TEXT;
BEGIN
  v_x := NULLIF(trim(COALESCE('a', '')), '');
END;
$$;
