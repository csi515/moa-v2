-- 문법 검사기 self-test: 반드시 실패해야 한다 (문자열 매칭으로는 안 잡힘)
CREATE OR REPLACE FUNCTION core.probe_migration_syntax_bad()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_x TEXT;
BEGIN
  v_x := NULLIF(trim(COALESCE('a', '')), ''));
END;
$$;
