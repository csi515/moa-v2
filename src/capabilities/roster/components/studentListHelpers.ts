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

export type PassOrMembershipTone = 'ok' | 'warn' | 'muted' | 'indigo';

export type PassOrMembershipSignal = {
  label: string;
  tone: PassOrMembershipTone;
};

/**
 * 피아노 및 세션 컬럼 적용 업종 — 이용권/회원권 통합 신호.
 * - 회차권 원생 (session_pass): 활성 회차권의 잔여 횟수를 합산하여 잔여 N회 / 회차권 없음 / 0회 표시.
 * - 월 정기 원생 (monthly 또는 기본값): 당월 수납 요약을 기반으로 {N}월 정기 (완납/미납/청구없음) 표시.
 */
export function getStudentPassOrMembershipSignal(
  student: Pick<Student, 'id' | 'billingMode'>,
  passes: SessionPass[],
  billingSummary: StudentMonthlyBillingSummary | undefined,
  yearMonth?: string
): PassOrMembershipSignal {
  const isSessionPass = normalizeBillingMode(student.billingMode) === 'session_pass';

  if (isSessionPass) {
    const owned = (passes || []).filter(
      (p) => p.customerId === student.id && p.status !== 'cancelled'
    );
    if (owned.length === 0) {
      return { label: '회차권 없음', tone: 'warn' };
    }
    const remaining = owned.reduce((sum, p) => {
      const rem = getPassRemaining(p);
      return sum + (Number.isFinite(rem) ? rem : 0);
    }, 0);
    if (remaining <= 0) {
      return { label: '0회', tone: 'warn' };
    }
    return { label: `잔여 ${remaining}회`, tone: 'indigo' };
  }

  // 월 정기 원생 (monthly 또는 기본값)
  const ym = yearMonth || getCurrentYearMonth();
  const parsedMonth = parseInt(ym.slice(5, 7), 10);
  const monthNum =
    Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
      ? parsedMonth
      : new Date().getMonth() + 1;

  const unpaid = billingSummary?.totalUnpaid || 0;
  const billed = billingSummary?.totalBilled || 0;

  if (unpaid > 0) {
    return { label: `${monthNum}월 정기 (미납)`, tone: 'warn' };
  }
  if (unpaid === 0 && billed > 0) {
    return { label: `${monthNum}월 정기 (완납)`, tone: 'ok' };
  }
  return { label: `${monthNum}월 정기`, tone: 'muted' };
}

/**
 * 피아노 목록 — 회차권 컬럼 (하위 호환용).
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
  const remaining = owned.reduce((sum, p) => {
    const rem = getPassRemaining(p);
    return sum + (Number.isFinite(rem) ? rem : 0);
  }, 0);
  return `남은 ${remaining}회`;
}

export const WEEKDAY_FILTER_OPTIONS: DayOfWeek[] = ['월', '화', '수', '목', '금', '토', '일'];
