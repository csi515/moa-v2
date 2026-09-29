import { SCHEDULE_HOLDING_STATUSES } from './types';
import type { CapacitySnapshot } from './types';

/** max_capacity 호환. 미지정·비정상 값은 1. */
export function normalizeCapacity(value?: number | null): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

export function normalizeBooked(value?: number | null): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

/**
 * capacity / booked / available / isFull 를 분리한다.
 * closed는 수동 마감. available만 0으로 두고 booked는 유지한다.
 */
export function computeCapacitySnapshot(params: {
  capacity?: number | null;
  booked?: number | null;
  closed?: boolean;
}): CapacitySnapshot {
  const capacity = normalizeCapacity(params.capacity);
  const booked = normalizeBooked(params.booked);
  const available = params.closed ? 0 : Math.max(0, capacity - booked);
  return {
    capacity,
    booked,
    available,
    isFull: available <= 0,
  };
}

/** 초과 수용 방지. seats는 기본 1. */
export function canAccept(snapshot: CapacitySnapshot, seats = 1): boolean {
  const need = Math.max(1, Math.floor(Number(seats) || 1));
  return snapshot.available >= need;
}

export function countHoldingStatuses(
  statuses: readonly string[],
  holding: readonly string[] = SCHEDULE_HOLDING_STATUSES
): number {
  const allowed = new Set(holding);
  return statuses.filter((status) => allowed.has(status)).length;
}

/** Reservation 목록에서 정원 스냅샷을 만든다. */
export function reservationCapacitySnapshot(params: {
  capacity?: number | null;
  statuses: readonly string[];
  holdingStatuses?: readonly string[];
  closed?: boolean;
}): CapacitySnapshot {
  return computeCapacitySnapshot({
    capacity: params.capacity,
    booked: countHoldingStatuses(params.statuses, params.holdingStatuses),
    closed: params.closed,
  });
}
