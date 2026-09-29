import { isMonthlyBillingStudent } from '@/core/academy/utils/billingMode';
import type { Student, TuitionInvoice } from '@/types';
import { findExistingStudentMonthInvoice } from './invoiceDedupe';

/** 원장 업무용 월회비 납부 판정. 원장 status(partial/overdue)는 유지하고 여기선 묶는다. */
export type MonthlyTuitionWorkStatus = 'paid' | 'unpaid' | 'no_invoice';

type MonthlyBillingStudent = Pick<Student, 'id' | 'billingMode'>;

function isCancelledInvoice(invoice: TuitionInvoice): boolean {
  return invoice.status === 'cancelled';
}

/** 해당 연월 월회비 청구서. 취소 건은 없는 것으로 본다. */
export function findMonthlyTuitionInvoice(
  invoices: TuitionInvoice[],
  studentId: string,
  yearMonth: string
): TuitionInvoice | undefined {
  return findExistingStudentMonthInvoice(
    invoices.filter((invoice) => !isCancelledInvoice(invoice) && invoice.yearMonth === yearMonth),
    studentId,
    yearMonth
  );
}

/**
 * 월회비 대상 원생의 선택 연월 납부 상태.
 * 회차권 학생은 null.
 * 교재·연주회 단독 판매는 보지 않고, 해당 월 TuitionInvoice만 사용한다.
 */
export function resolveMonthlyTuitionWorkStatus(
  student: MonthlyBillingStudent,
  invoices: TuitionInvoice[],
  yearMonth: string
): MonthlyTuitionWorkStatus | null {
  if (!isMonthlyBillingStudent(student)) return null;

  const invoice = findMonthlyTuitionInvoice(invoices, student.id, yearMonth);
  if (!invoice) return 'no_invoice';

  const unpaidAmount = Number(invoice.unpaidAmount);
  if (Number.isFinite(unpaidAmount) && unpaidAmount <= 0) return 'paid';
  return 'unpaid';
}

export type MonthlyTuitionWorkFilter = 'all' | MonthlyTuitionWorkStatus;

export function countMonthlyTuitionWorkStatuses(
  students: MonthlyBillingStudent[],
  invoices: TuitionInvoice[],
  yearMonth: string
): Record<MonthlyTuitionWorkFilter, number> {
  const counts: Record<MonthlyTuitionWorkFilter, number> = {
    all: 0,
    paid: 0,
    unpaid: 0,
    no_invoice: 0,
  };

  for (const student of students) {
    const status = resolveMonthlyTuitionWorkStatus(student, invoices, yearMonth);
    if (status === null) continue;
    counts.all += 1;
    counts[status] += 1;
  }

  return counts;
}

export function filterMonthlyTuitionWorkStudents<
  T extends Pick<Student, 'id' | 'name' | 'billingMode'>,
>(
  students: T[],
  invoices: TuitionInvoice[],
  yearMonth: string,
  options: { statusFilter?: MonthlyTuitionWorkFilter; searchQuery?: string } = {}
): T[] {
  const statusFilter = options.statusFilter ?? 'all';
  const query = options.searchQuery?.trim().toLowerCase() ?? '';

  return students.filter((student) => {
    const status = resolveMonthlyTuitionWorkStatus(student, invoices, yearMonth);
    if (status === null) return false;
    if (statusFilter !== 'all' && status !== statusFilter) return false;
    if (query && !student.name.toLowerCase().includes(query)) return false;
    return true;
  });
}
