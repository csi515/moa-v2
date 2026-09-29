/**
 * Schedule / Reservation·Booking / Session / Attendance 책임 경계.
 *
 * - Schedule: 예약 가능한 시간 또는 운영 슬롯
 * - Reservation/Booking: 고객이 예약한 행위
 * - Session: 실제 이용 또는 방문 사실
 * - Attendance: 출석/체크인 상태
 *
 * 새 Booking/Session 테이블을 만들지 않는다.
 * 같은 의미를 여러 status 컬럼에 미러하지 않는다.
 */

export const DOMAIN_MODELS = ['schedule', 'reservation', 'session', 'attendance'] as const;
export type DomainModel = (typeof DOMAIN_MODELS)[number];

export type DomainLedger = {
  model: DomainModel;
  table: string;
  statusField: string;
  owns: string;
  doesNotOwn: readonly string[];
};

/** 예약 가능 시간·운영 슬롯. 고객 신청 상태는 갖지 않는다. */
export const SCHEDULE_LEDGER: DomainLedger = {
  model: 'schedule',
  table: 'core.schedules',
  statusField: 'status',
  owns: 'bookable_or_operating_slot',
  doesNotOwn: ['customer_booking_act', 'visit_fact', 'check_in_state', 'class_attendance'],
};

/** bookable 슬롯에 대한 고객 예약 행위. */
export const RESERVATION_LEDGER: DomainLedger = {
  model: 'reservation',
  table: 'core.reservations',
  statusField: 'status',
  owns: 'customer_booking_act_on_slot',
  doesNotOwn: ['slot_time', 'visit_fact', 'check_in_state', 'class_attendance'],
};

/**
 * 필라테스/피부 Booking.
 * 새 테이블이 아니라 customer가 배정된 schedules 행을 예약 행위로 재사용한다.
 */
export const APPOINTMENT_BOOKING_LEDGER: DomainLedger = {
  model: 'reservation',
  table: 'core.schedules',
  statusField: 'status',
  owns: 'customer_assigned_appointment',
  doesNotOwn: ['slot_occupancy_for_bookable', 'visit_fact', 'check_in_state'],
};

/** 연습실 등 자원 점유. Schedule Reservation과 별도 원장. */
export const RESOURCE_RESERVATION_LEDGER: DomainLedger = {
  model: 'reservation',
  table: 'core.room_reservations',
  statusField: 'status',
  owns: 'resource_hold',
  doesNotOwn: ['schedule_slot', 'visit_fact', 'check_in_state'],
};

/** 실제 이용/방문 사실. 예약·출석 상태를 복사하지 않는다. */
export const SESSION_LEDGER: DomainLedger = {
  model: 'session',
  table: 'core.customer_sessions',
  statusField: 'status',
  owns: 'actual_visit_or_use',
  doesNotOwn: ['booking_status', 'check_in_state', 'class_attendance', 'session_pass_count'],
};

/** PIN 등원/체크인. Session(방문 세션)이 아니다. */
export const ATTENDANCE_CHECK_IN_LEDGER: DomainLedger = {
  model: 'attendance',
  table: 'core.attendance_sessions',
  statusField: 'check_in_at',
  owns: 'pin_check_in_state',
  doesNotOwn: ['class_attendance', 'booking_status', 'visit_session_status'],
};

export const CORE_DOMAIN_LEDGERS = [
  SCHEDULE_LEDGER,
  RESERVATION_LEDGER,
  APPOINTMENT_BOOKING_LEDGER,
  RESOURCE_RESERVATION_LEDGER,
  SESSION_LEDGER,
  ATTENDANCE_CHECK_IN_LEDGER,
] as const;

/** 슬롯 점유에 쓰는 예약 상태. schedules.status가 아니다. */
export const SLOT_RESERVATION_HOLDING_STATUSES = ['requested', 'confirmed'] as const;
export const SLOT_RESERVATION_CONFIRMED_STATUSES = ['confirmed'] as const;

/** 횟수권. Session(방문 사실)이 아니다. */
export const SESSION_PASS_TABLE = 'core.session_passes';

export function isBookableScheduleSlot(schedule: { is_bookable?: boolean }): boolean {
  return schedule.is_bookable === true;
}

export function isAppointmentBookingRow(schedule: {
  is_bookable?: boolean;
  customer_id?: string | null;
  customerId?: string | null;
}): boolean {
  if (isBookableScheduleSlot(schedule)) return false;
  return Boolean(schedule.customer_id || schedule.customerId);
}

/** bookable 슬롯의 고객 예약 상태는 reservations. 배정 일정은 schedules. */
export function bookingActLedger(schedule: {
  is_bookable?: boolean;
  customer_id?: string | null;
  customerId?: string | null;
}): 'core.reservations' | 'core.schedules' {
  return isBookableScheduleSlot(schedule) ? 'core.reservations' : 'core.schedules';
}

export function isAttendanceCheckedIn(row: {
  checkInAt?: string | null;
  check_in_at?: string | null;
}): boolean {
  return Boolean(row.checkInAt || row.check_in_at);
}

/** 상태를 다른 모델 테이블에 복사하지 않는다. */
export function shouldMirrorStatusAcrossLedgers(): false {
  return false;
}
