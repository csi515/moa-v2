export function mapBookingPassRpcError(error: {
  message?: string;
  code?: string;
}): { code: string; message: string } {
  const raw = error.message || '';
  if (/Insufficient session pass/i.test(raw)) {
    return {
      code: 'insufficient_pass',
      message: '이용권 잔여 횟수가 부족합니다.',
    };
  }
  if (/Booking not found/i.test(raw)) {
    return { code: 'not_found', message: '예약을 찾을 수 없습니다.' };
  }
  if (/Organization mismatch/i.test(raw)) {
    return { code: 'org_mismatch', message: '다른 사업장의 예약입니다.' };
  }
  if (/Permission denied|Not authenticated/i.test(raw)) {
    return { code: 'permission', message: '권한이 없습니다.' };
  }
  if (/Customer not found/i.test(raw)) {
    return { code: 'customer', message: '회원을 찾을 수 없습니다.' };
  }
  if (/Session pass refund failed/i.test(raw)) {
    return { code: 'refund_failed', message: '이용권 복구에 실패했습니다.' };
  }
  if (/Cancellation window expired/i.test(raw)) {
    return { code: 'window_expired', message: '취소 가능 시간이 지났습니다.' };
  }
  if (/Not a customer-requested booking/i.test(raw)) {
    return { code: 'not_customer_request', message: '고객 신청 예약만 취소할 수 있습니다.' };
  }
  if (/Booking not cancellable/i.test(raw)) {
    return { code: 'not_cancellable', message: '취소할 수 없는 예약 상태입니다.' };
  }
  return { code: 'unknown', message: raw || '예약 상태 변경에 실패했습니다.' };
}
