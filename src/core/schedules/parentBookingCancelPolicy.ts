import type { Booking } from '@/core/types/schedule';

export type ParentCancelDecision =
  | { ok: true; action: 'cancel' }
  | { ok: true; action: 'idempotent' }
  | {
      ok: false;
      reason: 'not_customer_request' | 'not_scheduled' | 'window_expired';
    };

/**
 * 부모 포털 예약 취소 창 — UI와 서버 규칙의 공통 기준.
 * 소유권·조직 격리는 RPC에서 auth.uid + parent_owns_customer로 검증한다.
 */
export function evaluateParentBookingCancel(
  booking: Pick<Booking, 'requestedBy' | 'status' | 'startsAt'>,
  nowIso: string
): ParentCancelDecision {
  if (booking.status === 'cancelled') {
    return { ok: true, action: 'idempotent' };
  }
  if (booking.requestedBy !== 'customer') {
    return { ok: false, reason: 'not_customer_request' };
  }
  if (booking.status !== 'scheduled') {
    return { ok: false, reason: 'not_scheduled' };
  }
  if (booking.startsAt < nowIso) {
    return { ok: false, reason: 'window_expired' };
  }
  return { ok: true, action: 'cancel' };
}

export function canCancelBookingAsParent(
  booking: Pick<Booking, 'requestedBy' | 'status' | 'startsAt'>,
  nowIso: string
): boolean {
  const decision = evaluateParentBookingCancel(booking, nowIso);
  return decision.ok && decision.action === 'cancel';
}

export function parentCancelDeniedMessage(
  reason: Extract<ParentCancelDecision, { ok: false }>['reason']
): string {
  if (reason === 'window_expired') return '취소 가능 시간이 지났습니다.';
  if (reason === 'not_customer_request') return '고객 신청 예약만 취소할 수 있습니다.';
  return '취소할 수 없는 예약 상태입니다.';
}
