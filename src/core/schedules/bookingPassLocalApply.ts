/**
 * offline/local 예약+이용권 전이.
 * refund/consume 실패 시 booking을 성공 상태로 바꾸지 않는다.
 */
import type { Booking, BookingStatus } from '@/core/types/schedule';
import { planBookingPassTransition } from './bookingStatusTransition';

export type LocalBookingPassOps = {
  consume: (customerId: string) => string | null;
  refund: (passId: string) => boolean;
  hasEntitlement: (customerId: string) => boolean;
};

export function applyLocalBookingPassChange(
  existing: Booking,
  status: BookingStatus,
  ops: LocalBookingPassOps,
  options?: { consumeOnNoShow?: boolean }
): Booking | null {
  const plan = planBookingPassTransition(existing, status, options);
  let sessionPassId = existing.sessionPassId;

  if (plan.action === 'consume') {
    const consumed = ops.consume(existing.customerId);
    if (!consumed && ops.hasEntitlement(existing.customerId)) {
      return null;
    }
    sessionPassId = consumed ?? undefined;
  } else if (plan.action === 'refund') {
    if (!ops.refund(plan.sessionPassId)) {
      return null;
    }
    sessionPassId = undefined;
  } else {
    sessionPassId = plan.sessionPassId;
  }

  return { ...existing, status, sessionPassId };
}
