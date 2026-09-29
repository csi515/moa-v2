import type { Expense, LessonRecord, Teacher } from '@/types';
import type { TeacherPayrollSettlement } from './settlements';
import { countLessonsForTeacher, computePayrollAmount, resolveTeacherPayType } from './calc';
import { payTypeUsesUnitRate } from './labels';
import type { PayrollAdjustmentDraft, PayrollSettlementStatus, TeacherPayrollRow } from './types';

function findSettledExpense(
  expenses: Expense[],
  teacherId: string,
  yearMonth: string
): Expense | undefined {
  return expenses.find(
    (e) =>
      e.settlementKind === 'teacher_payroll' &&
      e.teacherId === teacherId &&
      e.settlementYearMonth === yearMonth
  );
}

function findSettlement(
  settlements: TeacherPayrollSettlement[],
  teacherId: string,
  yearMonth: string
): TeacherPayrollSettlement | undefined {
  return settlements.find((s) => s.teacherId === teacherId && s.yearMonth === yearMonth);
}

function resolveQuantity(params: {
  payType: TeacherPayrollRow['payType'];
  lessonCount: number;
  settlement?: TeacherPayrollSettlement;
  expense?: Expense;
  quantityOverride?: number;
}): number {
  if (params.settlement) return params.settlement.quantity;
  if (params.expense?.settlementQuantity != null) return params.expense.settlementQuantity;
  if (params.quantityOverride != null) return params.quantityOverride;
  if (params.payType === 'hourly') return params.lessonCount;
  if (params.payType === 'monthly') return 1;
  return 0;
}

function resolveRate(params: {
  payType: TeacherPayrollRow['payType'];
  teacher: Teacher;
  settlement?: TeacherPayrollSettlement;
  expense?: Expense;
}): number {
  if (payTypeUsesUnitRate(params.payType)) {
    return params.teacher.hourlyRate || params.settlement?.rate || params.expense?.settlementRate || 0;
  }
  if (params.payType === 'monthly') {
    return params.teacher.salary || params.settlement?.rate || params.expense?.settlementRate || 0;
  }
  return 0;
}

/** 해당 월 강사별 정산 미리보기 */
export function buildTeacherPayrollRows(params: {
  teachers: Teacher[];
  lessons: LessonRecord[];
  expenses: Expense[];
  settlements: TeacherPayrollSettlement[];
  yearMonth: string;
  quantityOverrides?: Record<string, number>;
  adjustmentOverrides?: Record<string, PayrollAdjustmentDraft>;
  includeInactive?: boolean;
}): TeacherPayrollRow[] {
  const teachers = params.teachers.filter((t) =>
    params.includeInactive ? true : t.status === 'active'
  );

  return teachers
    .map((teacher) => {
      const payType = resolveTeacherPayType(teacher);
      const lessonCount = countLessonsForTeacher(params.lessons, teacher.id, params.yearMonth);
      const settlement = findSettlement(params.settlements, teacher.id, params.yearMonth);
      const expense = findSettledExpense(params.expenses, teacher.id, params.yearMonth);
      const requiresManualQuantity = payType === 'attendance' || payType === 'work_hours';

      const quantity = resolveQuantity({
        payType,
        lessonCount,
        settlement,
        expense,
        quantityOverride: params.quantityOverrides?.[teacher.id],
      });

      const rate = resolveRate({ payType, teacher, settlement, expense });
      const calculatedAmount =
        expense?.settlementCalculatedAmount ??
        settlement?.calculatedAmount ??
        computePayrollAmount({
          payType,
          quantity,
          hourlyRate: teacher.hourlyRate,
          salary: teacher.salary,
        });

      const adjustmentOverride = params.adjustmentOverrides?.[teacher.id];
      const adjustmentAmount =
        expense?.settlementAdjustmentAmount ??
        settlement?.adjustmentAmount ??
        adjustmentOverride?.amount ??
        0;
      const adjustmentReason =
        expense?.settlementAdjustmentReason ??
        settlement?.adjustmentReason ??
        adjustmentOverride?.reason;

      const finalAmount = expense
        ? expense.amount
        : settlement
          ? settlement.finalAmount
          : Math.max(0, calculatedAmount + adjustmentAmount);

      let settlementStatus: PayrollSettlementStatus = 'pending';
      if (expense) settlementStatus = 'expensed';
      else if (settlement) settlementStatus = 'confirmed';

      return {
        teacherId: teacher.id,
        teacherName: teacher.name,
        status: teacher.status,
        payType,
        quantity,
        lessonCount,
        rate: settlement?.rate ?? expense?.settlementRate ?? rate,
        calculatedAmount,
        adjustmentAmount,
        adjustmentReason,
        finalAmount,
        settlementStatus,
        settlementId: settlement?.id,
        settledExpenseId: expense?.id,
        settledAmount: expense?.amount,
        requiresManualQuantity,
      };
    })
    .sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'ko'));
}
