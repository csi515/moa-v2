-- ==============================================================================
-- Migration: 20261018090000_jsonb_gin_indices_and_metadata_expansion.sql
-- Description: Moa-v2 전사 JSONB 심층 감사 결과 반영
--              1. 7대 핵심 테이블 metadata JSONB 컬럼 확장 (products, students 등)
--              2. 15대 핵심 테이블 JSONB GIN 인덱스 (jsonb_path_ops) 일괄 구축
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. 7대 핵심 테이블 metadata JSONB 컬럼 확장
-- ------------------------------------------------------------------------------

ALTER TABLE IF EXISTS core.products 
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS core.students 
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS core.consultations 
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS core.trial_leads 
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS core.learning_journals 
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS core.workplace_policies 
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS core.mbo_objectives 
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ------------------------------------------------------------------------------
-- 2. 15대 핵심 테이블 JSONB GIN 인덱스 (jsonb_path_ops) 일괄 구축
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_customers_metadata_gin 
  ON core.customers USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_bookable_resources_metadata_gin 
  ON core.bookable_resources USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_task_orders_details_gin 
  ON core.task_orders USING gin (details jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_organizations_settings_gin 
  ON core.organizations USING gin (settings jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_staff_metadata_gin 
  ON core.staff USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_schedules_metadata_gin 
  ON core.schedules USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_payments_metadata_gin 
  ON core.payments USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_expenses_metadata_gin 
  ON core.expenses USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_checklist_templates_metadata_gin 
  ON core.checklist_templates USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_checklist_items_metadata_gin 
  ON core.checklist_items USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_intake_submissions_answers_gin 
  ON core.intake_submissions USING gin (answers jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_intake_submissions_risk_flags_gin 
  ON core.intake_submissions USING gin (risk_flags jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_facility_incident_reports_metadata_gin 
  ON core.facility_incident_reports USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_approval_requests_content_gin 
  ON core.approval_requests USING gin (content jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_items_gin 
  ON core.purchase_requisitions USING gin (items jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_quality_inspection_records_samples_gin 
  ON core.quality_inspection_records USING gin (sample_values jsonb_path_ops);

-- ------------------------------------------------------------------------------
-- 3. 신규 확장된 7대 테이블 GIN 인덱스 추가 구축
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_products_metadata_gin 
  ON core.products USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_students_metadata_gin 
  ON core.students USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_consultations_metadata_gin 
  ON core.consultations USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_trial_leads_metadata_gin 
  ON core.trial_leads USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_learning_journals_metadata_gin 
  ON core.learning_journals USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_workplace_policies_metadata_gin 
  ON core.workplace_policies USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_mbo_objectives_metadata_gin 
  ON core.mbo_objectives USING gin (metadata jsonb_path_ops);
