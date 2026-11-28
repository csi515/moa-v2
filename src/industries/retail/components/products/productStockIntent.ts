import type { ProductStockFilter } from './productStockUtils';

let pendingStockFilter: ProductStockFilter | null = null;

/** 홈 등에서 상품 화면의 재고 필터를 열고 들어올 때 사용한다. */
export function openProductStockFilter(filter: Exclude<ProductStockFilter, 'ALL'>): void {
  pendingStockFilter = filter;
}

export function peekProductStockFilter(): ProductStockFilter | null {
  return pendingStockFilter;
}

export function clearProductStockFilter(): void {
  pendingStockFilter = null;
}
