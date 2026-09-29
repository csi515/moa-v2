import type { TuitionInvoice } from '@/types';

/**
 * 동일 학생·동일 연월 청구서 조회.
 * 발송분이 있으면 우선, 없으면 초안 포함 첫 건.
 */
export function findExistingStudentMonthInvoice(
  invoices: TuitionInvoice[],
  studentId: string,
  yearMonth: string
): TuitionInvoice | undefined {
  const matches = invoices.filter(
    (i) => i.studentId === studentId && i.yearMonth === yearMonth
  );
  if (matches.length === 0) return undefined;
  return matches.find((i) => i.invoiceSent) || matches[0];
}
