import { todayIsoLocal } from '@/shared/utils/localDate';
import { attendanceClassKey } from '@/core/attendance/attendanceClassKey';

export type AbsenceNotifyInput = {
  previousStatus?: string | null;
  nextStatus: string;
  date: string;
  today?: string;
};

/** non-absent → absent 이고, 당일 출결일 때만 자동 결석 알림 */
export function shouldNotifyParentAbsence(params: AbsenceNotifyInput): boolean {
  if (params.nextStatus !== 'absent') return false;
  if ((params.previousStatus || '') === 'absent') return false;
  const today = params.today || todayIsoLocal();
  return params.date === today;
}

export function absenceEventKey(params: {
  studentId: string;
  date: string;
  classId?: string | null;
}): string {
  return `absence:${params.studentId}:${params.date}:${attendanceClassKey(params.classId)}`;
}
