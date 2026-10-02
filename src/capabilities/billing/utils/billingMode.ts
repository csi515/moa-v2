import {
  normalizeBillingMode,
  isMonthlyBillingStudent,
  isSessionPassBillingStudent,
  resolveDefaultBillingMode,
  type StudentBillingMode,
} from '@/core/students/billingMode';

export {
  normalizeBillingMode,
  isMonthlyBillingStudent,
  isSessionPassBillingStudent,
  resolveDefaultBillingMode,
  type StudentBillingMode,
};

export interface StudentBillingTarget {
  billingMode?: StudentBillingMode | string | null;
  status?: string;
}

/** 월회비 대상 학생 필터 */
export function filterMonthlyBillingStudents<T extends StudentBillingTarget>(
  students: T[],
  options?: { activeOnly?: boolean }
): T[] {
  return students.filter((s) => {
    if (options?.activeOnly && s.status !== 'active') return false;
    return isMonthlyBillingStudent(s);
  });
}
