import { StorageService } from '@/services/storage';
import { saveAttendanceWithPass } from '@/core/schedules/attendancePassAtomic';
import {
  DAY_ATTENDANCE_CLASS_ID,
  DAY_ATTENDANCE_CLASS_NAME,
} from '@/capabilities/attendance';
import { isDayAttendanceClassId } from '@/capabilities/attendance';
import { todayIsoLocal } from '@/shared/utils/localDate';

/**
 * PIN 체크인 성공 시 등원(c-default) AttendanceRecord를 동기화.
 * 온라인은 update_attendance_status_with_pass 원자 경로.
 */
export async function syncDayAttendanceFromPinCheckIn(customerId: string): Promise<{
  warning?: string;
}> {
  const student = StorageService.getStudents().find((s) => s.id === customerId);
  if (!student) return {};

  const date = todayIsoLocal();
  const existing = StorageService.getAttendance().find(
    (r) =>
      r.date === date &&
      r.studentId === customerId &&
      isDayAttendanceClassId(r.classId)
  );

  if (existing && (existing.status === 'present' || existing.status === 'late')) {
    return {};
  }

  const result = await saveAttendanceWithPass({
    student,
    nextStatus: 'present',
    previous: existing || null,
    date,
    classId: DAY_ATTENDANCE_CLASS_ID,
    className: DAY_ATTENDANCE_CLASS_NAME,
    createdBy: 'PIN',
  });

  return { warning: result.ok ? undefined : result.warning };
}
