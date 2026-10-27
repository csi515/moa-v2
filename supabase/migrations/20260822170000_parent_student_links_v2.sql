-- Parent ↔ Student M:N links: guardian relationship enum + RLS + legacy migration
-- Idempotent: works when table is missing (partial Moa deploy) or already on v1 TEXT schema

DO $$ BEGIN
  CREATE TYPE core.guardian_relationship AS ENUM ('father', 'mother', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS core.parent_student_links (
  organization_id       UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  parent_customer_id    UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  student_customer_id   UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  relationship          core.guardian_relationship NOT NULL DEFAULT 'other',
  is_primary            BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_customer_id, student_customer_id)
);

-- Upgrade v1 TEXT relationship column → enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns c
    JOIN pg_type t ON t.typname = c.udt_name
    WHERE c.table_schema = 'core'
      AND c.table_name = 'parent_student_links'
      AND c.column_name = 'relationship'
      AND t.typname = 'text'
  ) THEN
    UPDATE core.parent_student_links
    SET relationship = 'other'
    WHERE relationship IS NULL OR relationship NOT IN ('father', 'mother', 'other');

    ALTER TABLE core.parent_student_links
      ALTER COLUMN relationship TYPE core.guardian_relationship
      USING (
        CASE relationship
          WHEN 'father' THEN 'father'::core.guardian_relationship
          WHEN 'mother' THEN 'mother'::core.guardian_relationship
          ELSE 'other'::core.guardian_relationship
        END
      );
  END IF;
END $$;

ALTER TABLE core.parent_student_links
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE core.parent_student_links
  ALTER COLUMN relationship SET DEFAULT 'other';

CREATE INDEX IF NOT EXISTS idx_parent_student_links_student
  ON core.parent_student_links(student_customer_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_parent_student_links_org_pair
  ON core.parent_student_links (organization_id, parent_customer_id, student_customer_id);

-- =============================================
-- RLS helpers (may be missing on partial deploy)
-- =============================================
CREATE OR REPLACE FUNCTION core.get_my_parent_customer_id(org_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT parent_customer_id
  FROM core.organization_members
  WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND role = 'parent'
    AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION core.is_org_parent(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT core.get_org_role(org_id) = 'parent';
$$;

CREATE OR REPLACE FUNCTION core.parent_owns_student(org_id UUID, student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM core.parent_student_links psl
    WHERE psl.organization_id = org_id
      AND psl.parent_customer_id = core.get_my_parent_customer_id(org_id)
      AND psl.student_customer_id = student_id
  );
$$;

GRANT EXECUTE ON FUNCTION core.get_my_parent_customer_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.is_org_parent(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.parent_owns_student(UUID, UUID) TO authenticated;

ALTER TABLE core.parent_student_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parent_student_links_select ON core.parent_student_links;
DROP POLICY IF EXISTS parent_student_links_admin ON core.parent_student_links;
DROP POLICY IF EXISTS parent_student_links_parent_select ON core.parent_student_links;

CREATE POLICY parent_student_links_select ON core.parent_student_links
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

CREATE POLICY parent_student_links_admin ON core.parent_student_links
  FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY parent_student_links_parent_select ON core.parent_student_links
  FOR SELECT TO authenticated
  USING (
    parent_customer_id = core.get_my_parent_customer_id(organization_id)
    OR core.is_org_admin(organization_id)
    OR core.is_org_member(organization_id)
  );

-- =============================================
-- Migrate embedded student→parent refs into links
-- =============================================
INSERT INTO core.parent_student_links (
  organization_id,
  parent_customer_id,
  student_customer_id,
  relationship,
  is_primary,
  created_at
)
SELECT
  s.organization_id,
  (s.metadata->>'parentId')::UUID,
  s.id,
  'other'::core.guardian_relationship,
  true,
  now()
FROM core.customers s
JOIN core.customers p ON p.id = (s.metadata->>'parentId')::UUID
  AND p.organization_id = s.organization_id
WHERE (s.metadata->>'entityType' IS NULL OR s.metadata->>'entityType' <> 'parent')
  AND s.metadata->>'parentId' IS NOT NULL
  AND (s.metadata->>'parentId') ~ '^[0-9a-f-]{36}$'
ON CONFLICT (parent_customer_id, student_customer_id) DO NOTHING;

-- Phone-based fallback: match parent entity by phone on student metadata
INSERT INTO core.parent_student_links (
  organization_id,
  parent_customer_id,
  student_customer_id,
  relationship,
  is_primary,
  created_at
)
SELECT
  s.organization_id,
  p.id,
  s.id,
  'other'::core.guardian_relationship,
  true,
  now()
FROM core.customers s
JOIN core.customers p
  ON p.organization_id = s.organization_id
  AND p.phone IS NOT NULL
  AND p.phone = COALESCE(s.metadata->>'parentPhone', s.phone)
  AND (p.metadata->>'entityType') = 'parent'
WHERE (s.metadata->>'entityType' IS NULL OR s.metadata->>'entityType' <> 'parent')
  AND NOT EXISTS (
    SELECT 1 FROM core.parent_student_links psl
    WHERE psl.student_customer_id = s.id
      AND psl.organization_id = s.organization_id
  )
ON CONFLICT (parent_customer_id, student_customer_id) DO NOTHING;
