import type { AttendanceRecord, ClassItem, DayOfWeek, Student, StudentMonthlyBillingSummary } from '@/types';
import { normalizeBillingMode } from '@/types';
import { formatCurrency, getAttendanceBadge, getInvoiceStatusBadge } from '@/utils/formatters';
import type { SessionPass } from '@/core/types/schedule';
import { getPassRemaining } from '@/core/schedules/sessionPassUtils';
import { yearMonthLocal } from '@/shared/utils/localDate';

export function getCurrentYearMonth(): string {
  return yearMonthLocal();
}

export function studentHasWeekday(
  student: Student,
  weekday: DayOfWeek,
  classById: Map<string, ClassItem>
): boolean {
  if (!student.classIds?.length) return false;
  return student.classIds.some((id) => {
    const cls = classById.get(id);
    return Boolean(cls?.daysOfWeek?.includes(weekday));
  });
}

export function getClassLabel(
  student: Student,
  classNameById: Map<string, string>
): string {
  if (!student.classIds?.length) return '미배정';
  const names = student.classIds
    .map((id) => classNameById.get(id))
    .filter(Boolean) as string[];
  if (names.length === 0) return `${student.classIds.length}개 반`;
  if (names.length === 1) return names[0];
  return `${names[0]} 외 ${names.length - 1}`;
}

export type AttendanceSignal = {
  label: string;
  tone: 'ok' | 'warn' | 'muted';
};

/** 오늘 출결 신호 (목록용) */
export function getTodayAttendanceSignal(
  studentId: string,
  todayAttendanceByStudent: Map<string, AttendanceRecord>
): AttendanceSignal {
  const record = todayAttendanceByStudent.get(studentId);
  if (!record) return { label: '미체크', tone: 'muted' };
  const badge = getAttendanceBadge(record.status);
  const tone: AttendanceSignal['tone'] =
    record.status === 'absent' ? 'warn' : record.status === 'present' || record.status === 'make_up' ? 'ok' : 'warn';
  return { label: badge.label, tone };
}

export type BillingSignal = {
  label: string;
  tone: 'ok' | 'warn' | 'muted';
};

/** 이번 달 수납 신호 (목록용) — 월회비+교재 미납 합산 */
export function getMonthBillingSignal(
  summary: StudentMonthlyBillingSummary | undefined
): BillingSignal {
  if (!summary) return { label: '-', tone: 'muted' };
  const unpaid = summary.totalUnpaid || 0;
  if (unpaid > 0) {
    return { label: `미납 ${formatCurrency(unpaid)}`, tone: 'warn' };
  }
  if ((summary.totalBilled || 0) > 0) {
    const statusLabel =
      summary.tuitionStatus === 'overdue'
        ? '연체'
        : getInvoiceStatusBadge(summary.tuitionStatus).label;
    return { label: statusLabel, tone: 'ok' };
  }
  return { label: '청구 없음', tone: 'muted' };
}

export function buildAttendanceByStudentToday(
  records: AttendanceRecord[],
  today: string
): Map<string, AttendanceRecord> {
  const map = new Map<string, AttendanceRecord>();
  for (const record of records) {
    if (record.date !== today) continue;
    const prev = map.get(record.studentId);
    if (!prev || (record.createdAt || '') > (prev.createdAt || '')) {
      map.set(record.studentId, record);
    }
  }
  return map;
}

export function buildBillingByStudent(
  summaries: StudentMonthlyBillingSummary[]
): Map<string, StudentMonthlyBillingSummary> {
  const map = new Map<string, StudentMonthlyBillingSummary>();
  summaries.forEach((s) => map.set(s.studentId, s));
  return map;
}

/** 피아노 목록 — 수강 형태 표시 (일반 / 회차권) */
export function getPianoBillingModeLabel(student: Pick<Student, 'billingMode'>): string {
  return normalizeBillingMode(student.billingMode) === 'session_pass' ? '회차권' : '일반';
}

/**
 * 피아노 목록 — 회차권 컬럼.
 * 등록된 회차권이 없으면 해당 없음, 있으면 남은 N회.
 */
export function getPianoSessionPassColumnLabel(
  studentId: string,
  passes: SessionPass[]
): string {
  const owned = passes.filter(
    (p) => p.customerId === studentId && p.status !== 'cancelled'
  );
  if (owned.length === 0) return '해당 없음';
  const remaining = owned.reduce((sum, p) => sum + getPassRemaining(p), 0);
  return `남은 ${remaining}회`;
}

export const WEEKDAY_FILTER_OPTIONS: DayOfWeek[] = ['월', '화', '수', '목', '금', '토', '일'];
