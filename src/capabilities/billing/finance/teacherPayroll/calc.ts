import type { LessonRecord, Teacher, TeacherPayType } from '@/types';
import { payTypeUsesUnitRate } from './labels';
import type { TeacherPayrollRow, TeacherPayrollTotals } from './types';

const KNOWN_PAY_TYPES: TeacherPayType[] = [
  'hourly',
  'attendance',
  'work_hours',
  'monthly',
  'none',
];

/** 정산 방식 추론 */
export function resolveTeacherPayType(
  teacher: Pick<Teacher, 'payType' | 'hourlyRate' | 'salary'>
): TeacherPayType {
  if (teacher.payType && KNOWN_PAY_TYPES.includes(teacher.payType)) {
    return teacher.payType;
  }
  if ((teacher.hourlyRate || 0) > 0) return 'hourly';
  if ((teacher.salary || 0) > 0) return 'monthly';
  return 'none';
}

export function countLessonsForTeacher(
  lessons: LessonRecord[],
  teacherId: string,
  yearMonth: string
): number {
  return lessons.filter(
    (l) => l.teacherId === teacherId && l.date.startsWith(yearMonth)
  ).length;
}

export function computePayrollAmount(params: {
  payType: TeacherPayType;
  quantity: number;
  hourlyRate?: number;
  salary?: number;
}): number {
  if (payTypeUsesUnitRate(params.payType)) {
    return Math.max(0, Math.round((params.hourlyRate || 0) * params.quantity));
  }
  if (params.payType === 'monthly') {
    return Math.max(0, Math.round(params.salary || 0));
  }
  return 0;
}

/** 상세 편집 중 계산 금액 */
export function resolveDraftCalculated(
  row: Pick<TeacherPayrollRow, 'payType' | 'rate'>,
  draftQuantity: number
): number {
  if (row.payType === 'monthly') return Math.max(0, Math.round(row.rate));
  if (row.payType === 'none') return 0;
  return Math.max(0, Math.round(row.rate * draftQuantity));
}

/** 확정 전 실적 수량 결정 */
export function resolveEditableQuantity(
  row: TeacherPayrollRow,
  quantityOverride?: number
): number {
  if (quantityOverride != null) return quantityOverride;
  if (row.payType === 'hourly') return row.lessonCount;
  if (row.payType === 'monthly') return 1;
  return row.quantity;
}

export function summarizePayrollRows(rows: TeacherPayrollRow[]): TeacherPayrollTotals {
  const pending = rows.filter((r) => r.settlementStatus === 'pending' && r.finalAmount > 0);
  const settled = rows.filter(
    (r) => r.settlementStatus === 'confirmed' || r.settlementStatus === 'expensed'
  );
  const byType = rows.reduce<Record<string, number>>((acc, r) => {
    if (r.payType === 'none') return acc;
    acc[r.payType] = (acc[r.payType] || 0) + r.quantity;
    return acc;
  }, {});

  return {
    teacherCount: rows.length,
    pendingAmount: pending.reduce((s, r) => s + r.finalAmount, 0),
    pendingCount: pending.length,
    settledAmount: settled.reduce((s, r) => s + r.finalAmount, 0),
    settledCount: settled.length,
    lessonTotal: byType.hourly || 0,
    attendanceTotal: byType.attendance || 0,
    workHoursTotal: byType.work_hours || 0,
  };
}

export function formatPerformanceSummary(totals: TeacherPayrollTotals): {
  primary: string;
  detail?: string;
} {
  const parts = [
    totals.lessonTotal > 0 ? `수업 ${totals.lessonTotal}` : null,
    totals.attendanceTotal > 0 ? `출근 ${totals.attendanceTotal}` : null,
    totals.workHoursTotal > 0 ? `근무 ${totals.workHoursTotal}h` : null,
  ].filter(Boolean) as string[];

  const primary =
    totals.lessonTotal > 0
      ? `수업 ${totals.lessonTotal}회`
      : totals.attendanceTotal > 0
        ? `출근 ${totals.attendanceTotal}회`
        : totals.workHoursTotal > 0
          ? `${totals.workHoursTotal}시간`
          : '-';

  return { primary, detail: parts.join(' · ') || undefined };
}
