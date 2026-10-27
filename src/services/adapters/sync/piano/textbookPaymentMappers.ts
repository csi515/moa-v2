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
import { APP_TO_DB_PAYMENT, DB_TO_APP_PAYMENT } from './shared';

// ─── Textbook Payments ────────────────────────────────────────────

export function paymentToPianoRow(payment: TextbookPayment, organizationId: string) {
  return {
    id: payment.id,
    organization_id: organizationId,
    textbook_sale_id: payment.textbookSaleId,
    payment_date: payment.paymentDate,
    amount: payment.amount,
    payment_method: APP_TO_DB_PAYMENT[payment.paymentMethod] || 'cash',
    memo: payment.memo || null,
    receipt_number: payment.receiptNumber || null,
    metadata: {
      studentId: payment.studentId,
      studentName: payment.studentName,
      textbookTitle: payment.textbookTitle,
    } as Json,
  };
}

export function pianoRowToPayment(row: {
  id: string;
  textbook_sale_id: string;
  payment_date: string;
  amount: number;
  payment_method: DbPaymentMethod;
  memo: string | null;
  receipt_number: string | null;
  metadata: Json;
  created_at: string;
}): TextbookPayment {
  const meta = (row.metadata || {}) as {
    studentId?: string;
    studentName?: string;
    textbookTitle?: string;
  };

  return {
    id: row.id,
    textbookSaleId: row.textbook_sale_id,
    studentId: meta.studentId,
    studentName: meta.studentName,
    textbookTitle: meta.textbookTitle,
    paymentDate: row.payment_date,
    amount: row.amount,
    paymentMethod: (DB_TO_APP_PAYMENT[row.payment_method] || 'cash') as TextbookPayment['paymentMethod'],
    memo: row.memo || undefined,
    receiptNumber: row.receipt_number || undefined,
    createdAt: row.created_at,
  };
}

