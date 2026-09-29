import type {
  AcademyEvent,
  AcademySettings,
  InvoiceExtraItem,
  TextbookSale,
  TuitionInvoice,
} from '@/types';

/** 월 청구에 교재·연주회비를 합산할지 */
export function resolveIncludeExtras(
  settings?: Pick<AcademySettings, 'includeExtrasInMonthlyInvoice'> | null,
  invoiceOverride?: boolean
): boolean {
  if (typeof invoiceOverride === 'boolean') return invoiceOverride;
  return settings?.includeExtrasInMonthlyInvoice === true;
}

/** 아직 월 청구에 묶이지 않은 미납 교재 판매 */
export function collectPendingTextbookSales(
  sales: TextbookSale[],
  studentId: string
): TextbookSale[] {
  return sales.filter(
    (s) =>
      s.studentId === studentId &&
      !s.billingInvoiceId &&
      (s.status === 'unpaid' || s.status === 'partial') &&
      s.unpaidAmount > 0
  );
}

/** 해당 월·원생의 연주회/콩쿠르 참가비 (이미 청구된 행사 제외) */
export function collectPendingRecitalFees(params: {
  events: AcademyEvent[];
  studentId: string;
  yearMonth: string;
  existingInvoices: TuitionInvoice[];
}): InvoiceExtraItem[] {
  const billedEventIds = new Set<string>();
  for (const inv of params.existingInvoices) {
    if (inv.studentId !== params.studentId) continue;
    for (const item of inv.linkedExtraItems || []) {
      if (item.sourceType === 'recital') billedEventIds.add(item.id);
    }
  }

  const items: InvoiceExtraItem[] = [];
  for (const event of params.events) {
    if (event.type !== 'concert' && event.type !== 'competition') continue;
    const fee = Number(event.participationFee) || 0;
    if (fee <= 0) continue;
    if (!(event.participantIds || []).includes(params.studentId)) continue;
    if (!event.startDate.startsWith(params.yearMonth)) continue;
    if (billedEventIds.has(event.id)) continue;
    items.push({
      id: event.id,
      label: event.title,
      amount: fee,
      sourceType: 'recital',
    });
  }
  return items;
}

export function computeInvoiceTotal(params: {
  baseFee: number;
  discount?: number;
  textbookFee?: number;
  extraFee?: number;
}): number {
  return Math.max(
    0,
    (params.baseFee || 0) -
      (params.discount || 0) +
      (params.textbookFee || 0) +
      (params.extraFee || 0)
  );
}

export function buildInvoiceNotes(params: {
  yearMonth: string;
  textbookCount: number;
  extraItems: InvoiceExtraItem[];
}): string {
  const parts = [`${params.yearMonth}월 정기 수강료`];
  if (params.textbookCount > 0) {
    parts.push(`교재 ${params.textbookCount}건`);
  }
  if (params.extraItems.length > 0) {
    parts.push(params.extraItems.map((i) => i.label).join(', '));
  }
  return parts.join(' · ');
}
