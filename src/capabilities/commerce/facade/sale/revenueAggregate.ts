/**
 * 매출 Gross/Returns/Net 집계 (DB 없음).
 * Gross = completed 판매, Returns = 기간 반품, Net = Gross − Returns.
 */
import type { SalePaymentMethod } from '@/capabilities/commerce/saleLedger';
import type {
  CommerceRevenueSummary,
  RevenueDateRange,
  RevenuePaymentBreakdown,
  RevenueProductBreakdown,
} from './revenueTypes';

export type RevenueSaleInput = {
  id: string;
  totalAmount: number;
  paymentMethod: SalePaymentMethod;
  status: string;
};

export type RevenueReturnInput = {
  id: string;
  totalAmount: number;
};

export type RevenueSaleItemInput = {
  saleId: string;
  productId: string | null;
  productNameSnapshot: string;
  quantity: number;
  lineAmount: number;
};

export function isCompletedSaleStatus(status: string | null | undefined): boolean {
  return (status || '').trim() === 'completed';
}

export function filterCompletedSales<T extends { status: string }>(sales: T[]): T[] {
  return sales.filter((s) => isCompletedSaleStatus(s.status));
}

export function sumAmounts(rows: Array<{ totalAmount: number }>): number {
  return rows.reduce((sum, row) => sum + (Number.isFinite(row.totalAmount) ? row.totalAmount : 0), 0);
}

export function computeNetSalesAmount(gross: number, returns: number): number {
  const g = Math.max(0, Number.isFinite(gross) ? gross : 0);
  const r = Math.max(0, Number.isFinite(returns) ? returns : 0);
  return g - r;
}

export function aggregatePaymentBreakdown(
  sales: RevenueSaleInput[]
): RevenuePaymentBreakdown[] {
  const paymentMap = new Map<SalePaymentMethod, { amount: number; count: number }>();
  for (const sale of sales) {
    const amount = Number.isFinite(sale.totalAmount) ? sale.totalAmount : 0;
    const prev = paymentMap.get(sale.paymentMethod) ?? { amount: 0, count: 0 };
    paymentMap.set(sale.paymentMethod, {
      amount: prev.amount + amount,
      count: prev.count + 1,
    });
  }
  return [...paymentMap.entries()]
    .map(([paymentMethod, v]) => ({
      paymentMethod,
      amount: v.amount,
      count: v.count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function aggregateProductBreakdown(
  items: RevenueSaleItemInput[]
): RevenueProductBreakdown[] {
  const map = new Map<string, RevenueProductBreakdown>();
  for (const item of items) {
    const key = item.productId ?? `name:${item.productNameSnapshot}`;
    const prev = map.get(key) ?? {
      key,
      productId: item.productId,
      productNameSnapshot: item.productNameSnapshot,
      quantity: 0,
      amount: 0,
    };
    prev.quantity += Number.isFinite(item.quantity) ? item.quantity : 0;
    prev.amount += Number.isFinite(item.lineAmount) ? item.lineAmount : 0;
    map.set(key, prev);
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity || b.amount - a.amount);
}

export function normalizeInclusiveRange(range: {
  fromYmd: string;
  toYmd: string;
}): { fromYmd: string; toYmd: string } {
  const from = range.fromYmd?.trim() || '';
  const to = range.toYmd?.trim() || '';
  if (!from || !to) return { fromYmd: from || to, toYmd: to || from };
  return from <= to ? { fromYmd: from, toYmd: to } : { fromYmd: to, toYmd: from };
}

export function buildCommerceRevenueSummary(input: {
  range: RevenueDateRange;
  sales: RevenueSaleInput[];
  returns: RevenueReturnInput[];
  saleItems: RevenueSaleItemInput[];
}): CommerceRevenueSummary {
  const completed = filterCompletedSales(input.sales);
  const completedIds = new Set(completed.map((s) => s.id));
  const totalSalesAmount = sumAmounts(completed);
  const totalReturnAmount = sumAmounts(input.returns);
  const itemsForCompleted = input.saleItems.filter((i) => completedIds.has(i.saleId));

  return {
    range: input.range,
    totalSalesAmount,
    saleCount: completed.length,
    totalReturnAmount,
    returnCount: input.returns.length,
    netSalesAmount: computeNetSalesAmount(totalSalesAmount, totalReturnAmount),
    byPayment: aggregatePaymentBreakdown(completed),
    byProduct: aggregateProductBreakdown(itemsForCompleted),
  };
}

/** Retail 호환 별칭 — 구현은 buildCommerceRevenueSummary 한 곳 */
export const buildRetailRevenueSummary = buildCommerceRevenueSummary;
