/**
 * 통합 수납 선택·금액 규칙.
 * UI 입력값을 결제 request로 바꿀 때만 사용한다.
 */
import type { CombinedPaymentRequest, PaymentMethod } from '@/types';

export type PayableLine = { id: string; unpaidAmount: number };

export function clampPayableAmount(value: number, unpaidAmount: number): number {
  const amount = Number.isFinite(value) ? value : 0;
  return Math.min(Math.max(0, unpaidAmount), Math.max(0, amount));
}

export function unpaidCombinedBillingLines<T extends PayableLine, S extends PayableLine>(params: {
  invoices?: T[];
  textbookSales?: S[];
}): { invoices: T[]; sales: S[] } {
  return {
    invoices: (params.invoices || []).filter((invoice) => invoice.unpaidAmount > 0),
    sales: (params.textbookSales || []).filter((sale) => sale.unpaidAmount > 0),
  };
}

export function sumSelectedPayable(
  items: PayableLine[],
  selectedIds: string[],
  amounts: Record<string, number>
): number {
  return items
    .filter((item) => selectedIds.includes(item.id))
    .reduce((sum, item) => sum + clampPayableAmount(amounts[item.id] ?? 0, item.unpaidAmount), 0);
}

export function selectedPayableLines(
  items: PayableLine[],
  selectedIds: string[],
  amounts: Record<string, number>
): Array<{ id: string; amount: number }> {
  return items
    .filter((item) => selectedIds.includes(item.id))
    .map((item) => ({
      id: item.id,
      amount: clampPayableAmount(amounts[item.id] ?? 0, item.unpaidAmount),
    }))
    .filter((item) => item.amount > 0);
}

export function resolveCombinedPaymentYearMonth(yearMonth?: string): string {
  return yearMonth ?? new Date().toISOString().slice(0, 7);
}

export function buildCombinedPaymentRequest(params: {
  studentId: string;
  yearMonth?: string;
  invoices: PayableLine[];
  sales: PayableLine[];
  selectedInvoiceIds: string[];
  selectedSaleIds: string[];
  invoiceAmounts: Record<string, number>;
  saleAmounts: Record<string, number>;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  memo?: string;
}): CombinedPaymentRequest | null {
  const tuitionPayments = selectedPayableLines(
    params.invoices,
    params.selectedInvoiceIds,
    params.invoiceAmounts
  ).map((item) => ({ invoiceId: item.id, amount: item.amount }));
  const textbookPayments = selectedPayableLines(
    params.sales,
    params.selectedSaleIds,
    params.saleAmounts
  ).map((item) => ({ saleId: item.id, amount: item.amount }));

  if (tuitionPayments.length === 0 && textbookPayments.length === 0) return null;

  return {
    studentId: params.studentId,
    yearMonth: resolveCombinedPaymentYearMonth(params.yearMonth),
    tuitionPayments,
    textbookPayments,
    paymentMethod: params.paymentMethod,
    paymentDate: params.paymentDate,
    memo: params.memo?.trim() || undefined,
  };
}
