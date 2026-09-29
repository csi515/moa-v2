/**
 * 수강료 수납·월 청구 원자 클라이언트.
 * 온라인: core.record_tuition_payment / core.ensure_monthly_tuition_invoice
 * demo/offline: invoicePaymentService local 경로
 * Remote 성공 후 local projection은 financePaymentMirror가 담당한다.
 */
import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { getOrganizationId } from '@/services/adapters';
import { paymentRowToInvoice } from '@/services/adapters/sync/mappers/invoiceMappers';
import { transactionRowToTuitionPayment } from '@/services/adapters/sync/financeEntityMappers';
import type { PaymentMethod, TuitionInvoice } from '@/types';
import type { Json } from '@/lib/supabase/database.types';
import { upsertLinkedIncome } from '@/capabilities/billing/finance/billingIncomeLink';
import { settleLinkedTextbookSalesOnTuitionPaid } from '@/capabilities/billing/finance/linkedTextbookSettle';
import { billingStorage } from '@/capabilities/billing/infrastructure/billingStorage';
import { commerceStorage } from '@/capabilities/commerce/infrastructure/commerceStorage';
import type { StorageApi } from '@/services/storage/helpers';
import { todayIsoLocal } from '@/shared/utils/localDate';
import {
  classifyTuitionPaymentRpcResult,
  tuitionPaymentRejectMessage,
} from './tuitionPaymentRpcResult';
import { createAdapterFinanceMirrorPort } from './financePaymentMirrorAdapter';
import {
  projectIfRemoteApplied,
  tuitionPaymentMirrorJobs,
} from './financePaymentMirror';

const APP_TO_DB: Record<string, string> = {
  card: 'card',
  transfer: 'transfer',
  cash: 'cash',
  other: 'other',
  local_currency: 'local_currency',
  onsite_card: 'onsite_card',
};

export function newPaymentIdempotencyKey(): string {
  return crypto.randomUUID();
}

type InvoiceRow = Parameters<typeof paymentRowToInvoice>[0];
type TxRow = Parameters<typeof transactionRowToTuitionPayment>[0];

async function refreshInvoiceMirrorFromServer(
  invoiceId: string
): Promise<TuitionInvoice | null> {
  const { data, error } = await getCoreClient()
    .from('payments')
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle();
  if (error || !data) return null;
  const invoice = paymentRowToInvoice(data);
  projectIfRemoteApplied({
    remoteStatus: 'applied',
    jobs: tuitionPaymentMirrorJobs({ invoice }),
    port: createAdapterFinanceMirrorPort(),
  });
  return invoice;
}

export async function recordTuitionPaymentAtomic(params: {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  notes?: string;
  paymentDate?: string;
  cashReceiptIssued?: boolean;
  idempotencyKey?: string;
}): Promise<TuitionInvoice | null> {
  const orgId = getOrganizationId();
  if (!isSupabaseConfigured() || !orgId) {
    return billingStorage.recordPayment(
      params.invoiceId,
      params.amount,
      params.method,
      params.notes,
      params.paymentDate,
      { cashReceiptIssued: params.cashReceiptIssued }
    );
  }

  const client = getCoreClient();
  const key = params.idempotencyKey || newPaymentIdempotencyKey();
  const { data, error } = await client.rpc('record_tuition_payment_idempotent' as never, {
    p_organization_id: orgId,
    p_invoice_id: params.invoiceId,
    p_amount: params.amount,
    p_payment_method: APP_TO_DB[params.method] || 'cash',
    p_paid_at: params.paymentDate || todayIsoLocal(),
    p_memo: params.notes ?? null,
    p_cash_receipt_issued: params.cashReceiptIssued === true,
    p_idempotency_key: key,
  } as never);

  const payload = data as {
    action?: string;
    invoice?: InvoiceRow;
    transaction?: TxRow;
  } | null;
  const classified = classifyTuitionPaymentRpcResult({
    errorMessage: error?.message,
    invoice: payload?.invoice,
  });
  if (classified.kind !== 'applied') {
    if (classified.kind === 'already_paid' || classified.kind === 'invalid_amount') {
      await refreshInvoiceMirrorFromServer(params.invoiceId);
    }
    throw new Error(tuitionPaymentRejectMessage(classified));
  }
  if (!payload?.invoice) {
    throw new Error('수강료 수납 응답이 비어 있습니다.');
  }

  const invoice = paymentRowToInvoice(payload.invoice);
  const lookup = new Map([
    [invoice.id, { studentId: invoice.studentId, studentName: invoice.studentName, yearMonth: invoice.yearMonth }],
  ]);
  const tx = payload.transaction
    ? transactionRowToTuitionPayment(payload.transaction, lookup)
    : undefined;

  projectIfRemoteApplied({
    remoteStatus: payload.action === 'idempotent' ? 'replay' : 'applied',
    jobs: tuitionPaymentMirrorJobs({
      invoice,
      payment: tx,
      memo: params.notes,
      upsertIncome: upsertLinkedIncome,
    }),
    port: createAdapterFinanceMirrorPort(),
  });

  if (tx && invoice.status === 'paid' && (invoice.linkedTextbookSaleIds || []).length > 0) {
    void settleLinkedTextbookSalesOnTuitionPaid({
          api: commerceStorage as StorageApi,
      invoice,
      paymentId: tx.id,
      method: params.method,
      paymentDate: tx.paymentDate,
    }).catch((err) => console.error('[recordTuitionPaymentAtomic] linked textbook settle', err));
  }
  return invoice;
}

export async function ensureMonthlyTuitionInvoiceAtomic(params: {
  studentId: string;
  studentName: string;
  yearMonth: string;
  title: string;
  billedAmount: number;
  dueDate?: string;
  metadata?: Record<string, unknown>;
  invoiceId?: string;
}): Promise<TuitionInvoice | null> {
  const orgId = getOrganizationId();
  if (!isSupabaseConfigured() || !orgId) return null;

  const client = getCoreClient();
  const { data, error } = await client.rpc('ensure_monthly_tuition_invoice' as never, {
    p_organization_id: orgId,
    p_customer_id: params.studentId,
    p_year_month: params.yearMonth,
    p_title: params.title,
    p_billed_amount: params.billedAmount,
    p_due_date: params.dueDate || null,
    p_metadata: {
      studentName: params.studentName,
      yearMonth: params.yearMonth,
      ...(params.metadata || {}),
    } as unknown as Json,
    p_invoice_id: params.invoiceId || null,
  } as never);

  if (error) throw new Error(error.message || '청구서 생성에 실패했습니다.');
  const payload = data as { invoice?: InvoiceRow } | null;
  if (!payload?.invoice) return null;
  const invoice = paymentRowToInvoice(payload.invoice);
  projectIfRemoteApplied({
    remoteStatus: 'applied',
    jobs: tuitionPaymentMirrorJobs({ invoice }),
    port: createAdapterFinanceMirrorPort(),
  });
  return invoice;
}

/** 동시 부분 수납 모델 — lock 후 remaining으로 clip 하면 billed를 넘지 않는다 */
export { modelSerializedTuitionPayments } from './tuitionPaymentPlan';
