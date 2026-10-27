-- 통근 셔틀 노선별 담당 기사 연락처 (전직원 SELECT 가능, 쓰기는 shuttle:manage)

BEGIN;

ALTER TABLE core.shuttle_routes
  ADD COLUMN IF NOT EXISTS driver_name TEXT,
  ADD COLUMN IF NOT EXISTS driver_phone TEXT;

COMMENT ON COLUMN core.shuttle_routes.driver_name IS '담당 기사 표시명';
COMMENT ON COLUMN core.shuttle_routes.driver_phone IS '담당 기사 연락처(표시·tel 링크용)';

COMMIT;
