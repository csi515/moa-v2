/**
 * 재고·자재 입출고 및 안전재고 관리 엔진 (Pure Function Domain)
 */

export type StockMovementType = 'IN' | 'OUT' | 'ADJUST' | 'DISCARD';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  safetyStock: number;
  unitPrice: number;
}

export interface StockMovement {
  itemId: string;
  type: StockMovementType;
  quantity: number;
  reason?: string;
  timestamp: string;
}

export function applyStockMovement(
  item: InventoryItem,
  movement: StockMovement
): { updatedItem: InventoryItem; success: boolean; error?: string } {
  if (movement.quantity <= 0) {
    return {
      updatedItem: item,
      success: false,
      error: '수량은 0보다 커야 합니다.',
    };
  }

  let nextStock = item.currentStock;

  switch (movement.type) {
    case 'IN':
      nextStock += movement.quantity;
      break;
    case 'OUT':
    case 'DISCARD':
      if (item.currentStock < movement.quantity) {
        return {
          updatedItem: item,
          success: false,
          error: `재고가 부족합니다 (현재고: ${item.currentStock}, 요청: ${movement.quantity})`,
        };
      }
      nextStock -= movement.quantity;
      break;
    case 'ADJUST':
      nextStock = movement.quantity;
      break;
  }

  return {
    updatedItem: {
      ...item,
      currentStock: nextStock,
    },
    success: true,
  };
}

export function checkSafetyStockWarning(item: InventoryItem): {
  isLowStock: boolean;
  shortageQuantity: number;
} {
  const isLowStock = item.currentStock <= item.safetyStock;
  const shortageQuantity = isLowStock
    ? Math.max(0, item.safetyStock - item.currentStock)
    : 0;

  return {
    isLowStock,
    shortageQuantity,
  };
}
