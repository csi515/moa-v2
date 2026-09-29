export function mapBathBookingRpcError(error: { message?: string }): {
  code: string;
  message: string;
} {
  const raw = error.message || '';
  if (/Permission denied|Not authenticated/i.test(raw)) {
    return { code: 'permission', message: '권한이 없습니다.' };
  }
  if (/already reserved|overlap|conflicts/i.test(raw)) {
    return { code: 'conflict', message: '이미 예약된 시간대입니다.' };
  }
  if (/Organization mismatch/i.test(raw)) {
    return { code: 'org_mismatch', message: '다른 사업장의 예약입니다.' };
  }
  if (/Booking not found/i.test(raw)) {
    return { code: 'not_found', message: '예약을 찾을 수 없습니다.' };
  }
  if (/Customer not found/i.test(raw)) {
    return { code: 'customer', message: '해당 사업장 고객이 아닙니다.' };
  }
  if (/Invalid practice room|Invalid bookable resource|Resource not found/i.test(raw)) {
    return { code: 'resource', message: '예약할 수 없는 자원입니다.' };
  }
  if (/Staff not found/i.test(raw)) {
    return { code: 'staff', message: '해당 사업장 직원이 아닙니다.' };
  }
  if (/Service not found|inactive service/i.test(raw)) {
    return { code: 'service', message: '예약할 수 없는 서비스입니다.' };
  }
  if (/Staff required/i.test(raw)) {
    return { code: 'staff', message: '담당 직원이 필요합니다.' };
  }
  if (/Overnight/i.test(raw)) {
    return { code: 'overnight', message: '자정을 넘는 예약은 할 수 없습니다.' };
  }
  if (/operating hours|Outside room/i.test(raw)) {
    return { code: 'hours', message: '운영 시간 외에는 예약할 수 없습니다.' };
  }
  if (/Booking not cancellable|not transition/i.test(raw)) {
    return { code: 'status', message: '변경할 수 없는 예약 상태입니다.' };
  }
  return { code: 'unknown', message: raw || '예약 처리에 실패했습니다.' };
}
