import {
  SLOT_RESERVATION_CONFIRMED_STATUSES,
  SLOT_RESERVATION_HOLDING_STATUSES,
} from '@/core/schedules/domainRoles';

/** 업종 무관 정원 스냅샷. 특정 Schedule/업종 구현에 종속하지 않는다. */
export type CapacitySnapshot = {
  capacity: number;
  booked: number;
  available: number;
  isFull: boolean;
};

/** 슬롯 점유. schedules.status가 아니라 core.reservations.status. */
export const RESERVATION_HOLDING_STATUSES = SLOT_RESERVATION_HOLDING_STATUSES;

/** 확정만 세는 조회용 상태. list_bookable_schedules available_slots와 동일. */
export const RESERVATION_CONFIRMED_STATUSES = SLOT_RESERVATION_CONFIRMED_STATUSES;

/** @deprecated 이름 호환. 실제 값은 Reservation 점유 상태. */
export const SCHEDULE_HOLDING_STATUSES = RESERVATION_HOLDING_STATUSES;

/** @deprecated 이름 호환. RESERVATION_CONFIRMED_STATUSES 사용. */
export const SCHEDULE_CONFIRMED_STATUSES = RESERVATION_CONFIRMED_STATUSES;

export type ScheduleHoldingStatus = (typeof RESERVATION_HOLDING_STATUSES)[number];
export type ReservationHoldingStatus = ScheduleHoldingStatus;
