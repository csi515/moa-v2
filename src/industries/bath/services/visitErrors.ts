export function mapBathVisitRpcError(error: { message?: string; code?: string }): {
  code: string;
  message: string;
} {
  const raw = error.message || '';
  if (/Permission denied|Not authenticated/i.test(raw)) {
    return { code: 'permission', message: '권한이 없습니다.' };
  }
  if (/Organization mismatch/i.test(raw)) {
    return { code: 'org_mismatch', message: '다른 사업장의 방문입니다.' };
  }
  if (/Customer not found/i.test(raw)) {
    return { code: 'customer', message: '해당 사업장 고객이 아닙니다.' };
  }
  if (/Staff not found/i.test(raw)) {
    return { code: 'staff', message: '해당 사업장 직원이 아닙니다.' };
  }
  if (/Product not found/i.test(raw)) {
    return { code: 'product', message: '입장 상품을 찾을 수 없습니다.' };
  }
  if (/Pass not found/i.test(raw)) {
    return { code: 'pass', message: '해당 고객의 이용권이 아닙니다.' };
  }
  if (/Visit not found/i.test(raw)) {
    return { code: 'not_found', message: '방문을 찾을 수 없습니다.' };
  }
  if (/Visit not open/i.test(raw)) {
    return { code: 'not_open', message: '퇴장할 수 없는 방문 상태입니다.' };
  }
  if (/Visit not cancellable/i.test(raw)) {
    return { code: 'not_cancellable', message: '취소할 수 없는 방문 상태입니다.' };
  }
  return { code: 'unknown', message: raw || '방문 처리에 실패했습니다.' };
}
