/**
 * Core 재고 도메인 타입 (DB: core.inventory / core.stock_movements).
 * 잔량은 Inventory, 증감은 StockMovement. 절대값 덮어쓰기 금지.
 */

export type StockMovementType = 'inbound' | 'sale' | 'return' | 'adjustment';

export const STOCK_MOVEMENT_TYPES: readonly StockMovementType[] = [
  'inbound',
  'sale',
  'return',
  'adjustment',
] as const;

export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  inbound: '입고',
  sale: '판매',
  return: '반품',
  adjustment: '조정',
};

export interface Inventory {
  id: string;
  organizationId: string;
  productId: string | null;
  variantId: string | null;
  quantity: number;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  organizationId: string;
  productId: string | null;
  variantId: string | null;
  movementType: StockMovementType;
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface InventoryStockRow {
  key: string;
  productId: string;
  productName: string;
  productCode: string | null;
  variantId: string | null;
  variantName: string | null;
  quantity: number;
  isActive: boolean;
  productIsActive: boolean;
}

export const INVENTORY_LOW_STOCK_THRESHOLD = 5;

export interface StockInboundInput {
  organizationId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  reason?: string | null;
}

export const STOCK_ADJUSTMENT_REASONS = [
  '실사 차이',
  '분실',
  '파손',
  '기타',
] as const;

export interface StockAdjustmentInput {
  organizationId: string;
  productId: string;
  variantId?: string | null;
  /** 부호 있는 증감 (0 불가) */
  quantity: number;
  reason: string;
}

/** sale movement: quantity 음수, reference_type=sale | textbook_sale */
export type StockSaleReferenceType = 'sale' | 'textbook_sale';

export interface StockSaleDeductInput {
  organizationId: string;
  productId: string;
  variantId?: string | null;
  /** 차감할 양수 수량 */
  quantity: number;
  /** Core Sale.id 또는 TextbookSale.id */
  saleId: string;
  /** 기본 'sale'. Piano 교재는 'textbook_sale' */
  referenceType?: StockSaleReferenceType;
  reason?: string | null;
}

/** return movement: quantity 양수, reference_type=sale_return | textbook_sale */
export type StockReturnReferenceType = 'sale_return' | 'textbook_sale';

export interface StockReturnRestoreInput {
  organizationId: string;
  productId: string;
  variantId?: string | null;
  /** 복구할 양수 수량 */
  quantity: number;
  /**
   * Core SaleReturn.id 또는 TextbookSale.id
   * referenceType=textbook_sale 이면 교재 판매 id
   */
  saleReturnId: string;
  /** 기본 'sale_return'. Piano 교재 반품/취소는 'textbook_sale' */
  referenceType?: StockReturnReferenceType;
  reason?: string | null;
}

export const TEXTBOOK_SALE_MOVEMENT_REF = 'textbook_sale' as const;

export interface SaleStockDeductLine {
  productId: string;
  variantId?: string | null;
  quantity: number;
  label: string;
}

export interface StockShortfall {
  productId: string;
  variantId: string | null;
  label: string;
  required: number;
  available: number;
}

export interface StockMovementListQuery {
  organizationId: string;
  productId?: string;
  variantId?: string | null;
  movementType?: StockMovementType;
  referenceType?: string;
  referenceId?: string;
  /** 기본 100 */
  limit?: number;
}
