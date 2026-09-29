import type {
  AttendanceRecord,
  AcademyEvent,
  Expense,
  LessonRecord,
  PerformanceVideo,
  PracticeRecord,
  Song,
  Student,
  Textbook,
  TextbookInventoryTransaction,
  TextbookPayment,
  TextbookSale,
} from '../../../../types';
import type {
  Json,
  PaymentMethod as DbPaymentMethod,
  PianoAttendanceStatus,
  PianoInventoryTransactionType,
  PianoTextbookPaymentStatus,
} from '../../../../lib/supabase/database.types';


// ─── Expenses ─────────────────────────────────────────────────────

const APP_TO_DB_PAYMENT_EXPENSE: Record<string, DbPaymentMethod> = {
  card: 'card',
  transfer: 'transfer',
  cash: 'cash',
  other: 'other',
};

const DB_TO_APP_PAYMENT_EXPENSE: Record<string, Expense['paymentMethod']> = {
  card: 'card',
  transfer: 'transfer',
  cash: 'cash',
  other: 'other',
  online: 'other',
};

export function expenseToPianoRow(expense: Expense, organizationId: string) {
  return {
    id: expense.id,
    organization_id: organizationId,
    expense_date: expense.date,
    category: expense.category,
    amount: expense.amount,
    payment_method: APP_TO_DB_PAYMENT_EXPENSE[expense.paymentMethod] || 'cash',
    description: expense.description,
    recipient: expense.recipient || null,
    vendor: expense.vendor || null,
    memo: expense.memo || null,
    receipt_memo: expense.receiptMemo || null,
    metadata: {} as Json,
  };
}

export function pianoRowToExpense(row: {
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
}): Expense {
  return {
    id: row.id,
    date: row.expense_date,
    category: row.category as Expense['category'],
    amount: Number(row.amount),
    paymentMethod: DB_TO_APP_PAYMENT_EXPENSE[row.payment_method] || 'cash',
    description: row.description,
    recipient: row.recipient || undefined,
    vendor: row.vendor || undefined,
    memo: row.memo || undefined,
    receiptMemo: row.receipt_memo || undefined,
  };
}

