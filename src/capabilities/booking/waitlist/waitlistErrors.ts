export function mapWaitlistRpcError(error: { message?: string }): {
  code: string;
  message: string;
} {
  const raw = error.message || '';
  if (/Permission denied|Not authenticated/i.test(raw)) {
    return { code: 'permission', message: '권한이 없습니다.' };
  }
  if (/Organization mismatch/i.test(raw)) {
    return { code: 'org_mismatch', message: '다른 사업장의 대기열입니다.' };
  }
  if (/Customer not found/i.test(raw)) {
    return { code: 'customer', message: '해당 사업장 고객이 아닙니다.' };
  }
  if (/Schedule not found/i.test(raw)) {
    return { code: 'schedule', message: '해당 사업장 일정이 아닙니다.' };
  }
  if (/Reservation not found/i.test(raw)) {
    return { code: 'reservation', message: '해당 사업장 예약이 아닙니다.' };
  }
  if (/Invalid waitlist target|Schedule or requested time/i.test(raw)) {
    return { code: 'target', message: '대기 대상을 확인해 주세요.' };
  }
  if (/Waitlist entry not found/i.test(raw)) {
    return { code: 'not_found', message: '대기 항목을 찾을 수 없습니다.' };
  }
  if (/Waitlist is empty/i.test(raw)) {
    return { code: 'empty', message: '대기 중인 고객이 없습니다.' };
  }
  if (/No waiting entry/i.test(raw)) {
    return { code: 'no_waiting', message: '알림을 보낼 대기 고객이 없습니다.' };
  }
  if (/not cancellable/i.test(raw)) {
    return { code: 'not_cancellable', message: '취소할 수 없는 대기 상태입니다.' };
  }
  if (/not expirable/i.test(raw)) {
    return { code: 'not_expirable', message: '만료할 수 없는 대기 상태입니다.' };
  }
  if (/not assignable/i.test(raw)) {
    return { code: 'not_assignable', message: '배정할 수 없는 대기 상태입니다.' };
  }
  if (/not waiting/i.test(raw)) {
    return { code: 'not_waiting', message: '대기 중인 항목만 알릴 수 있습니다.' };
  }
  return { code: 'unknown', message: raw || '대기열 처리에 실패했습니다.' };
}
