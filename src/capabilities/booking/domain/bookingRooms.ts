import type { Booking } from '@/core/types/schedule';

function toMillis(iso: string): number {
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function overlaps(start: number, end: number, otherStart: number, otherEnd: number): boolean {
  return start < otherEnd && end > otherStart;
}

function isInactive(booking: Booking): boolean {
  return booking.status === 'cancelled' || booking.status === 'no_show' || booking.waitlist === true;
}

/** 고객이 관리사 없이 넣은 확정 전 신청 */
export function isUnassignedCustomerRequest(booking: Booking): boolean {
  return booking.requestedBy === 'customer' && !booking.staffId && booking.status === 'scheduled';
}

/** 같은 강사의 다른 수업 시간 겹침. 같은 수업·같은 시작은 그룹 정원이므로 제외 */
export function findInstructorClassOverlap(params: {
  staffId: string;
  serviceId?: string;
  startsAt: string;
  endsAt: string;
  bookings: Booking[];
  ignoreId?: string;
}): Booking | undefined {
  if (!params.staffId) return undefined;
  const start = toMillis(params.startsAt);
  const end = toMillis(params.endsAt);
  if (!start || !end || end <= start) return undefined;

  return params.bookings.find((booking) => {
    if (booking.staffId !== params.staffId) return false;
    if (params.ignoreId && booking.id === params.ignoreId) return false;
    if (isInactive(booking)) return false;
    if (params.serviceId && booking.serviceId === params.serviceId && booking.startsAt === params.startsAt) {
      return false;
    }
    return overlaps(start, end, toMillis(booking.startsAt), toMillis(booking.endsAt));
  });
}

/** 같은 관리사·겹치는 시간의 활성 예약 */
export function findStaffTimeConflict(params: {
  staffId: string;
  startsAt: string;
  endsAt: string;
  bookings: Booking[];
  ignoreId?: string;
}): Booking | undefined {
  if (!params.staffId) return undefined;
  const start = toMillis(params.startsAt);
  const end = toMillis(params.endsAt);
  if (!start || !end || end <= start) return undefined;

  return params.bookings.find((booking) => {
    if (booking.staffId !== params.staffId) return false;
    if (params.ignoreId && booking.id === params.ignoreId) return false;
    if (isInactive(booking)) return false;
    return overlaps(start, end, toMillis(booking.startsAt), toMillis(booking.endsAt));
  });
}

/** 같은 관리실·겹치는 시간의 활성 예약 */
export function findTreatmentRoomConflict(params: {
  roomId: string;
  startsAt: string;
  endsAt: string;
  bookings: Booking[];
  ignoreId?: string;
}): Booking | undefined {
  if (!params.roomId) return undefined;
  const start = toMillis(params.startsAt);
  const end = toMillis(params.endsAt);
  if (!start || !end || end <= start) return undefined;

  return params.bookings.find((booking) => {
    if (!booking.roomId || booking.roomId !== params.roomId) return false;
    if (params.ignoreId && booking.id === params.ignoreId) return false;
    if (isInactive(booking)) return false;
    return overlaps(start, end, toMillis(booking.startsAt), toMillis(booking.endsAt));
  });
}
