/**
 * Piano Schedule UI
 *
 * Core / Piano 경계:
 * - Core(`src/core/schedules`): Schedule 슬롯, Availability 인프라, Reservation RPC
 * - Piano(여기): 반복 수업 시간표·학원 캘린더 등 원장 일정 UX
 * - 상담 Availability/Reservation은 Core 인프라를 쓰고, 라벨·진입점은 Piano 상담 IA에 둔다
 */
export { PianoScheduleView } from './PianoScheduleView';
