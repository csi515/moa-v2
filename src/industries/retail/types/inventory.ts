/**
 * Retail 재고 타입 — Core 공통 모델을 재사용.
 * 목록 필터 등 UI 전용만 모듈에 유지.
 */
export type {
  Inventory,
  InventoryStockRow,
  SaleStockDeductLine,
  StockAdjustmentInput,
  StockInboundInput,
  StockMovement,
  StockMovementType,
  StockShortfall,
} from '@/capabilities/commerce';
export {
  INVENTORY_LOW_STOCK_THRESHOLD,
  STOCK_ADJUSTMENT_REASONS,
  STOCK_MOVEMENT_TYPES,
  STOCK_MOVEMENT_TYPE_LABELS,
} from '@/capabilities/commerce';
import { STOCK_ADJUSTMENT_REASONS } from '@/capabilities/commerce';

export type InventoryStockFilter = 'ALL' | 'LOW' | 'OUT';

export type StockAdjustmentReasonPreset = (typeof STOCK_ADJUSTMENT_REASONS)[number];
