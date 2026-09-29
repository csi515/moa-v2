import type { Student, TuitionInvoice } from '@/types';
import { filterMonthlyTuitionAutoGenerateStudents } from './monthlyTuitionEligibility';
import { findMonthlyTuitionInvoice } from './monthlyTuitionStatus';

type EnsureStudent = Pick<Student, 'id' | 'billingMode' | 'status' | 'joinDate'>;

/** 선택 월에 유효 청구서가 없는 자동 생성 대상만. 기존 청구서는 포함하지 않는다. */
export function listMonthlyTuitionMissingInvoices<T extends EnsureStudent>(
  students: T[],
  invoices: TuitionInvoice[],
  yearMonth: string,
  asOfYearMonth?: string
): T[] {
  return filterMonthlyTuitionAutoGenerateStudents(students, yearMonth, asOfYearMonth).filter(
    (student) => !findMonthlyTuitionInvoice(invoices, student.id, yearMonth)
  );
}
