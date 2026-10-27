import { publishParentAlert } from '@/core/parent/services/parentAlertInfrastructure';
import type { MakeupItem } from '@/capabilities/attendance/domain/types';

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
