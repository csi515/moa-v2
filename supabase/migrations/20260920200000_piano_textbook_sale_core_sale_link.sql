-- Piano TextbookSale ↔ Core Sale 연결 컬럼
-- 기존 행은 NULL 유지(legacy read fallback). 신규 삭제·강제 이관 없음.

BEGIN;

ALTER TABLE piano.textbook_sales
  ADD COLUMN IF NOT EXISTS core_sale_id UUID REFERENCES core.sales(id) ON DELETE SET NULL;

COMMENT ON COLUMN piano.textbook_sales.core_sale_id IS
  'Core sales.id 연결. NULL = Core Sale 이전 legacy TextbookSale. 납부상태(status)와 Core sale.status는 별개.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_piano_textbook_sales_core_sale_id
  ON piano.textbook_sales (core_sale_id)
  WHERE core_sale_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_piano_textbook_sales_org_core_sale
  ON piano.textbook_sales (organization_id, core_sale_id)
  WHERE core_sale_id IS NOT NULL;

COMMIT;
