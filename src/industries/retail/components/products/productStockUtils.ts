/** 상품 목록의 재고 부족·색상 판정 (안전재고 기준) */

export type ProductStockFilter = 'ALL' | 'LOW' | 'OUT';

/**
 * @param alertsEnabled Phase 3a enable_safety_stock_alert — false면 부족 판정 안 함
 */
export function isProductLowStock(
  quantity: number,
  safetyStock: number,
  alertsEnabled = true
): boolean {
  if (!alertsEnabled) return false;
  return safetyStock > 0 && quantity > 0 && quantity <= safetyStock;
}

export function matchesProductStockFilter(
  quantity: number,
  safetyStock: number,
  filter: ProductStockFilter,
  alertsEnabled = true
): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'OUT') return quantity <= 0;
  return isProductLowStock(quantity, safetyStock, alertsEnabled);
}

export function productQtyToneClass(
  quantity: number,
  safetyStock: number,
  alertsEnabled = true
): string {
  if (quantity <= 0) return 'text-rose-600';
  if (isProductLowStock(quantity, safetyStock, alertsEnabled)) return 'text-amber-700';
  return 'text-slate-900';
}
