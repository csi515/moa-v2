-- 활성 행만 유니크. 테넌트 키는 organization_id.

ALTER TABLE core.customers ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE core.organization_members ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE core.passes ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE core.customers DROP CONSTRAINT IF EXISTS customers_tenant_phone_key;
ALTER TABLE core.customers DROP CONSTRAINT IF EXISTS customers_organization_phone_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_tenant_phone_active
  ON core.customers (organization_id, phone)
  WHERE deleted_at IS NULL AND phone IS NOT NULL;

ALTER TABLE core.organization_members DROP CONSTRAINT IF EXISTS organization_members_tenant_user_key;
DROP INDEX IF EXISTS core.organization_members_organization_id_user_id_key;

-- 다중 역할(owner+customer 등)을 허용하므로 user 단독이 아니라 role까지 포함
CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_members_tenant_user_active
  ON core.organization_members (organization_id, user_id, role)
  WHERE deleted_at IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'core' AND table_name = 'organization_members' AND column_name = 'email'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_members_tenant_email_active
      ON core.organization_members (organization_id, email)
      WHERE deleted_at IS NULL AND email IS NOT NULL';
  END IF;
END $$;

DROP POLICY IF EXISTS customers_hide_deleted ON core.customers;
CREATE POLICY customers_hide_deleted ON core.customers
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at IS NULL);

DROP POLICY IF EXISTS passes_hide_deleted ON core.passes;
CREATE POLICY passes_hide_deleted ON core.passes
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at IS NULL);

CREATE OR REPLACE FUNCTION core.soft_delete_record(p_table_name text, p_record_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  IF p_table_name NOT IN ('customers', 'organization_members', 'passes') THEN
    RAISE EXCEPTION 'table not allowed';
  END IF;
  EXECUTE format('UPDATE core.%I SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL', p_table_name)
    USING p_record_id;
END;
$$;
