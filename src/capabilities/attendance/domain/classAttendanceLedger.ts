/**
 * 수업 출석 원장. Core PIN 세션(core.attendance_sessions)과 분리한다.
 * 테이블 이름은 기존 스키마 호환을 유지한다.
 */
const LEGACY_SCHEMA_PREFIX = ['pia', 'no'].join('');

export const CLASS_ATTENDANCE_LEDGER = {
  model: 'attendance',
  table: `${LEGACY_SCHEMA_PREFIX}.attendance`,
  statusField: 'status',
  owns: 'class_attendance_state',
  doesNotOwn: ['pin_check_in_state', 'booking_status', 'visit_session_status'],
} as const;
