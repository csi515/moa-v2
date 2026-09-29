/**
 * Commerce 공개 배럴.
 * 구현 SoT: catalog / stock / saleLedger / loyalty.
 * modules/* 를 import 하지 않는다. RPC/RLS를 우회하지 않는다.
 */

export type {
  Product,
  ProductCategory,
  ProductListItem,
  ProductSaveInput,
  ProductVariant,
  ProductVariantSaveInput,
} from './product';
export { productService } from './product';

export type {
  Inventory,
  InventoryStockRow,
  SaleStockDeductLine,
  StockAdjustmentInput,
  StockInboundInput,
  StockMovement,
  StockMovementType,
  StockShortfall,
} from './inventory';
export {
  INVENTORY_LOW_STOCK_THRESHOLD,
  STOCK_ADJUSTMENT_REASONS,
  STOCK_MOVEMENT_TYPES,
  STOCK_MOVEMENT_TYPE_LABELS,
  TEXTBOOK_SALE_MOVEMENT_REF,
  inventoryService,
  callApplyStockMovement,
  stockSaleOps,
} from './inventory';

export type {
  Sale,
  SaleCatalogItem,
  SaleCreateInput,
  SaleCustomerFilter,
  SaleCustomerOption,
  SaleItem,
  SaleListItem,
  SaleListQuery,
  SalePaymentFilter,
  SaleStatus,
  SaleWithItems,
  CommerceRevenueSummary,
  RetailRevenueSummary,
  RevenueDateRange,
  RevenuePaymentBreakdown,
  RevenuePeriodPreset,
  RevenueProductBreakdown,
  RevenueReturnInput,
  RevenueSaleInput,
  RevenueSaleItemInput,
} from './sale';
export {
  SALE_STATUSES,
  SALE_STATUS_LABELS,
  aggregatePaymentBreakdown,
  aggregateProductBreakdown,
  buildProductNameSnapshot,
  saleService,
  formatSaleNumber,
  saleHistoryService,
  customerPurchaseService,
  revenueService,
  retailRevenueService,
  buildCommerceRevenueSummary,
  buildRetailRevenueSummary,
  computeNetSalesAmount,
  filterCompletedSales,
  isCompletedSaleStatus,
  normalizeInclusiveRange,
} from './sale';

export type {
  SaleItemReturnable,
  SaleReturn,
  SaleReturnCreateInput,
  SaleReturnItem,
  SaleReturnWithItems,
} from './return';
export {
  saleReturnService,
  computeReturnLineAmount,
  aggregateReturnRequestLines,
  assertReturnQuantitiesAllowed,
} from './return';

export type { SalePaymentMethod } from './payment';
export { SALE_PAYMENT_METHODS, SALE_PAYMENT_METHOD_LABELS } from './payment';

export { storeCapability } from './storeCapability';
export type { StoreCapability } from './storeCapability';
