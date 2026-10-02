import { createNotificationsStorage } from '@/services/storage/notificationsStorage';
import { getOrganizationId } from '@/services/adapters/storageContext';
import { dispatchAppPush } from '@/core/push';
import type { MakeupItem, NotificationType, PracticeRoomBooking } from '@/types';
import { absenceEventKey, shouldNotifyParentAbsence } from './absenceNotifyPolicy';

const notifications = createNotificationsStorage();

function publishParentAlert(params: {
  type: Extract<
    NotificationType,
    'absence' | 'makeup' | 'tuition_unpaid' | 'practice' | 'announcement'
  >;
  title: string;
  message: string;
  student: {
    id: string;
    name: string;
    parentPhone?: string;
  };
  scheduledDate?: string;
  portalTab?: string;
}): void {
  notifications.saveNotification({
    type: params.type,
    title: params.title,
    message: params.message,
    targetStudentId: params.student.id,
    targetStudentName: params.student.name,
    targetParentPhone: params.student.parentPhone,
    targetGroup: `student:${params.student.id}`,
    recipientCount: 1,
    scheduledDate: params.scheduledDate,
    status: 'sent',
    sentAt: new Date().toISOString(),
  });

  const organizationId = getOrganizationId() || undefined;
  void dispatchAppPush({
    title: params.title,
    body: params.message,
    organizationId,
    studentId: params.student.id,
    portalTab: params.portalTab || 'notices',
    type: params.type,
  });
}

/** 결석 시 학부모 포털 알림 + 앱 푸시. non-absent→absent·당일만, 동일 이벤트 1회. */
export function notifyParentAbsence(params: {
  studentId: string;
  studentName: string;
  parentPhone?: string;
  className: string;
  classId?: string;
  date: string;
  reason?: string;
  previousStatus?: string | null;
}): boolean {
  if (
    !shouldNotifyParentAbsence({
      previousStatus: params.previousStatus,
      nextStatus: 'absent',
      date: params.date,
    })
  ) {
    return false;
  }

  const eventKey = absenceEventKey({
    studentId: params.studentId,
    date: params.date,
    classId: params.classId,
  });
  const alreadySent = notifications
    .getNotifications()
    .some((n) => n.type === 'absence' && n.eventKey === eventKey);
  if (alreadySent) return false;

  const reason = params.reason ? ` (${params.reason})` : '';
  notifications.saveNotification({
    type: 'absence',
    title: '결석 안내',
    message: `${params.studentName} 원생이 ${params.date} ${params.className} 수업에 결석 처리되었습니다.${reason}`,
    targetStudentId: params.studentId,
    targetStudentName: params.studentName,
    targetParentPhone: params.parentPhone,
    targetGroup: `student:${params.studentId}`,
    recipientCount: 1,
    scheduledDate: params.date,
    eventKey,
    status: 'sent',
    sentAt: new Date().toISOString(),
  });

  const organizationId = getOrganizationId() || undefined;
  void dispatchAppPush({
    title: '결석 안내',
    body: `${params.studentName} 원생이 ${params.date} ${params.className} 수업에 결석 처리되었습니다.${reason}`,
    organizationId,
    studentId: params.studentId,
    portalTab: 'attendance',
    type: 'absence',
  });
  return true;
}

/** 보강 일정 등록 시 학부모 포털 알림 + 앱 푸시 */
export function notifyParentMakeupScheduled(item: MakeupItem): void {
  if (!item.makeUpDate) return;
  const slot =
    item.makeUpStartTime && item.makeUpEndTime
      ? ` ${item.makeUpStartTime}–${item.makeUpEndTime}`
      : '';
  const room = item.makeUpRoom ? ` · ${item.makeUpRoom}` : '';
  const teacher = item.makeUpTeacherName ? ` · ${item.makeUpTeacherName}` : '';

  publishParentAlert({
    type: 'makeup',
    title: '보강 일정 안내',
    message: `${item.studentName} 원생 보강이 ${item.makeUpDate}${slot}${room}${teacher}에 예약되었습니다. (결석일 ${item.originalDate})`,
    student: {
      id: item.studentId,
      name: item.studentName,
      parentPhone: item.parentPhone,
    },
    scheduledDate: item.makeUpDate,
    portalTab: 'attendance',
  });
}

/** 미납 청구 시 학부모 포털 알림 + 앱 푸시 */
export function notifyParentTuitionUnpaid(params: {
  studentId: string;
  studentName: string;
  parentPhone?: string;
  yearMonth: string;
  amount: number;
  dueDate: string;
}): void {
  publishParentAlert({
    type: 'tuition_unpaid',
    title: '수강료 미납 안내',
    message: `${params.studentName} 원생 ${params.yearMonth} 수강료 ₩${params.amount.toLocaleString()}원이 미납입니다. (납기 ${params.dueDate})`,
    student: {
      id: params.studentId,
      name: params.studentName,
      parentPhone: params.parentPhone,
    },
    scheduledDate: params.dueDate,
    portalTab: 'tuition',
  });
}

/** 가정 연습 일지 스태프 확인 시 학부모 알림 + 앱 푸시 */
export function notifyParentPracticeReviewed(params: {
  studentId: string;
  studentName: string;
  parentPhone?: string;
  date: string;
  songTitle: string;
}): void {
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

/** 예약 확정·변경·취소·완료·노쇼 안내 */
export function notifyBookingChange(params: {
  studentId: string;
  studentName: string;
  parentPhone?: string;
  title: string;
  message: string;
  date?: string;
  portalTab?: string;
}): void {
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
