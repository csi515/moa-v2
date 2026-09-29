import type { SaleStockDeductLine, StockShortfall } from './types';

export type SaleStockAggKey = string;

/** productId + variantId 합산 키 (variant 없으면 __none__) */
export function saleStockAggKey(productId: string, variantId?: string | null): SaleStockAggKey {
  return `${productId.trim()}::${variantId?.trim() || '__none__'}`;
}

export type AggregatedSaleStockLine = {
  productId: string;
  variantId: string | null;
  quantity: number;
  label: string;
};

/**
 * 동일 productId+variantId 라인을 합산한다.
 * 재고 검증·차감 계획의 단일 기준.
 */
export function aggregateSaleStockLines(lines: SaleStockDeductLine[]): AggregatedSaleStockLine[] {
  const map = new Map<SaleStockAggKey, AggregatedSaleStockLine>();

  for (const line of lines) {
    const productId = String(line.productId || '').trim();
    if (!productId) continue;
    const qty = Number(line.quantity);
    if (!Number.isFinite(qty) || qty <= 0) continue;

    const variantId = line.variantId?.trim() ? line.variantId.trim() : null;
    const key = saleStockAggKey(productId, variantId);
    const label = (line.label || '').trim() || '상품';
    const existing = map.get(key);
    if (existing) {
      existing.quantity += qty;
      if (!existing.label) existing.label = label;
    } else {
      map.set(key, { productId, variantId, quantity: qty, label });
    }
  }

  return [...map.values()].sort((a, b) => {
    const c = a.productId.localeCompare(b.productId);
    if (c !== 0) return c;
    return (a.variantId || '').localeCompare(b.variantId || '');
  });
}

export function findStockShortfalls(
  availableByKey: Map<SaleStockAggKey, number>,
  lines: SaleStockDeductLine[]
): StockShortfall[] {
  const shortfalls: StockShortfall[] = [];
  for (const agg of aggregateSaleStockLines(lines)) {
    const key = saleStockAggKey(agg.productId, agg.variantId);
    const available = availableByKey.get(key) ?? 0;
    if (available < agg.quantity) {
      shortfalls.push({
        productId: agg.productId,
        variantId: agg.variantId,
        label: agg.label,
        required: agg.quantity,
        available,
      });
    }
  }
  return shortfalls;
}
