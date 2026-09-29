import { computeReturnLineAmount } from './types';

/** 동일 saleItemId 요청 라인 합산 */
export function aggregateReturnRequestLines(
  items: Array<{ saleItemId: string; quantity: number }>
): Array<{ saleItemId: string; quantity: number }> {
  const map = new Map<string, number>();
  for (const item of items) {
    const id = String(item.saleItemId || '').trim();
    if (!id) continue;
    const qty = Math.floor(Number(item.quantity) || 0);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    map.set(id, (map.get(id) ?? 0) + qty);
  }
  return [...map.entries()]
    .map(([saleItemId, quantity]) => ({ saleItemId, quantity }))
    .sort((a, b) => a.saleItemId.localeCompare(b.saleItemId));
}

export type ReturnableCheckInput = {
  saleItemId: string;
  productNameSnapshot: string;
  soldQuantity: number;
  alreadyReturned: number;
  requestQuantity: number;
};

/** 반품 가능 수량 검증. 초과 시 기존 UI 메시지와 동일한 Error message. */
export function assertReturnQuantitiesAllowed(lines: ReturnableCheckInput[]): void {
  for (const line of lines) {
    const remaining = Math.max(0, line.soldQuantity - line.alreadyReturned);
    if (line.requestQuantity > remaining) {
      throw new Error(
        `"${line.productNameSnapshot}" 반품 가능 수량은 ${remaining}개입니다.`
      );
    }
  }
}

export function computeReturnTotalAmount(
  lines: Array<{
    returnQty: number;
    soldQty: number;
    unitPrice: number;
    discountAmount: number;
    alreadyReturned?: number;
  }>
): number {
  return lines.reduce(
    (sum, line) =>
      sum +
      computeReturnLineAmount({
        returnQty: line.returnQty,
        soldQty: line.soldQty,
        unitPrice: line.unitPrice,
        discountAmount: line.discountAmount,
        alreadyReturned: line.alreadyReturned,
      }),
    0
  );
}

export function mapCreateSaleReturnRpcError(message: string | null | undefined): string {
  const raw = (message || '').trim();
  if (!raw) return '반품 처리에 실패했습니다.';
  if (raw.includes('반품 가능 수량')) return raw;
  if (raw.includes('Permission denied')) return '반품 권한이 없습니다.';
  if (raw.includes('Not authenticated')) return '로그인이 필요합니다.';
  if (raw.includes('판매 내역을 찾을 수 없습니다')) return raw;
  if (raw.includes('원본 판매 상품')) return raw;
  if (raw.includes('반품할 상품을 선택')) return raw;
  if (raw.includes('반품 수량은 1 이상')) return raw;
  if (raw.includes('사업장·판매')) return raw;
  return raw;
}
