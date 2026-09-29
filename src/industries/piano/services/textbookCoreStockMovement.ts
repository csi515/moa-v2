import type { StockMovement, StockMovementType } from '@/capabilities/commerce';
import type { Textbook, TextbookInventoryTransaction } from '@/types';

/** Core movement_type → 교재 이력 표시용 transactionType */
export function mapCoreMovementTypeToTextbookTx(
  movementType: StockMovementType | string
): TextbookInventoryTransaction['transactionType'] {
  switch (movementType) {
    case 'inbound':
      return 'inbound';
    case 'sale':
      return 'sale';
    case 'return':
      return 'return';
    case 'adjustment':
      return 'adjust';
    default:
      return 'adjust';
  }
}

/**
 * Core Inventory 현재 잔량 + 최신순 movement로
 * 표시용 previousStock/currentStock을 역산한다.
 * (절대값 덮어쓰기가 아닌 누적 잔량 기준)
 */
export function computeDisplayStocksFromCurrent(
  currentQty: number,
  movementsNewestFirst: ReadonlyArray<{ quantity: number }>
): Array<{ previousStock: number; currentStock: number }> {
  let after = currentQty;
  return movementsNewestFirst.map((m) => {
    const currentStock = after;
    const previousStock = after - m.quantity;
    after = previousStock;
    return { previousStock, currentStock };
  });
}

export function mapMovementToTextbookTx(
  movement: StockMovement,
  textbook: Textbook,
  stocks: { previousStock: number; currentStock: number }
): TextbookInventoryTransaction {
  return {
    id: movement.id,
    textbookId: textbook.id,
    textbookTitle: textbook.title,
    transactionType: mapCoreMovementTypeToTextbookTx(movement.movementType),
    quantity: movement.quantity,
    previousStock: stocks.previousStock,
    currentStock: stocks.currentStock,
    referenceId: movement.referenceId || undefined,
    transactionDate: movement.createdAt.slice(0, 10),
    memo: movement.reason || undefined,
    createdAt: movement.createdAt,
  };
}

/** 수동 반품 입고용 sale_return 참조 id (SaleReturn 행이 없을 때 CHECK 충족) */
export function newManualSaleReturnRefId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `manual-return-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
