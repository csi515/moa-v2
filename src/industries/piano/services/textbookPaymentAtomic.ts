/**
 * 교재비 수납 원자 클라이언트.
 * 온라인: core.record_textbook_payment
 * 로컬 스냅샷 updatedSale 로 DB를 덮지 않는다.
 * Remote 성공 후 local projection은 financePaymentMirror가 담당한다.
 */
import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { getOrganizationId } from '@/services/adapters';
import { pianoRowToPayment } from '@/services/adapters/sync/piano/textbookPaymentMappers';
import { pianoRowToSale } from '@/services/adapters/sync/piano/textbookSalesMappers';
import type { PaymentMethod, TextbookPayment, TextbookSale } from '@/types';
import { upsertLinkedIncome } from '@/core/finance/billingIncomeLink';
import { createAdapterFinanceMirrorPort } from '@/core/finance/financePaymentMirrorAdapter';
import {
  projectIfRemoteApplied,
  textbookPaymentMirrorJobs,
} from '@/core/finance/financePaymentMirror';
import { requireTextbookOrgId } from './textbookSaleDb';
import { todayIsoLocal } from '@/shared/utils/localDate';

const APP_TO_DB: Record<string, string> = {
  card: 'card',
  transfer: 'transfer',
  cash: 'cash',
  other: 'other',
  local_currency: 'local_currency',
  onsite_card: 'onsite_card',
};

export function newTextbookPaymentIdempotencyKey(): string {
  return crypto.randomUUID();
}

export async function recordTextbookPaymentAtomic(params: {
  sale: TextbookSale;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  memo?: string;
  skipIncome?: boolean;
  idempotencyKey?: string;
}): Promise<{ payment: TextbookPayment; updatedSale: TextbookSale }> {
  if (!isSupabaseConfigured()) {
    throw new Error('온라인 교재 수납 경로가 아닙니다.');
  }
  const orgId = requireTextbookOrgId();
  const client = getCoreClient();
  const key = params.idempotencyKey || newTextbookPaymentIdempotencyKey();

  const { data, error } = await client.rpc('record_textbook_payment' as never, {
    p_organization_id: orgId,
    p_sale_id: params.sale.id,
    p_amount: params.amount,
    p_payment_method: APP_TO_DB[params.paymentMethod] || 'cash',
    p_payment_date: params.paymentDate || todayIsoLocal(),
    p_memo: params.memo ?? null,
    p_idempotency_key: key,
    p_student_name: params.sale.studentName,
    p_textbook_title: params.sale.textbookTitle,
  } as never);

  if (error) {
    throw new Error(error.message || '교재비 수납에 실패했습니다.');
  }

  const payload = data as {
    action?: string;
    sale?: Parameters<typeof pianoRowToSale>[0];
    payment?: Parameters<typeof pianoRowToPayment>[0];
  } | null;
  if (!payload?.sale || !payload.payment) {
    throw new Error('교재비 수납 응답이 비어 있습니다.');
  }

  const updatedSale: TextbookSale = {
    ...params.sale,
    ...pianoRowToSale(payload.sale),
    studentName: params.sale.studentName,
    textbookTitle: params.sale.textbookTitle,
    billingInvoiceId: params.sale.billingInvoiceId,
  };
  const payment = pianoRowToPayment(payload.payment);
  payment.studentId = payment.studentId || params.sale.studentId;
  payment.studentName = payment.studentName || params.sale.studentName;
  payment.textbookTitle = payment.textbookTitle || params.sale.textbookTitle;

  projectIfRemoteApplied({
    remoteStatus: payload.action === 'idempotent' ? 'replay' : 'applied',
    jobs: textbookPaymentMirrorJobs({
      sale: updatedSale,
      payment,
      skipIncome: params.skipIncome,
      upsertIncome: upsertLinkedIncome,
    }),
    port: createAdapterFinanceMirrorPort(),
  });

  return { payment, updatedSale };
}

export { modelSerializedTextbookPayments } from './textbookPaymentPlan';

export function isOnlineTextbookPaymentPath(): boolean {
  return Boolean(isSupabaseConfigured() && getOrganizationId());
}
