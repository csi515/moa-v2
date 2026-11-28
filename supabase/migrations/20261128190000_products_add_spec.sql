-- 상품 사양/규격 (nullable). 기존 행은 NULL.
ALTER TABLE core.products
  ADD COLUMN IF NOT EXISTS spec text NULL;

COMMENT ON COLUMN core.products.spec IS '상품 사양/규격 설명 (예: M6 x 20, 스테인리스)';
