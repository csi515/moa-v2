import {
  publishParentAlert,
  getNotificationsStorage,
} from '@/core/parent/services/parentAlertInfrastructure';
import {
  absenceEventKey,
  shouldNotifyParentAbsence,
} from '@/core/parent/services/absenceNotifyPolicy';

export interface NotifyParentAbsenceParams {
  studentId: string;
  studentName: string;
  parentPhone?: string;
  className: string;
  classId?: string;
  date: string;
  reason?: string;
  previousStatus?: string | null;
}

/** 결석 시 학부모 포털 알림 + 앱 푸시. non-absent→absent·당일만, 동일 이벤트 1회. */
export function notifyParentAbsence(params: NotifyParentAbsenceParams): boolean {
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
  const alreadySent = getNotificationsStorage()
    .getNotifications()
    .some((n) => n.type === 'absence' && n.eventKey === eventKey);
  if (alreadySent) return false;

  const reason = params.reason ? ` (${params.reason})` : '';
  publishParentAlert({
    type: 'absence',
    title: '결석 안내',
    message: `${params.studentName} 원생이 ${params.date} ${params.className} 수업에 결석 처리되었습니다.${reason}`,
    student: {
      id: params.studentId,
      name: params.studentName,
      parentPhone: params.parentPhone,
    },
    scheduledDate: params.date,
    eventKey,
    portalTab: 'attendance',
  });
  return true;
}
