export function mapCustomerSessionRpcError(error: { message?: string }): {
  code: string;
  message: string;
} {
  const raw = error.message || '';
  if (/Permission denied|Not authenticated/i.test(raw)) {
    return { code: 'permission', message: '권한이 없습니다.' };
  }
  if (/Organization mismatch/i.test(raw)) {
    return { code: 'org_mismatch', message: '다른 사업장의 세션입니다.' };
  }
  if (/Customer not found/i.test(raw)) {
    return { code: 'customer', message: '해당 사업장 고객이 아닙니다.' };
  }
  if (/Staff not found/i.test(raw)) {
    return { code: 'staff', message: '해당 사업장 직원이 아닙니다.' };
  }
  if (/Pass not found/i.test(raw)) {
    return { code: 'pass', message: '해당 고객의 이용권이 아닙니다.' };
  }
  if (/Resource not found/i.test(raw)) {
    return { code: 'resource', message: '해당 사업장 자원이 아닙니다.' };
  }
  if (/Reservation not found/i.test(raw)) {
    return { code: 'reservation', message: '해당 사업장 예약이 아닙니다.' };
  }
  if (/Payment not found/i.test(raw)) {
    return { code: 'payment', message: '해당 고객의 결제가 아닙니다.' };
  }
  if (/Session not found/i.test(raw)) {
    return { code: 'not_found', message: '세션을 찾을 수 없습니다.' };
  }
  if (/Session not active/i.test(raw)) {
    return { code: 'not_active', message: '종료할 수 없는 세션 상태입니다.' };
  }
  if (/Session not cancellable/i.test(raw)) {
    return { code: 'not_cancellable', message: '취소할 수 없는 세션 상태입니다.' };
  }
  return { code: 'unknown', message: raw || '세션 처리에 실패했습니다.' };
}
