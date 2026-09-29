/**
 * Retail 반품 타입 — Core 공통 모델을 재사용.
 */
export type {
  SaleItemReturnable,
  SaleReturn,
  SaleReturnCreateInput,
  SaleReturnItem,
  SaleReturnWithItems,
} from '@/capabilities/commerce';
export { computeReturnLineAmount } from '@/capabilities/commerce';
