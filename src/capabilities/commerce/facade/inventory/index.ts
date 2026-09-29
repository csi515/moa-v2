/**
 * Commerce Inventory. 구현 SoT는 `@/capabilities/commerce/stock`.
 * 잔량 변경은 core.apply_stock_movement 만 사용.
 */
export type {
  Inventory,
  InventoryStockRow,
  SaleStockDeductLine,
  StockAdjustmentInput,
  StockInboundInput,
  StockMovement,
  StockMovementListQuery,
  StockMovementType,
  StockReturnReferenceType,
  StockReturnRestoreInput,
  StockSaleDeductInput,
  StockSaleReferenceType,
  StockShortfall,
} from '@/capabilities/commerce/stock';
export {
  INVENTORY_LOW_STOCK_THRESHOLD,
  STOCK_ADJUSTMENT_REASONS,
  STOCK_MOVEMENT_TYPES,
  STOCK_MOVEMENT_TYPE_LABELS,
  TEXTBOOK_SALE_MOVEMENT_REF,
  inventoryService,
  callApplyStockMovement,
  mapStockMovementRpcError,
  stockSaleOps,
  aggregateSaleStockLines,
  findStockShortfalls,
  saleStockAggKey,
} from '@/capabilities/commerce/stock';
