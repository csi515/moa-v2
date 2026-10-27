CREATE OR REPLACE FUNCTION core.extract_korean_chosung(p_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  chars text[] := ARRAY['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  result text := '';
  i int;
  code int;
BEGIN
  IF p_text IS NULL THEN
    RETURN '';
  END IF;
  FOR i IN 1..char_length(p_text) LOOP
    code := ascii(substr(p_text, i, 1));
    IF code BETWEEN 44032 AND 55203 THEN
      result := result || chars[1 + ((code - 44032) / 588)];
    END IF;
  END LOOP;
  RETURN left(result, 64);
END;
$$;

ALTER TABLE core.customers ADD COLUMN IF NOT EXISTS chosung varchar(64);

CREATE OR REPLACE FUNCTION core.customers_set_chosung()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.chosung := core.extract_korean_chosung(NEW.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customers_chosung ON core.customers;
CREATE TRIGGER customers_chosung
  BEFORE INSERT OR UPDATE OF name ON core.customers
  FOR EACH ROW EXECUTE FUNCTION core.customers_set_chosung();

CREATE INDEX IF NOT EXISTS idx_customers_tenant_chosung
  ON core.customers (organization_id, chosung);
