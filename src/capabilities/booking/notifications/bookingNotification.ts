import { publishParentAlert } from '@/core/parent/services/parentAlertInfrastructure';
import type { PracticeRoomBooking } from '@/core/resources/types';

export interface NotifyBookingChangeParams {
  studentId: string;
  studentName: string;
  parentPhone?: string;
  title: string;
  message: string;
  date?: string;
  portalTab?: string;
}

/** 예약 확정·변경·취소·완료·노쇼 안내 */
export function notifyBookingChange(params: NotifyBookingChangeParams): void {
  publishParentAlert({
    type: 'announcement',
    title: params.title,
    message: params.message,
    student: {
      id: params.studentId,
      name: params.studentName,
      parentPhone: params.parentPhone,
    },
    scheduledDate: params.date,
    portalTab: params.portalTab || 'bookings',
  });
}

/** @deprecated notifyBookingChange 를 사용한다 */
export const notifySkinBookingChange = notifyBookingChange;

/** 연습실 예약 시 학부모 포털 알림 + 앱 푸시 */
export function notifyParentPracticeRoomBooked(
  booking: Pick<
    PracticeRoomBooking,
    'studentId' | 'studentName' | 'room' | 'date' | 'startTime' | 'endTime'
  >,
  parentPhone?: string
): void {
  publishParentAlert({
    type: 'announcement',
    title: '연습실 예약 안내',
    message: `${booking.studentName} 원생 연습실이 ${booking.date} ${booking.startTime}–${booking.endTime} · ${booking.room}에 예약되었습니다.`,
    student: {
      id: booking.studentId,
      name: booking.studentName,
      parentPhone,
    },
    scheduledDate: booking.date,
    portalTab: 'schedule',
  });
}

export interface NotifyParentPracticeReviewedParams {
  studentId: string;
  studentName: string;
  parentPhone?: string;
  date: string;
  songTitle: string;
}

/** 가정 연습 일지 스태프 확인 시 학부모 알림 + 앱 푸시 */
export function notifyParentPracticeReviewed(params: NotifyParentPracticeReviewedParams): void {
  publishParentAlert({
    type: 'practice',
    title: '연습 일지 확인',
    message: `${params.studentName} 원생 ${params.date} 「${params.songTitle}」 연습 일지를 선생님이 확인했습니다.`,
    student: {
      id: params.studentId,
      name: params.studentName,
      parentPhone: params.parentPhone,
    },
    scheduledDate: params.date,
    portalTab: 'progress',
  });
}
