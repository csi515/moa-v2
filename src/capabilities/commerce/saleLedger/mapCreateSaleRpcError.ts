/** PostgREST/RPC 예외 메시지를 기존 UI 친화 메시지로 정규화 */
export function mapCreateSaleRpcError(message: string | null | undefined): string {
  const raw = (message || '').trim();
  if (!raw) return '판매 처리에 실패했습니다.';
  if (raw.includes('재고가 부족')) {
    return raw.includes('재고가 부족합니다') ? raw : `재고가 부족합니다: ${raw}`;
  }
  if (raw.includes('Permission denied')) return '판매 권한이 없습니다.';
  if (raw.includes('Not authenticated')) return '로그인이 필요합니다.';
  if (raw.includes('product organization_id mismatch')) {
    return '다른 사업장의 상품은 판매할 수 없습니다.';
  }
  if (raw.includes('Customer not found')) return '선택한 고객을 찾을 수 없습니다.';
  if (raw.includes('판매할 상품을 담아')) return '판매할 상품을 담아 주세요.';
  if (raw.includes('수량은 1 이상')) return '수량은 1 이상의 정수여야 합니다.';
  if (raw.includes('단가가 올바르지')) return '단가가 올바르지 않습니다.';
  if (raw.includes('포인트')) return raw;
  return raw;
}
