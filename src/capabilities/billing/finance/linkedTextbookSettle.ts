import type { PaymentMethod, TextbookPayment, TextbookSale, TuitionInvoice } from '@/types';
import { STORAGE_KEYS } from '@/services/adapters/storageKeys';
import { getItem, type StorageApi } from '@/services/storage/helpers';

/** 월청구 합산 교재 수납 옵션 — 이중 수입·단독수납 가드 */
export type LinkedTextbookPaymentOptions = {
  skipIncome?: boolean;
  allowLinkedInvoice?: boolean;
};

export function tuitionPaymentMarker(paymentId: string): string {
  return `tuitionPayment:${paymentId}`;
}

export function buildTuitionLinkedTextbookMemo(yearMonth: string, paymentId: string): string {
  return `${yearMonth} 월청구 합산 수납|${tuitionPaymentMarker(paymentId)}`;
}

type RecordTextbookPaymentFn = (
  saleId: string,
  amount: number,
  method?: PaymentMethod,
  date?: string,
  memo?: string,
  options?: LinkedTextbookPaymentOptions
) =>
  | { payment: TextbookPayment; updatedSale: TextbookSale }
  | Promise<{ payment: TextbookPayment; updatedSale: TextbookSale }>;

/** 월청구 완납 시 합산 교재 상태만 정산(수입은 tuition income에만 계상) */
export async function settleLinkedTextbookSalesOnTuitionPaid(params: {
  api: StorageApi;
  invoice: TuitionInvoice;
  paymentId: string;
  method: PaymentMethod;
  paymentDate: string;
}): Promise<void> {
  const saleIds = params.invoice.linkedTextbookSaleIds || [];
  if (saleIds.length === 0) return;

  const sales = getItem<TextbookSale[]>(STORAGE_KEYS.TEXTBOOK_SALES, []);
  const record = params.api.recordTextbookPayment as RecordTextbookPaymentFn;
  const memo = buildTuitionLinkedTextbookMemo(params.invoice.yearMonth, params.paymentId);

  for (const saleId of saleIds) {
    try {
      const sale = sales.find((s) => s.id === saleId);
      if (!sale || sale.unpaidAmount <= 0) continue;
      await Promise.resolve(
        record(saleId, sale.unpaidAmount, params.method, params.paymentDate, memo, {
          skipIncome: true,
          allowLinkedInvoice: true,
        })
      );
    } catch (err) {
      console.error('Failed to settle linked textbook sale:', err);
    }
  }
}

/** 수강료 역분개 시 합산 교재 정산 롤백 */
export async function reverseLinkedTextbookPaymentsForTuition(
  api: StorageApi,
  paymentId: string
): Promise<void> {
  const marker = tuitionPaymentMarker(paymentId);
  const tbPayments = (api.getTextbookPayments as () => TextbookPayment[])();
  const reverse = api.reverseTextbookPayment as (
    id: string
  ) => boolean | Promise<boolean>;

  for (const tbPay of tbPayments.filter((p) => p.memo?.includes(marker))) {
    try {
      await Promise.resolve(reverse(tbPay.id));
    } catch (err) {
      console.error('Failed to reverse linked textbook payment:', err);
    }
  }
}
