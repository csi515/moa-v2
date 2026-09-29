/**
 * Commerce Sale. 원자 생성 SoT는 `@/capabilities/commerce/saleLedger` (create_sale).
 * 조회·집계는 이 폴더. 포인트 earn은 호출부(Retail) 책임.
 */
export type {
  Sale,
  SaleCatalogItem,
  SaleCreateInput,
  SaleItem,
  SaleStatus,
  SaleWithItems,
} from '@/capabilities/commerce/saleLedger';
export {
  SALE_STATUSES,
  SALE_STATUS_LABELS,
  buildProductNameSnapshot,
  saleService,
  mapCreateSaleRpcError,
} from '@/capabilities/commerce/saleLedger';

export type { SalePaymentMethod } from '../payment';
export { SALE_PAYMENT_METHODS, SALE_PAYMENT_METHOD_LABELS } from '../payment';

export { formatSaleNumber } from './saleQuery';
export type {
  SaleCustomerFilter,
  SaleCustomerOption,
  SaleListItem,
  SaleListQuery,
  SalePaymentFilter,
} from './saleQuery';

export { saleHistoryService } from './saleHistoryService';
export { customerPurchaseService } from './customerPurchaseService';

export type {
  CommerceRevenueSummary,
  RetailRevenueSummary,
  RevenueDateRange,
  RevenuePaymentBreakdown,
  RevenuePeriodPreset,
  RevenueProductBreakdown,
} from './revenueTypes';
export {
  aggregatePaymentBreakdown,
  aggregateProductBreakdown,
  buildCommerceRevenueSummary,
  buildRetailRevenueSummary,
  computeNetSalesAmount,
  filterCompletedSales,
  isCompletedSaleStatus,
  normalizeInclusiveRange,
} from './revenueAggregate';
export type {
  RevenueReturnInput,
  RevenueSaleInput,
  RevenueSaleItemInput,
} from './revenueAggregate';
export { revenueService, retailRevenueService } from './revenueService';
