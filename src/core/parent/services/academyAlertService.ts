/**
 * @deprecated 신규 코드는 '@/capabilities/attendance', '@/capabilities/billing',
 * '@/capabilities/booking', '@/capabilities/scheduling'의 알림 모듈을 직접 사용한다.
 * 결석 알림 정책은 shouldNotifyParentAbsence 및 eventKey 정책을 기반으로 작동합니다.
 */
export { publishParentAlert, type PublishParentAlertParams } from './parentAlertInfrastructure';
export { notifyParentAbsence, type NotifyParentAbsenceParams } from '@/capabilities/attendance';
export { notifyParentMakeupScheduled } from '@/capabilities/scheduling';
export { notifyParentTuitionUnpaid, type NotifyParentTuitionUnpaidParams } from '@/capabilities/billing';
export {
  notifyBookingChange,
  notifySkinBookingChange,
  notifyParentPracticeRoomBooked,
  notifyParentPracticeReviewed,
  type NotifyBookingChangeParams,
  type NotifyParentPracticeReviewedParams,
} from '@/capabilities/booking';
