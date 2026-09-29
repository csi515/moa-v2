import type { Expense, PaymentMethod, Teacher, TeacherPayType } from '@/types';
import { formatPayrollFormula } from './labels';

/** 업종별 강사 정산 지출 카테고리 */
export function getPayrollExpenseCategory(industry?: string | null): string {
  if (
    industry === 'pilates' ||
    industry === 'skin_clinic' ||
    industry === 'gym' ||
    industry === 'taekwondo'
  ) {
    return 'instructor_fee';
  }
  if (industry === 'daycare' || industry === 'piano') {
    return 'teacher_salary';
  }
  return 'salary';
}

export function settlementExpenseDate(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);
  const endOfMonth = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
  return today.startsWith(yearMonth) ? today : endOfMonth;
}

export function buildPayrollExpenseDraft(params: {
  teacher: Teacher;
  yearMonth: string;
  amount: number;
  quantity: number;
  rate: number;
  payType: TeacherPayType;
  calculatedAmount: number;
  adjustmentAmount?: number;
  adjustmentReason?: string;
  industry?: string | null;
  paymentMethod?: PaymentMethod;
}): Omit<Expense, 'id'> {
  const detail = formatPayrollFormula({
    payType: params.payType,
    quantity: params.quantity,
    rate: params.rate,
  });

  return {
    date: settlementExpenseDate(params.yearMonth),
    category: getPayrollExpenseCategory(params.industry) as Expense['category'],
    amount: Math.max(0, Math.round(params.amount)),
    paymentMethod: params.paymentMethod || 'transfer',
    description: `${params.yearMonth} 강사 정산 · ${params.teacher.name} (${detail})`,
    recipient: params.teacher.name,
    memo: `teacher_payroll:${params.yearMonth}:${params.teacher.id}`,
    teacherId: params.teacher.id,
    settlementYearMonth: params.yearMonth,
    settlementKind: 'teacher_payroll',
    settlementPayType: params.payType,
    settlementQuantity: params.quantity,
    settlementRate: params.rate,
    settlementCalculatedAmount: params.calculatedAmount,
    settlementAdjustmentAmount: params.adjustmentAmount || 0,
    settlementAdjustmentReason: params.adjustmentReason,
  };
}
