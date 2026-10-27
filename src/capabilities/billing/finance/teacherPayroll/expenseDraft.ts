import type { Expense, PaymentMethod, Teacher, TeacherPayType } from '@/types';
import { getIndustryPlugin } from '@/core/industry/pluginHost';
import { isBlankIndustryInput } from '@/core/industry/types';
import { formatPayrollFormula } from './labels';

/** 훅이 없거나 이 플러그인이 원문 id·aliases로 청구하지 않을 때의 정산 지출 카테고리. */
export const DEFAULT_PAYROLL_EXPENSE_CATEGORY = 'salary';

/**
 * 강사 정산 지출 카테고리.
 * 업종 id 분기는 하지 않는다. 플러그인 훅이 값을 낸다.
 * 빈 값은 piano로 바꾸지 않고 기본값을 유지한다.
 * 별칭은 플러그인 매니페스트 aliases에 있는 것만 그 훅을 쓴다.
 */
export function getPayrollExpenseCategory(industry?: string | null): string {
  if (isBlankIndustryInput(industry)) return DEFAULT_PAYROLL_EXPENSE_CATEGORY;
  const raw = String(industry);
  const plugin = getIndustryPlugin(raw);
  const claimed = plugin.id === raw || plugin.aliases?.includes(raw) === true;
  if (!claimed) return DEFAULT_PAYROLL_EXPENSE_CATEGORY;
  return plugin.getPayrollExpenseCategory?.() ?? DEFAULT_PAYROLL_EXPENSE_CATEGORY;
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
