import {
  isBlockingReservationStatus,
  resourceRangesOverlap,
} from '@/core/resources/overlap';
import type { ResourceReservationStatus } from '@/core/resources/types';
import { computeCapacitySnapshot } from './capacityMath';
import type { CapacitySnapshot } from './types';

export type ResourceOccupancyReservation = {
  resourceId: string;
  startsAt: string;
  endsAt: string;
  status: ResourceReservationStatus;
};

/** 겹치는 차단 예약 수. EXCLUDE와 같은 [) 구간. */
export function countResourceOccupancy(params: {
  resourceId: string;
  startsAt: string;
  endsAt: string;
  reservations: readonly ResourceOccupancyReservation[];
}): number {
  return params.reservations.filter(
    (row) =>
      row.resourceId === params.resourceId &&
      isBlockingReservationStatus(row.status) &&
      resourceRangesOverlap(row.startsAt, row.endsAt, params.startsAt, params.endsAt)
  ).length;
}

/** Resource.capacity 기준 조언용 스냅샷. EXCLUDE를 느슨하게 만들지 않는다. */
export function resourceCapacitySnapshot(params: {
  capacity?: number | null;
  resourceId: string;
  startsAt: string;
  endsAt: string;
  reservations: readonly ResourceOccupancyReservation[];
}): CapacitySnapshot {
  return computeCapacitySnapshot({
    capacity: params.capacity,
    booked: countResourceOccupancy(params),
  });
}
