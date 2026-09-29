import type { Booking, BookingStatus } from '@/core/types/schedule';

export type BookingStatusTransitionOptions = {
  /** 필라테스: no_show도 이용권 차감 */
  consumeOnNoShow?: boolean;
};

/** 이번 상태 전이가 이용권 차감 구간인지 */
export function isSessionPassDeductingStatus(
  status: BookingStatus,
  options?: BookingStatusTransitionOptions
): boolean {
  return (
    status === 'completed' ||
    (options?.consumeOnNoShow === true && status === 'no_show')
  );
}

/** 기존 예약이 이미 차감 구간인지 (no_show는 sessionPassId 있을 때만) */
export function wasSessionPassDeducting(booking: Booking): boolean {
  return (
    booking.status === 'completed' ||
    (booking.status === 'no_show' && Boolean(booking.sessionPassId))
  );
}

export type BookingPassPlan =
  | { action: 'none'; sessionPassId: string | undefined }
  | { action: 'consume'; sessionPassId: string | undefined }
  | { action: 'refund'; sessionPassId: string }
  | { action: 'keep'; sessionPassId: string | undefined };

/**
 * 예약 상태 변경 시 이용권 차감/복구 계획.
 * 실제 consume/refund는 Domain Service가 persistence에 적용한다.
 */
export function planBookingPassTransition(
  existing: Booking,
  nextStatus: BookingStatus,
  options?: BookingStatusTransitionOptions
): BookingPassPlan {
  const deducting = isSessionPassDeductingStatus(nextStatus, options);
  const wasDeducting = wasSessionPassDeducting(existing);
  let sessionPassId = existing.sessionPassId;

  if (deducting && !wasDeducting && !sessionPassId) {
    return { action: 'consume', sessionPassId: undefined };
  }

  if (wasDeducting && !deducting && existing.sessionPassId) {
    return { action: 'refund', sessionPassId: existing.sessionPassId };
  }

  if (deducting && wasDeducting) {
    return { action: 'keep', sessionPassId };
  }

  return { action: 'none', sessionPassId };
}
