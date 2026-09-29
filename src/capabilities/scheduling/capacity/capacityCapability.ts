/**
 * 업종 무관 Capacity Capability.
 * 정원 계산을 Schedule/업종 구현에서 분리한다.
 */
import {
  canAccept,
  computeCapacitySnapshot,
  countHoldingStatuses,
  normalizeBooked,
  normalizeCapacity,
  reservationCapacitySnapshot,
} from './capacityMath';
import { countResourceOccupancy, resourceCapacitySnapshot } from './resourceOccupancy';
import { SCHEDULE_CONFIRMED_STATUSES, SCHEDULE_HOLDING_STATUSES } from './types';

export const capacityCapability = {
  holdingStatuses: SCHEDULE_HOLDING_STATUSES,
  confirmedStatuses: SCHEDULE_CONFIRMED_STATUSES,
  snapshot: computeCapacitySnapshot,
  reservationSnapshot: reservationCapacitySnapshot,
  resourceSnapshot: resourceCapacitySnapshot,
  countHolding: countHoldingStatuses,
  countResourceOccupancy,
  normalizeCapacity,
  normalizeBooked,
  canAccept,
} as const;

export type CapacityCapability = typeof capacityCapability;
