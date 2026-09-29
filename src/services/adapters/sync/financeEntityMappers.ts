import type { Json } from '@/lib/supabase/database.types';
import type { FinanceExpense, IncomeEntry } from '@/core/finance/types';
import type { TeacherPayrollSettlement } from '@/core/finance/teacherPayroll/settlements';
import type { Expense, TuitionInvoice, TuitionPayment } from '@/types';

type DbPaymentMethod =
  | 'cash'
  | 'card'
  | 'transfer'
  | 'other'
  | 'online'
  | 'local_currency'
  | 'onsite_card';

const APP_TO_DB_PAYMENT: Record<string, DbPaymentMethod> = {
  cash: 'cash',
  card: 'card',
  transfer: 'transfer',
  other: 'other',
  local_currency: 'local_currency',
  onsite_card: 'onsite_card',
};

const DB_TO_APP_PAYMENT: Record<string, Expense['paymentMethod']> = {
  card: 'card',
  transfer: 'transfer',
  cash: 'cash',
  other: 'other',
  online: 'other',
  local_currency: 'local_currency',
  onsite_card: 'onsite_card',
};

interface ExpenseMetadata {
  teacherId?: string;
  settlementYearMonth?: string;
  settlementKind?: 'teacher_payroll';
  settlementPayType?: string;
  settlementQuantity?: number;
  settlementRate?: number;
  settlementCalculatedAmount?: number;
  settlementAdjustmentAmount?: number;
  settlementAdjustmentReason?: string;
}

export function expenseToCoreRow(expense: FinanceExpense | Expense, organizationId: string) {
  const metadata: ExpenseMetadata = {};
  if (expense.teacherId) metadata.teacherId = expense.teacherId;
  if (expense.settlementYearMonth) metadata.settlementYearMonth = expense.settlementYearMonth;
  if (expense.settlementKind) metadata.settlementKind = expense.settlementKind;
  if (expense.settlementPayType) metadata.settlementPayType = expense.settlementPayType;
  if (expense.settlementQuantity != null) metadata.settlementQuantity = expense.settlementQuantity;
  if (expense.settlementRate != null) metadata.settlementRate = expense.settlementRate;
  if (expense.settlementCalculatedAmount != null) {
    metadata.settlementCalculatedAmount = expense.settlementCalculatedAmount;
  }
  if (expense.settlementAdjustmentAmount != null) {
    metadata.settlementAdjustmentAmount = expense.settlementAdjustmentAmount;
  }
  if (expense.settlementAdjustmentReason) {
    metadata.settlementAdjustmentReason = expense.settlementAdjustmentReason;
  }

  return {
    id: expense.id,
    organization_id: organizationId,
    expense_date: expense.date,
    category: expense.category,
    amount: expense.amount,
    payment_method: APP_TO_DB_PAYMENT[expense.paymentMethod] || 'cash',
    description: expense.description,
    recipient: expense.recipient || null,
    vendor: expense.vendor || null,
    memo: expense.memo || null,
    receipt_memo: expense.receiptMemo || null,
    metadata: metadata as unknown as Json,
  };
}

export function coreRowToExpense(row: {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  payment_method: DbPaymentMethod;
  description: string;
  recipient: string | null;
  vendor: string | null;
  memo: string | null;
  receipt_memo: string | null;
  metadata?: Json;
}): FinanceExpense {
  const meta = (row.metadata || {}) as ExpenseMetadata;
  return {
    id: row.id,
    date: row.expense_date,
    category: row.category,
    amount: Number(row.amount),
    paymentMethod: DB_TO_APP_PAYMENT[row.payment_method] || 'cash',
    description: row.description,
    recipient: row.recipient || undefined,
    vendor: row.vendor || undefined,
    memo: row.memo || undefined,
    receiptMemo: row.receipt_memo || undefined,
    teacherId: meta.teacherId,
    settlementYearMonth: meta.settlementYearMonth,
    settlementKind: meta.settlementKind,
    settlementPayType: meta.settlementPayType as FinanceExpense['settlementPayType'],
    settlementQuantity: meta.settlementQuantity,
    settlementRate: meta.settlementRate,
    settlementCalculatedAmount: meta.settlementCalculatedAmount,
    settlementAdjustmentAmount: meta.settlementAdjustmentAmount,
    settlementAdjustmentReason: meta.settlementAdjustmentReason,
  };
}

export function incomeToCoreRow(entry: IncomeEntry, organizationId: string) {
  return {
    id: entry.id,
    organization_id: organizationId,
    income_date: entry.date,
    category: entry.category,
    amount: entry.amount,
    payment_method: APP_TO_DB_PAYMENT[entry.paymentMethod] || 'cash',
    description: entry.description,
    payer: entry.payer || null,
    memo: entry.memo || null,
    source_type: entry.sourceType || 'manual',
    source_id: entry.sourceId || null,
    metadata: {} as Json,
  };
}

export function coreRowToIncome(row: {
  id: string;
  income_date: string;
  category: string;
  amount: number;
  payment_method: DbPaymentMethod;
  description: string;
  payer: string | null;
  memo: string | null;
  source_type: string;
  source_id: string | null;
}): IncomeEntry {
  return {
    id: row.id,
    date: row.income_date,
    category: row.category,
    amount: Number(row.amount),
    paymentMethod: DB_TO_APP_PAYMENT[row.payment_method] || 'cash',
    description: row.description,
    payer: row.payer || undefined,
    memo: row.memo || undefined,
    sourceType: (row.source_type as IncomeEntry['sourceType']) || 'manual',
    sourceId: row.source_id || undefined,
  };
}

/** 강사 정산 확정 → core.teacher_payroll_settlements */
export function settlementToCoreRow(
  settlement: TeacherPayrollSettlement,
  organizationId: string
) {
  return {
    id: settlement.id,
    organization_id: organizationId,
    teacher_id: settlement.teacherId,
    year_month: settlement.yearMonth,
    pay_type: settlement.payType,
    quantity: settlement.quantity,
    rate: settlement.rate,
    calculated_amount: settlement.calculatedAmount,
    adjustment_amount: settlement.adjustmentAmount || 0,
    adjustment_reason: settlement.adjustmentReason || null,
    final_amount: settlement.finalAmount,
    confirmed_at: settlement.confirmedAt,
    expense_id: isUuid(settlement.expenseId) ? settlement.expenseId! : null,
  };
}

export function coreRowToSettlement(row: {
  id: string;
  teacher_id: string;
  year_month: string;
  pay_type: string;
  quantity: number;
  rate: number;
  calculated_amount: number;
  adjustment_amount: number;
  adjustment_reason: string | null;
  final_amount: number;
  confirmed_at: string;
  expense_id: string | null;
}): TeacherPayrollSettlement {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    yearMonth: row.year_month,
    payType: row.pay_type as TeacherPayrollSettlement['payType'],
    quantity: Number(row.quantity),
    rate: Number(row.rate),
    calculatedAmount: Number(row.calculated_amount),
    adjustmentAmount: Number(row.adjustment_amount) || 0,
    adjustmentReason: row.adjustment_reason || undefined,
    finalAmount: Number(row.final_amount),
    confirmedAt: row.confirmed_at,
    expenseId: row.expense_id || undefined,
  };
}

function isUuid(value?: string | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

/** 수납 원장 → core.payment_transactions */
export function tuitionPaymentToTransactionRow(payment: TuitionPayment, organizationId: string) {
  return {
    id: payment.id,
    organization_id: organizationId,
    payment_id: payment.invoiceId,
    amount: payment.amount,
    payment_method: APP_TO_DB_PAYMENT[payment.paymentMethod] || 'cash',
    paid_at: `${payment.paymentDate}T12:00:00.000Z`,
    receipt_number: payment.receiptNumber || null,
    memo: payment.memo || null,
    cash_receipt_issued: payment.cashReceiptIssued === true,
  };
}

/** core.payment_transactions → 수납 원장 (청구서에서 학생·연월 보강) */
export function transactionRowToTuitionPayment(
  row: {
    id: string;
    payment_id: string;
    amount: number;
    payment_method: DbPaymentMethod;
    paid_at: string;
    receipt_number: string | null;
    memo: string | null;
    cash_receipt_issued?: boolean | null;
    created_at: string;
  },
  invoiceLookup: Map<string, Pick<TuitionInvoice, 'studentId' | 'studentName' | 'yearMonth'>>
): TuitionPayment {
  const inv = invoiceLookup.get(row.payment_id);
  return {
    id: row.id,
    invoiceId: row.payment_id,
    studentId: inv?.studentId || '',
    studentName: inv?.studentName || '',
    yearMonth: inv?.yearMonth || '',
    paymentDate: row.paid_at.slice(0, 10),
    amount: Number(row.amount),
    paymentMethod: (DB_TO_APP_PAYMENT[row.payment_method] ||
      'cash') as TuitionPayment['paymentMethod'],
    memo: row.memo || undefined,
    receiptNumber: row.receipt_number || undefined,
    cashReceiptIssued: row.cash_receipt_issued === true,
    createdAt: row.created_at,
  };
}
