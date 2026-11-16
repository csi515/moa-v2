/**
 * 자원 경합(예약 정원, 이용권 잔여, 재고) 비관적 락(FOR UPDATE) RPC 표준 예외 매퍼
 * 
 * PostgreSQL RPC에서 던져진 표준 예외(CAPACITY_EXCEEDED, PASS_NOT_USABLE, INSUFFICIENT_STOCK 등)를
 * UI 및 사용자 토스트에 적합한 정규화된 한국어 피드백으로 일원화 변환한다.
 */

export type ResourceLockErrorCode =
  | 'CAPACITY_EXCEEDED'
  | 'PASS_NOT_USABLE'
  | 'INSUFFICIENT_STOCK'
  | 'ALREADY_BOOKED'
  | 'CANNOT_BOOK_PAST_SCHEDULE'
  | 'PERMISSION_DENIED'
  | 'NOT_AUTHENTICATED'
  | 'UNKNOWN';

export interface ResourceLockErrorResult {
  code: ResourceLockErrorCode;
  message: string;
}

export function parseResourceLockError(error: unknown): ResourceLockErrorResult {
  const rawMsg = typeof error === 'string'
    ? error
    : (error as { message?: string; details?: string } | null)?.message || (error as { message?: string; details?: string } | null)?.details || '';

  if (
    rawMsg.includes('CAPACITY_EXCEEDED') ||
    rawMsg.includes('SCHEDULE_CAPACITY_EXCEEDED') ||
    rawMsg.includes('정원이 초과') ||
    rawMsg.includes('정원이 모두 마감')
  ) {
    return {
      code: 'CAPACITY_EXCEEDED',
      message: '정원이 마감되어 예약할 수 없습니다. (동시 신청 정원 초과)',
    };
  }

  if (
    rawMsg.includes('PASS_NOT_USABLE') ||
    rawMsg.includes('PASS_EXHAUSTED') ||
    rawMsg.includes('PASS_EXPIRED') ||
    rawMsg.includes('잔여 수강권 횟수가 부족') ||
    rawMsg.includes('잔여 횟수가 부족') ||
    rawMsg.includes('만료된 이용권') ||
    rawMsg.includes('유효기간이 만료') ||
    rawMsg.includes('No remaining pass count')
  ) {
    return {
      code: 'PASS_NOT_USABLE',
      message: '잔여 횟수가 부족하거나 사용할 수 없는 이용권입니다.',
    };
  }

  if (
    rawMsg.includes('INSUFFICIENT_STOCK') ||
    rawMsg.includes('재고가 부족합니다') ||
    rawMsg.includes('insufficient stock')
  ) {
    return {
      code: 'INSUFFICIENT_STOCK',
      message: '재고가 부족합니다.',
    };
  }

  if (rawMsg.includes('ALREADY_BOOKED') || rawMsg.includes('이미 예약')) {
    return {
      code: 'ALREADY_BOOKED',
      message: '이미 해당 일정에 예약 내역이 존재합니다.',
    };
  }

  if (rawMsg.includes('CANNOT_BOOK_PAST_SCHEDULE') || rawMsg.includes('지난 일정')) {
    return {
      code: 'CANNOT_BOOK_PAST_SCHEDULE',
      message: '이미 시작되었거나 지난 일정은 예약할 수 없습니다.',
    };
  }

  if (rawMsg.includes('Permission denied') || rawMsg.includes('권한이 없습니다')) {
    return {
      code: 'PERMISSION_DENIED',
      message: '해당 작업을 수행할 권한이 없습니다.',
    };
  }

  if (rawMsg.includes('Not authenticated') || rawMsg.includes('Authentication required')) {
    return {
      code: 'NOT_AUTHENTICATED',
      message: '로그인이 필요합니다.',
    };
  }

  return {
    code: 'UNKNOWN',
    message: rawMsg || '자원 처리 중 오류가 발생했습니다.',
  };
}

export function getResourceLockErrorMessage(error: unknown): string {
  return parseResourceLockError(error).message;
}
