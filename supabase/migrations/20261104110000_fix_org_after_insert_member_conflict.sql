-- Multi-role 멤버십 유니크 키 (organization_id, user_id, role) 와 트리거 ON CONFLICT 정합성
BEGIN;

CREATE OR REPLACE FUNCTION core.handle_organization_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO core.organization_members (organization_id, user_id, role)
    VALUES (NEW.id, auth.uid(), 'owner')
    ON CONFLICT (organization_id, user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
