import { isMonthlyBillingStudent } from '@/core/academy/utils/billingMode';
import { yearMonthLocal } from '@/shared/utils/localDate';
import type { Student } from '@/types';

type EligibleStudent = Pick<Student, 'billingMode' | 'status' | 'joinDate'>;

function yearMonthOf(date?: string): string {
  return (date || '').slice(0, 7);
}

/** 해당 연월 말일 이후에 입학한 원생 — 그 달 월회비는 발생하지 않음 */
function joinedAfterYearMonth(joinDate: string | undefined, yearMonth: string): boolean {
  const joinedMonth = yearMonthOf(joinDate);
  return Boolean(joinedMonth) && joinedMonth > yearMonth;
}

/**
 * 특정 월의 월회비 자동 생성 대상인지.
 * 재원(`active`) + 월회비만 포함한다. 휴원·퇴원·회차권은 제외한다.
 * 입학일이 선택 월보다 이후면 제외한다.
 *
 * 과거 월은 생성하지 않는다. Student는 현재 status 스냅샷과 joinDate만 있고
 * 월별 재원/휴원/퇴원 이력이 없다. leaveDate는 퇴원 시점에만 채워지고
 * 재원 복귀 시 지워지므로 과거 재원을 복원할 수 없다.
 */
export function isMonthlyTuitionAutoGenerateEligible(
  student: EligibleStudent,
  yearMonth: string,
  asOfYearMonth?: string
): boolean {
  const asOf = asOfYearMonth || yearMonthLocal();
  if (!isMonthlyBillingStudent(student)) return false;
  if (student.status !== 'active') return false;
  if (joinedAfterYearMonth(student.joinDate, yearMonth)) return false;
  if (yearMonth < asOf) return false;
  return true;
}

export function filterMonthlyTuitionAutoGenerateStudents<T extends EligibleStudent>(
  students: T[],
  yearMonth: string,
  asOfYearMonth?: string
): T[] {
  return students.filter((student) =>
    isMonthlyTuitionAutoGenerateEligible(student, yearMonth, asOfYearMonth)
  );
}
