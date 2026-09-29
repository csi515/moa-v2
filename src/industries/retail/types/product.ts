/**
 * Retail 상품 타입 — Core 공통 모델을 재사용.
 * UI 전용 필터만 모듈에 유지.
 */
export type {
  Product,
  ProductCategory,
  ProductListItem,
  ProductSaveInput,
  ProductVariant,
  ProductVariantSaveInput,
} from '@/capabilities/commerce';

export type ProductStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
