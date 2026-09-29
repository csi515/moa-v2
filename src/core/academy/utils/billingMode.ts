import type { Student } from '@/types';
import { normalizeBillingMode, type StudentBillingMode } from '@/core/students/billingMode';

/** 월회비 청구 대상인지 */
export function isMonthlyBillingStudent(student: Pick<Student, 'billingMode'>): boolean {
  return normalizeBillingMode(student.billingMode) === 'monthly';
}

/** 회차권 차감 대상인지 */
export function isSessionPassBillingStudent(student: Pick<Student, 'billingMode'>): boolean {
  return normalizeBillingMode(student.billingMode) === 'session_pass';
}

export function resolveDefaultBillingMode(
  settingsMode?: StudentBillingMode | string | null
): StudentBillingMode {
  return normalizeBillingMode(settingsMode);
}

/** 월회비 대상 학생 필터 */
export function filterMonthlyBillingStudents<T extends Pick<Student, 'billingMode' | 'status'>>(
  students: T[],
  options?: { activeOnly?: boolean }
): T[] {
  return students.filter((s) => {
    if (options?.activeOnly && s.status !== 'active') return false;
    return isMonthlyBillingStudent(s);
  });
}
