-- ==============================================================================
-- Migration: 20261018091000_generic_entity_records.sql
-- Description: Zero-Migration Generic Entity Records for Long-tail Capabilities
--              (recipe_bom, digital_contract, table_order_kds 등 18개 모듈의 클라우드 DB 영속화)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS core.generic_entity_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  reference_id UUID,
  record_key TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ------------------------------------------------------------------------------
-- 인덱스 구축 (B-Tree 복합 인덱스 & JSONB GIN 색인)
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_generic_entity_org_type 
  ON core.generic_entity_records (organization_id, entity_type);

CREATE INDEX IF NOT EXISTS idx_generic_entity_org_type_key 
  ON core.generic_entity_records (organization_id, entity_type, record_key);

CREATE INDEX IF NOT EXISTS idx_generic_entity_payload_gin 
  ON core.generic_entity_records USING gin (payload jsonb_path_ops);

-- ------------------------------------------------------------------------------
-- RLS 보안 정책 (테넌트 데이터 완벽 격리)
-- ------------------------------------------------------------------------------

ALTER TABLE core.generic_entity_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view generic entity records" ON core.generic_entity_records;
CREATE POLICY "Members can view generic entity records"
  ON core.generic_entity_records
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT m.organization_id 
      FROM core.organization_members m 
      WHERE m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can insert generic entity records" ON core.generic_entity_records;
CREATE POLICY "Members can insert generic entity records"
  ON core.generic_entity_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT m.organization_id 
      FROM core.organization_members m 
      WHERE m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update generic entity records" ON core.generic_entity_records;
CREATE POLICY "Members can update generic entity records"
  ON core.generic_entity_records
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT m.organization_id 
      FROM core.organization_members m 
      WHERE m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT m.organization_id 
      FROM core.organization_members m 
      WHERE m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can delete generic entity records" ON core.generic_entity_records;
CREATE POLICY "Members can delete generic entity records"
  ON core.generic_entity_records
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT m.organization_id 
      FROM core.organization_members m 
      WHERE m.user_id = auth.uid()
    )
  );
