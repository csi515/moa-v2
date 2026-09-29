/** PostgREST/RPC 예외 메시지를 기존 UI 친화 메시지로 정규화 */
export function mapStockMovementRpcError(message: string | null | undefined): string {
  const raw = (message || '').trim();
  if (!raw) return '재고 처리에 실패했습니다.';
  if (raw.includes('재고가 부족')) return raw;
  if (raw.includes('조정 후 재고가 음수')) return raw;
  if (raw.includes('재고가 음수가 됩니다')) return raw;
  if (raw.includes('입고 수량')) return '입고 수량은 0보다 커야 합니다.';
  if (raw.includes('조정 수량')) return '조정 수량은 0이 아닌 정수여야 합니다.';
  if (raw.includes('조정 사유')) return '조정 사유를 입력해 주세요.';
  if (raw.includes('판매 차감')) return '판매 차감 수량은 0보다 커야 합니다.';
  if (raw.includes('반품 복구')) return '반품 복구 수량은 0보다 커야 합니다.';
  if (raw.includes('판매 참조')) return '판매 참조(saleId)가 필요합니다.';
  if (raw.includes('반품 참조')) return '반품 참조(saleReturnId)가 필요합니다.';
  if (raw.includes('상품을 선택')) return '상품을 선택해 주세요.';
  if (raw.includes('상품을 찾을 수 없습니다')) return '상품을 찾을 수 없습니다.';
  if (raw.includes('옵션이 상품과 일치')) {
    return '선택한 옵션이 상품과 일치하지 않습니다.';
  }
  if (raw.includes('product organization_id mismatch')) {
    return '다른 사업장의 상품은 처리할 수 없습니다.';
  }
  if (raw.includes('Permission denied')) return '재고 권한이 없습니다.';
  if (raw.includes('Not authenticated')) return '로그인이 필요합니다.';
  return raw;
}
