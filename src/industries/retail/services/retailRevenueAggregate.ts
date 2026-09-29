/** Retail 매출 집계 — Commerce revenueAggregate facade */
export {
  aggregatePaymentBreakdown,
  aggregateProductBreakdown,
  buildRetailRevenueSummary,
  computeNetSalesAmount,
  filterCompletedSales,
  isCompletedSaleStatus,
  normalizeInclusiveRange,
} from '@/capabilities/commerce';
export type {
  RevenueReturnInput,
  RevenueSaleInput,
  RevenueSaleItemInput,
} from '@/capabilities/commerce';
