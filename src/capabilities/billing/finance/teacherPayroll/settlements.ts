import { getItem, setItem, generateEntityId } from '@/services/storage/helpers';
import { STORAGE_KEYS } from '@/services/adapters/storageKeys';
import type { TeacherPayType } from '@/types';

/** 강사 월별 정산 확정 기록 (SoT: core.teacher_payroll_settlements) */
export interface TeacherPayrollSettlement {
  id: string;
  teacherId: string;
  yearMonth: string;
  payType: TeacherPayType;
  quantity: number;
  rate: number;
  calculatedAmount: number;
  adjustmentAmount: number;
  adjustmentReason?: string;
  finalAmount: number;
  confirmedAt: string;
  /** 지출 등록 시 연결 */
  expenseId?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value?: string): boolean {
  return !!value && UUID_RE.test(value);
}

function resolveSettlementId(existingId?: string, inputId?: string): string {
  if (inputId && isUuid(inputId)) return inputId;
  if (existingId && isUuid(existingId)) return existingId;
  return generateEntityId('tps');
}

export function getTeacherPayrollSettlements(): TeacherPayrollSettlement[] {
  return getItem<TeacherPayrollSettlement[]>(STORAGE_KEYS.TEACHER_PAYROLL_SETTLEMENTS, []);
}

export function saveTeacherPayrollSettlement(
  input: Omit<TeacherPayrollSettlement, 'id' | 'confirmedAt'> & {
    id?: string;
    confirmedAt?: string;
  }
): TeacherPayrollSettlement {
  const list = getTeacherPayrollSettlements();
  const existingIdx = list.findIndex(
    (s) =>
      (input.id && s.id === input.id) ||
      (s.teacherId === input.teacherId && s.yearMonth === input.yearMonth)
  );

  const existing = existingIdx >= 0 ? list[existingIdx] : undefined;
  const saved: TeacherPayrollSettlement = {
    id: resolveSettlementId(existing?.id, input.id),
    teacherId: input.teacherId,
    yearMonth: input.yearMonth,
    payType: input.payType,
    quantity: input.quantity,
    rate: input.rate,
    calculatedAmount: input.calculatedAmount,
    adjustmentAmount: input.adjustmentAmount || 0,
    adjustmentReason: input.adjustmentReason,
    finalAmount: Math.max(0, Math.round(input.finalAmount)),
    confirmedAt: input.confirmedAt || existing?.confirmedAt || new Date().toISOString(),
    expenseId:
      input.expenseId ??
      (existing?.expenseId && isUuid(existing.expenseId) ? existing.expenseId : undefined),
  };

  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...saved };
  } else {
    list.unshift(saved);
  }
  setItem(STORAGE_KEYS.TEACHER_PAYROLL_SETTLEMENTS, list);
  return saved;
}

export function linkPayrollSettlementExpense(
  teacherId: string,
  yearMonth: string,
  expenseId: string
): TeacherPayrollSettlement | null {
  const list = getTeacherPayrollSettlements();
  const idx = list.findIndex((s) => s.teacherId === teacherId && s.yearMonth === yearMonth);
  if (idx < 0) return null;
  list[idx] = {
    ...list[idx],
    id: resolveSettlementId(list[idx].id),
    expenseId: isUuid(expenseId) ? expenseId : list[idx].expenseId,
  };
  setItem(STORAGE_KEYS.TEACHER_PAYROLL_SETTLEMENTS, list);
  return list[idx];
}

export function deleteTeacherPayrollSettlement(teacherId: string, yearMonth: string): boolean {
  const list = getTeacherPayrollSettlements();
  const next = list.filter((s) => !(s.teacherId === teacherId && s.yearMonth === yearMonth));
  if (next.length === list.length) return false;
  setItem(STORAGE_KEYS.TEACHER_PAYROLL_SETTLEMENTS, next);
  return true;
}
