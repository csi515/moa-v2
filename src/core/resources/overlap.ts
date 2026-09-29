import { RESOURCE_RESERVATION_BLOCKING_STATUSES } from './types';
import type { ResourceReservationStatus } from './types';

/** DB EXCLUDE와 동일: tstzrange(starts, ends, '[)') */
export function resourceRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function isBlockingReservationStatus(status: ResourceReservationStatus): boolean {
  return (RESOURCE_RESERVATION_BLOCKING_STATUSES as readonly string[]).includes(status);
}

export function resourceReservationsConflict(a: {
  resourceId: string;
  startsAt: string;
  endsAt: string;
  status: ResourceReservationStatus;
}, b: {
  resourceId: string;
  startsAt: string;
  endsAt: string;
  status: ResourceReservationStatus;
}): boolean {
  if (a.resourceId !== b.resourceId) return false;
  if (!isBlockingReservationStatus(a.status) || !isBlockingReservationStatus(b.status)) {
    return false;
  }
  return resourceRangesOverlap(a.startsAt, a.endsAt, b.startsAt, b.endsAt);
}
