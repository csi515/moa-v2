/**
 * 통합 수납 원자 클라이언트.
 * 온라인: core.record_combined_payment (기존 수납 RPC를 한 TX에서 호출)
 * demo/offline: 순차 반영 후 실패 시 보상. 부분 성공을 전체 성공으로 반환하지 않는다.
 * Remote 성공 후 local projection은 financePaymentMirror가 담당한다.
 */
import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { getOrganizationId, getStorageAdapter, STORAGE_KEYS } from '@/services/adapters';
import { paymentRowToInvoice } from '@/services/adapters/sync/mappers/invoiceMappers';
import { transactionRowToTuitionPayment } from '@/services/adapters/sync/financeEntityMappers';
import { pianoRowToPayment } from '@/services/adapters/sync/piano/textbookPaymentMappers';
import { pianoRowToSale } from '@/services/adapters/sync/piano/textbookSalesMappers';
import type { Json } from '@/lib/supabase/database.types';
import type {
  CombinedPaymentRequest,
  TextbookPayment,
  TextbookSale,
  TuitionInvoice,
} from '@/types';
import { upsertLinkedIncome } from '@/capabilities/billing/finance/billingIncomeLink';
import { settleLinkedTextbookSalesOnTuitionPaid } from '@/capabilities/billing/finance/linkedTextbookSettle';
import {
  buildCombinedPaymentCommand,
  CombinedPaymentCommandError,
  type CombinedPaymentAtomicResult,
  type CombinedPaymentStatus,
} from '@/capabilities/billing/finance/combinedPaymentCommand';
import { recordCombinedPaymentLocal } from '@/capabilities/billing/finance/combinedPaymentLocal';
import { createAdapterFinanceMirrorPort } from '@/capabilities/billing/finance/financePaymentMirrorAdapter';
import {
  projectIfRemoteApplied,
  textbookPaymentMirrorJobs,
  tuitionPaymentMirrorJobs,
  type FinanceMirrorJob,
} from '@/capabilities/billing/finance/financePaymentMirror';
import { commerceStorage } from '@/capabilities/commerce/infrastructure/commerceStorage';
import type { StorageApi } from '@/services/storage/helpers';
import { todayIsoLocal } from '@/shared/utils/localDate';

export type { CombinedPaymentAtomicResult };

const APP_TO_DB: Record<string, string> = {
  card: 'card',
  transfer: 'transfer',
  cash: 'cash',
  other: 'other',
  local_currency: 'local_currency',
  onsite_card: 'onsite_card',
};

type InvoiceRow = Parameters<typeof paymentRowToInvoice>[0];
type TxRow = Parameters<typeof transactionRowToTuitionPayment>[0];
type SaleRow = Parameters<typeof pianoRowToSale>[0];
type TbPayRow = Parameters<typeof pianoRowToPayment>[0];

type TuitionRpcItem = {
  action?: string;
  invoice?: InvoiceRow;
  transaction?: TxRow;
};

type TextbookRpcItem = {
  action?: string;
  sale_id?: string;
  sale?: SaleRow;
  payment?: TbPayRow;
};

function toJsonItems(value: Array<Record<string, string | number | undefined>>): Json {
  return value.map((item) => {
    const row: { [key: string]: Json } = {};
    for (const [key, entry] of Object.entries(item)) {
      if (entry !== undefined) row[key] = entry;
    }
    return row;
  });
}

export async function recordCombinedPaymentAtomic(
  req: CombinedPaymentRequest
): Promise<CombinedPaymentAtomicResult> {
  const adapter = getStorageAdapter();
  const sales = adapter.getItem<TextbookSale[]>(STORAGE_KEYS.TEXTBOOK_SALES, []);
  const invoices = adapter.getItem<TuitionInvoice[]>(STORAGE_KEYS.INVOICES, []);
  const textbookMeta = Object.fromEntries(
    sales.map((sale) => [
      sale.id,
      {
        studentName: sale.studentName,
        textbookTitle: sale.textbookTitle,
        billingInvoiceId: sale.billingInvoiceId,
      },
    ])
  );
  const fallbackInvoice = invoices.find(
    (invoice) => invoice.studentId === req.studentId && invoice.yearMonth === req.yearMonth
  );

  const orgId = getOrganizationId();
  const command = buildCombinedPaymentCommand({
    organizationId: orgId || 'local',
    request: req,
    textbookMeta,
    fallbackInvoiceId: fallbackInvoice?.id,
  });

  if (command.tuitionItems.length === 0 && command.textbookItems.length === 0) {
    throw new CombinedPaymentCommandError({
      message: '납부할 항목이 없습니다.',
    });
  }

  if (!isSupabaseConfigured() || !orgId) {
    return recordCombinedPaymentLocal(req, command);
  }

  const client = getCoreClient();
  const { data, error } = await client.rpc('record_combined_payment', {
    p_organization_id: orgId,
    p_tuition_items: toJsonItems(
      command.tuitionItems.map((item) => ({
        invoice_id: item.invoiceId,
        amount: item.amount,
        idempotency_key: item.idempotencyKey,
      }))
    ),
    p_textbook_items: toJsonItems(
      command.textbookItems.map((item) => ({
        sale_id: item.saleId,
        amount: item.amount,
        idempotency_key: item.idempotencyKey,
        student_name: item.studentName,
        textbook_title: item.textbookTitle,
      }))
    ),
    p_payment_method: APP_TO_DB[req.paymentMethod] || 'cash',
    p_paid_at: req.paymentDate || todayIsoLocal(),
    p_memo: req.memo ?? null,
    p_cash_receipt_issued: false,
    p_command_key: command.commandKey,
  });

  if (error) {
    throw new CombinedPaymentCommandError({
      message:
        error.message ||
        '통합 수납이 완료되지 않았습니다. 수강료와 교재비는 함께 반영되지 않았습니다.',
    });
  }

  const payload = data as {
    action?: string;
    tuition?: TuitionRpcItem[];
    textbooks?: TextbookRpcItem[];
  } | null;
  if (!payload) {
    throw new CombinedPaymentCommandError({
      message: '통합 수납 응답이 비어 있습니다.',
    });
  }

  const status: CombinedPaymentStatus = payload.action === 'paid' ? 'applied' : 'replay';
  let tuitionInvoice: TuitionInvoice | undefined;
  const textbookPayments: TextbookPayment[] = [];
  const appliedTuitionInvoiceIds: string[] = [];
  const appliedTextbookSaleIds: string[] = [];
  let totalPaid = 0;
  const jobs: FinanceMirrorJob[] = [];

  for (const item of payload.tuition || []) {
    if (!item.invoice) continue;
    const invoice = paymentRowToInvoice(item.invoice);
    const lookup = new Map([
      [
        invoice.id,
        { studentId: invoice.studentId, studentName: invoice.studentName, yearMonth: invoice.yearMonth },
      ],
    ]);
    const tx = item.transaction
      ? transactionRowToTuitionPayment(item.transaction, lookup)
      : undefined;
    tuitionInvoice = invoice;
    appliedTuitionInvoiceIds.push(invoice.id);
    jobs.push(
      ...tuitionPaymentMirrorJobs({
        invoice,
        payment: tx,
        memo: req.memo,
        upsertIncome: upsertLinkedIncome,
      })
    );
    if (tx) {
      totalPaid += tx.amount;
      if (invoice.status === 'paid' && (invoice.linkedTextbookSaleIds || []).length > 0) {
        void settleLinkedTextbookSalesOnTuitionPaid({
          api: commerceStorage as StorageApi,
          invoice,
          paymentId: tx.id,
          method: req.paymentMethod,
          paymentDate: tx.paymentDate,
        }).catch((settleErr) =>
          console.error('[recordCombinedPaymentAtomic] linked textbook settle', settleErr)
        );
      }
    }
  }

  for (const item of payload.textbooks || []) {
    if (item.action === 'skipped_linked') continue;
    if (!item.sale || !item.payment) continue;
    const local = sales.find((sale) => sale.id === item.sale?.id);
    const mapped = pianoRowToSale(item.sale);
    const updatedSale: TextbookSale = {
      ...(local || mapped),
      ...mapped,
      studentName: local?.studentName || mapped.studentName,
      textbookTitle: local?.textbookTitle || mapped.textbookTitle,
      billingInvoiceId: local?.billingInvoiceId,
    };
    const payment = pianoRowToPayment(item.payment);
    payment.studentId = payment.studentId || updatedSale.studentId;
    payment.studentName = payment.studentName || updatedSale.studentName;
    payment.textbookTitle = payment.textbookTitle || updatedSale.textbookTitle;
    jobs.push(
      ...textbookPaymentMirrorJobs({
        sale: updatedSale,
        payment,
        upsertIncome: upsertLinkedIncome,
      })
    );
    textbookPayments.push(payment);
    appliedTextbookSaleIds.push(updatedSale.id);
    totalPaid += payment.amount;
  }

  projectIfRemoteApplied({
    remoteStatus: status,
    jobs,
    port: createAdapterFinanceMirrorPort(),
  });

  return {
    status,
    tuitionInvoice,
    textbookPayments,
    totalPaidAmount: totalPaid,
    appliedTuitionInvoiceIds,
    appliedTextbookSaleIds,
  };
}
