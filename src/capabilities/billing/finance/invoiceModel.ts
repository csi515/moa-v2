/**
 * TuitionInvoice 책임 분류.
 * 런타임 엔티티는 그대로 TuitionInvoice. 여기서는 조회용 부분 타입과 파생 라인만 둔다.
 * DB payments / metadata 컬럼은 변경하지 않는다.
 */
import type { InvoiceExtraItem, TuitionInvoice } from '@/types';

export type InvoiceHeader = Pick<
  TuitionInvoice,
  'id' | 'studentId' | 'studentName' | 'yearMonth' | 'title' | 'dueDate' | 'notes'
>;

export type InvoiceChargeBreakdown = Pick<
  TuitionInvoice,
  | 'baseTuition'
  | 'baseFee'
  | 'discount'
  | 'discountAmount'
  | 'textbookFee'
  | 'additionalAmount'
  | 'extraFee'
  | 'extraFeeLabel'
  | 'includeExtras'
  | 'linkedTextbookSaleIds'
  | 'linkedExtraItems'
>;

export type InvoiceBalanceSnapshot = Pick<
  TuitionInvoice,
  'totalAmount' | 'paidAmount' | 'unpaidAmount' | 'status'
>;

/**
 * legacy compatibility snapshot.
 * 수납 쓰기는 갱신하지 않는다. 표시는 getLatestTuitionPaymentForInvoice.
 */
export type InvoiceLastPaymentSnapshot = Pick<
  TuitionInvoice,
  'paymentMethod' | 'paidAt' | 'paidDate' | 'receiptNumber'
>;

export type InvoiceDeliveryState = Pick<
  TuitionInvoice,
  'invoiceSent' | 'sentAt' | 'cashReceiptRequested'
>;

export type InvoiceChargeLineKind = 'tuition' | 'discount' | 'textbook' | 'extra' | 'additional';

export type InvoiceChargeLine = {
  kind: InvoiceChargeLineKind;
  label: string;
  amount: number;
  sourceIds?: string[];
  extraItems?: InvoiceExtraItem[];
};

export function resolveInvoiceBaseFee(
  invoice: Pick<TuitionInvoice, 'baseTuition' | 'baseFee'>
): number {
  return invoice.baseTuition ?? invoice.baseFee ?? 0;
}

export function resolveInvoiceDiscount(
  invoice: Pick<TuitionInvoice, 'discount' | 'discountAmount'>
): number {
  return invoice.discount ?? invoice.discountAmount ?? 0;
}

/** metadata 분해 없이 표시용 청구항목을 만든다. persist 하지 않는다. */
export function listInvoiceChargeLines(invoice: InvoiceChargeBreakdown): InvoiceChargeLine[] {
  const lines: InvoiceChargeLine[] = [];
  const base = resolveInvoiceBaseFee(invoice);
  if (base > 0) {
    lines.push({ kind: 'tuition', label: '월회비', amount: base });
  }
  const discount = resolveInvoiceDiscount(invoice);
  if (discount > 0) {
    lines.push({ kind: 'discount', label: '할인', amount: -discount });
  }
  if ((invoice.textbookFee || 0) > 0) {
    lines.push({
      kind: 'textbook',
      label: '교재비',
      amount: invoice.textbookFee || 0,
      sourceIds: invoice.linkedTextbookSaleIds,
    });
  }
  if ((invoice.extraFee || 0) > 0) {
    lines.push({
      kind: 'extra',
      label: invoice.extraFeeLabel || '행사비',
      amount: invoice.extraFee || 0,
      extraItems: invoice.linkedExtraItems,
    });
  }
  if ((invoice.additionalAmount || 0) > 0) {
    lines.push({
      kind: 'additional',
      label: '추가금',
      amount: invoice.additionalAmount || 0,
    });
  }
  return lines;
}
