/**
 * core.payments.metadata JSON.
 * 컬럼으로 올리지 않는 청구 분해·연결·발송 플래그만 담는다.
 *
 * InvoicePaymentMetadata = unpack 도메인.
 * InvoicePaymentMetadataJson = persist용 Json (index signature로 generated Json과 호환).
 */
import type { InvoiceExtraItem, TuitionInvoice } from '@/types';
import type { Json } from '@/lib/supabase/database.types';

export type InvoiceExtraItemJson = {
  id: string;
  label: string;
  amount: number;
  sourceType: string;
  [key: string]: Json | undefined;
};

export type InvoicePaymentMetadataJson = {
  studentName: string;
  yearMonth: string;
  baseTuition?: number;
  baseFee?: number;
  discount?: number;
  discountAmount?: number;
  textbookFee?: number;
  additionalAmount?: number;
  extraFee?: number;
  extraFeeLabel?: string;
  unpaidAmount?: number;
  notes?: string;
  includeExtras?: boolean;
  linkedTextbookSaleIds?: string[];
  linkedExtraItems?: InvoiceExtraItemJson[];
  invoiceSent?: boolean;
  cashReceiptRequested?: boolean;
  [key: string]: Json | undefined;
};

export type InvoicePaymentMetadata = {
  studentName: string;
  yearMonth: string;
  baseTuition?: number;
  baseFee?: number;
  discount?: number;
  discountAmount?: number;
  textbookFee?: number;
  additionalAmount?: number;
  extraFee?: number;
  extraFeeLabel?: string;
  unpaidAmount?: number;
  notes?: string;
  includeExtras?: boolean;
  linkedTextbookSaleIds?: string[];
  linkedExtraItems?: InvoiceExtraItem[];
  invoiceSent?: boolean;
  cashReceiptRequested?: boolean;
};

function packLinkedExtraItems(
  items: TuitionInvoice['linkedExtraItems']
): InvoiceExtraItemJson[] | undefined {
  if (!items) return undefined;
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    amount: item.amount,
    sourceType: item.sourceType,
  }));
}

function unpackLinkedExtraItems(raw: unknown): InvoiceExtraItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: InvoiceExtraItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as Record<string, unknown>;
    if (typeof rec.id !== 'string' || typeof rec.label !== 'string' || typeof rec.amount !== 'number') {
      continue;
    }
    if (rec.sourceType !== 'recital' && rec.sourceType !== 'manual') continue;
    items.push({
      id: rec.id,
      label: rec.label,
      amount: rec.amount,
      sourceType: rec.sourceType,
    });
  }
  return items;
}

function asMetaRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function optionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return undefined;
  return value;
}

export function packInvoicePaymentMetadata(inv: TuitionInvoice): InvoicePaymentMetadataJson {
  return {
    studentName: inv.studentName,
    yearMonth: inv.yearMonth,
    baseTuition: inv.baseTuition ?? inv.baseFee,
    baseFee: inv.baseFee,
    discount: inv.discount,
    discountAmount: inv.discountAmount,
    textbookFee: inv.textbookFee,
    additionalAmount: inv.additionalAmount,
    extraFee: inv.extraFee,
    extraFeeLabel: inv.extraFeeLabel,
    unpaidAmount: inv.unpaidAmount,
    notes: inv.notes,
    includeExtras: inv.includeExtras,
    linkedTextbookSaleIds: inv.linkedTextbookSaleIds,
    linkedExtraItems: packLinkedExtraItems(inv.linkedExtraItems),
    invoiceSent: inv.invoiceSent,
    cashReceiptRequested: inv.cashReceiptRequested,
  };
}

export function unpackInvoicePaymentMetadata(raw: unknown): InvoicePaymentMetadata {
  const meta = asMetaRecord(raw);
  return {
    studentName: optionalString(meta.studentName) || '',
    yearMonth: optionalString(meta.yearMonth) || '',
    baseTuition: optionalNumber(meta.baseTuition),
    baseFee: optionalNumber(meta.baseFee),
    discount: optionalNumber(meta.discount),
    discountAmount: optionalNumber(meta.discountAmount),
    textbookFee: optionalNumber(meta.textbookFee),
    additionalAmount: optionalNumber(meta.additionalAmount),
    extraFee: optionalNumber(meta.extraFee),
    extraFeeLabel: optionalString(meta.extraFeeLabel),
    unpaidAmount: optionalNumber(meta.unpaidAmount),
    notes: optionalString(meta.notes),
    includeExtras: optionalBoolean(meta.includeExtras),
    linkedTextbookSaleIds: optionalStringArray(meta.linkedTextbookSaleIds),
    linkedExtraItems: unpackLinkedExtraItems(meta.linkedExtraItems),
    invoiceSent: optionalBoolean(meta.invoiceSent),
    cashReceiptRequested: optionalBoolean(meta.cashReceiptRequested),
  };
}
