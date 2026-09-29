import { sessionPassService } from '@/core/schedules/sessionPassService';
import { isSessionPassBillingStudent } from '@/core/academy/utils/billingMode';
import { planAttendancePassChange } from '@/core/schedules/attendancePassPlan';
import { StorageService } from '@/services/storage';
import type { AttendanceRecord, AttendanceStatus, Student } from '@/types';

/**
 * 회차권 학생 출결 — 로컬/demo 계획.
 * 온라인 production은 saveAttendanceWithPass → update_attendance_status_with_pass.
 */
export function applySessionPassForAttendance(params: {
  student: Student;
  nextStatus: AttendanceStatus;
  previous?: Pick<AttendanceRecord, 'id' | 'status' | 'sessionPassId'> | null;
  date: string;
}): { sessionPassId?: string; warning?: string } {
  if (!isSessionPassBillingStudent(params.student)) {
    return { sessionPassId: undefined };
  }

  const siblings = StorageService.getAttendance()
    .filter((r) => r.studentId === params.student.id && r.date === params.date)
    .map((r) => ({ id: r.id, status: r.status, sessionPassId: r.sessionPassId }));

  const plan = planAttendancePassChange({
    applyPass: true,
    previousStatus: params.previous?.status,
    nextStatus: params.nextStatus,
    previousSessionPassId: params.previous?.sessionPassId,
    previousId: params.previous?.id,
    siblings,
  });

  if (plan.action === 'reuse') {
    return { sessionPassId: plan.sessionPassId };
  }
  if (plan.action === 'consume') {
    const consumed = sessionPassService.consume(params.student.id);
    if (!consumed) {
      return {
        sessionPassId: undefined,
        warning: `${params.student.name} 학생의 회차권이 없거나 잔여 횟수가 없습니다.`,
      };
    }
    return { sessionPassId: consumed };
  }
  if (plan.action === 'refund') {
    const refunded = sessionPassService.refund(plan.sessionPassId);
    if (!refunded) {
      return {
        sessionPassId: params.previous?.sessionPassId,
        warning: `${params.student.name} 학생의 회차권을 복구할 수 없습니다.`,
      };
    }
    return { sessionPassId: undefined };
  }
  if (plan.action === 'keep') {
    return { sessionPassId: undefined };
  }
  return { sessionPassId: plan.sessionPassId };
}
