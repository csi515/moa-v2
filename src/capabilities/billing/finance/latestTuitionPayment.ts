/**
 * 마지막 수납 표시의 source of truth.
 * Invoice.paymentMethod / paidAt / paidDate 스냅샷은 읽지 않는다.
 */
import type { PaymentMethod, TuitionPayment } from '@/types';
import { formatPaymentMethodLabel } from '@/capabilities/billing/finance/paymentMethodLabels';

export type LastTuitionPaymentDisplay = {
  paymentMethod: PaymentMethod;
  paymentDate: string;
  amount: number;
};

/** 양수면 a가 b보다 최신. paymentDate → createdAt → id */
export function compareTuitionPaymentRecency(
  a: Pick<TuitionPayment, 'paymentDate' | 'createdAt' | 'id'>,
  b: Pick<TuitionPayment, 'paymentDate' | 'createdAt' | 'id'>
): number {
  const dateCmp = (a.paymentDate || '').localeCompare(b.paymentDate || '');
  if (dateCmp !== 0) return dateCmp;
  const createdCmp = (a.createdAt || '').localeCompare(b.createdAt || '');
  if (createdCmp !== 0) return createdCmp;
  return (a.id || '').localeCompare(b.id || '');
}

export function getLatestTuitionPaymentForInvoice(
  payments: readonly TuitionPayment[],
  invoiceId: string
): TuitionPayment | null {
  if (!invoiceId) return null;
  let latest: TuitionPayment | null = null;
  for (const payment of payments) {
    if (payment.invoiceId !== invoiceId) continue;
    if (!latest || compareTuitionPaymentRecency(payment, latest) > 0) {
      latest = payment;
    }
  }
  return latest;
}

/** 표시값. Invoice 스냅샷 필드는 인자로 받지 않는다. */
export function resolveLastTuitionPaymentDisplay(
  payments: readonly TuitionPayment[],
  invoiceId: string
): LastTuitionPaymentDisplay | null {
  const latest = getLatestTuitionPaymentForInvoice(payments, invoiceId);
  if (!latest) return null;
  return {
    paymentMethod: latest.paymentMethod,
    paymentDate: latest.paymentDate,
    amount: latest.amount,
  };
}

export function lastTuitionPaymentSummaryText(
  payment: Pick<TuitionPayment, 'paymentMethod' | 'paymentDate'> | null
): string | null {
  if (!payment) return null;
  return `${formatPaymentMethodLabel(payment.paymentMethod)} · ${payment.paymentDate}`;
}
