/**
 * 단일 청구서 수납 실행.
 * TuitionManagementView 수납 flow만 사용한다. 화면 필터/통계는 두지 않는다.
 */
import type { PaymentMethod, TuitionInvoice } from '@/types';
import { formatCurrency } from '@/utils/formatters';

export const TUITION_PAYMENT_AMOUNT_REQUIRED_MESSAGE = '납부 금액은 0원보다 커야 합니다.';
export const TUITION_PAYMENT_EXCEEDS_UNPAID_MESSAGE = '미납 금액을 초과할 수 없습니다.';
export const TUITION_PAYMENT_FAILED_MESSAGE = '수납 처리에 실패했습니다.';

export function validateTuitionInvoiceAmount(amount: number, unpaidAmount: number): string | null {
  if (amount <= 0) return TUITION_PAYMENT_AMOUNT_REQUIRED_MESSAGE;
  if (amount > unpaidAmount) return TUITION_PAYMENT_EXCEEDS_UNPAID_MESSAGE;
  return null;
}

export function tuitionInvoicePaymentSuccessMessage(params: {
  studentName: string;
  customerLabel: string;
  amount: number;
}): string {
  return `${params.studentName} ${params.customerLabel} ${formatCurrency(params.amount)} 수납 완료`;
}

export type TuitionInvoicePaymentOutcome =
  | { ok: true; message: string }
  | { ok: false; skipped: true }
  | { ok: false; message: string; toast: 'warning' | 'error' };

export type TuitionInvoicePaymentDeps = {
  busy: { current: boolean };
  invoice: TuitionInvoice | null;
  amount: number;
  method: PaymentMethod;
  memo?: string;
  paymentDate?: string;
  cashReceiptIssued?: boolean;
  customerLabel: string;
  recordPayment: (
    invoiceId: string,
    amount: number,
    method: PaymentMethod,
    notes?: string,
    paymentDate?: string,
    options?: { cashReceiptIssued?: boolean }
  ) => Promise<TuitionInvoice | null>;
};

export async function runTuitionInvoicePayment(
  deps: TuitionInvoicePaymentDeps
): Promise<TuitionInvoicePaymentOutcome> {
  if (deps.busy.current) return { ok: false, skipped: true };
  if (!deps.invoice) {
    return { ok: false, message: TUITION_PAYMENT_FAILED_MESSAGE, toast: 'error' };
  }
  const invalid = validateTuitionInvoiceAmount(deps.amount, deps.invoice.unpaidAmount);
  if (invalid) return { ok: false, message: invalid, toast: 'warning' };

  deps.busy.current = true;
  try {
    const updated = await deps.recordPayment(
      deps.invoice.id,
      deps.amount,
      deps.method,
      deps.memo,
      deps.paymentDate,
      { cashReceiptIssued: deps.cashReceiptIssued }
    );
    if (!updated) {
      return { ok: false, message: TUITION_PAYMENT_FAILED_MESSAGE, toast: 'error' };
    }
    return {
      ok: true,
      message: tuitionInvoicePaymentSuccessMessage({
        studentName: deps.invoice.studentName,
        customerLabel: deps.customerLabel,
        amount: deps.amount,
      }),
    };
  } catch (err: unknown) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : TUITION_PAYMENT_FAILED_MESSAGE,
      toast: 'error',
    };
  } finally {
    deps.busy.current = false;
  }
}
