export { ModuleLabelsProvider, useModuleLabels } from './config/ModuleLabelsProvider';
export { retailModuleLabels } from './config/labels';
export { RetailAppContent } from './RetailAppContent';
export { retailPluginManifest } from './plugin';
export type {
  Product,
  ProductVariant,
  ProductCategory,
  ProductListItem,
  ProductSaveInput,
  ProductVariantSaveInput,
  ProductStatusFilter,
} from './types/product';
export type {
  Inventory,
  StockMovement,
  StockMovementType,
  InventoryStockRow,
  InventoryStockFilter,
  StockInboundInput,
  StockAdjustmentInput,
  StockAdjustmentReasonPreset,
  SaleStockDeductLine,
  StockShortfall,
} from './types/inventory';
export {
  STOCK_MOVEMENT_TYPES,
  STOCK_MOVEMENT_TYPE_LABELS,
  INVENTORY_LOW_STOCK_THRESHOLD,
  STOCK_ADJUSTMENT_REASONS,
} from './types/inventory';
export type {
  Sale,
  SaleItem,
  SaleWithItems,
  SaleStatus,
  SalePaymentMethod,
  SaleCatalogItem,
  SaleCartLine,
  SaleCreateInput,
  SaleCustomerOption,
  SaleListItem,
  SalePaymentFilter,
  SaleCustomerFilter,
  SaleListQuery,
} from './types/sale';
export {
  SALE_STATUSES,
  SALE_STATUS_LABELS,
  SALE_PAYMENT_METHODS,
  SALE_PAYMENT_METHOD_LABELS,
  POS_PAYMENT_METHODS,
  buildProductNameSnapshot,
  cartLineAmount,
  cartTotalAmount,
  formatSaleNumber,
} from './types/sale';
export { productService } from './services/productService';
export { inventoryService } from './services/inventoryService';
export { saleService } from './services/saleService';
export { saleHistoryService } from './services/saleHistoryService';
export type { RetailPointsSettings } from './points/pointsSettings';
export {
  POINT_WON_VALUE,
  POINTS_EARN_RATE_MIN,
  POINTS_EARN_RATE_MAX,
  POINTS_EARN_RATE_DEFAULT,
  POINTS_EARN_ROUNDING,
  getRetailPointsSettings,
  withRetailPointsSettings,
  validateRetailPointsSettings,
  clampEarnRate,
  computeEarnPoints,
} from './points/pointsSettings';
