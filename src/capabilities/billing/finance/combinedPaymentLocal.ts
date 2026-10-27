import type { CombinedPaymentRequest, TextbookPayment, TuitionInvoice } from '@/types';
import {
  CombinedPaymentCommandError,
  type CombinedPaymentAtomicResult,
  type CombinedPaymentCommand,
} from '@/capabilities/billing/finance/combinedPaymentCommand';
import { recordTuitionPaymentAtomic } from '@/capabilities/billing/finance/tuitionPaymentAtomic';
import { billingStorage } from '@/capabilities/billing/infrastructure/billingStorage';
import { commerceStorage } from '@/capabilities/commerce/infrastructure/commerceStorage';

function latestTuitionPaymentId(invoiceId: string): string | undefined {
  return billingStorage.getTuitionPayments()
    .filter((payment) => payment.invoiceId === invoiceId)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0]?.id;
}

/** demo/offline. 순차 반영 후 실패 시 보상한다. 부분 성공을 성공으로 반환하지 않는다. */
export async function recordCombinedPaymentLocal(
  req: CombinedPaymentRequest,
  command: CombinedPaymentCommand
): Promise<CombinedPaymentAtomicResult> {
  const appliedTuitionIds: string[] = [];
  const appliedTextbookIds: string[] = [];
  const appliedTuitionPaymentIds: string[] = [];
  const appliedTextbookPaymentIds: string[] = [];
  const textbookPayments: TextbookPayment[] = [];
  let tuitionInvoice: TuitionInvoice | undefined;
  let totalPaid = 0;

  try {
    for (const item of command.tuitionItems) {
      const invoice = await recordTuitionPaymentAtomic({
        invoiceId: item.invoiceId,
        amount: item.amount,
        method: req.paymentMethod,
        notes: req.memo,
        paymentDate: req.paymentDate,
        idempotencyKey: item.idempotencyKey,
      });
      if (!invoice) {
        throw new CombinedPaymentCommandError({
          message: '수강료 수납에 실패했습니다.',
        });
      }
      tuitionInvoice = invoice;
      appliedTuitionIds.push(invoice.id);
      const paymentId = latestTuitionPaymentId(invoice.id);
      if (paymentId) appliedTuitionPaymentIds.push(paymentId);
      totalPaid += item.amount;
    }

    for (const item of command.textbookItems) {
      const res = await commerceStorage.recordTextbookPayment(
        item.saleId,
        item.amount,
        req.paymentMethod,
        req.paymentDate,
        req.memo
      );
      textbookPayments.push(res.payment);
      appliedTextbookIds.push(item.saleId);
      appliedTextbookPaymentIds.push(res.payment.id);
      totalPaid += item.amount;
    }
  } catch (err) {
    let compensated = true;
    const leftoverTuition: string[] = [];
    const leftoverTextbook: string[] = [];
    for (const paymentId of appliedTextbookPaymentIds) {
      const ok = await commerceStorage.reverseTextbookPayment(paymentId);
      if (!ok) {
        compensated = false;
        leftoverTextbook.push(paymentId);
      }
    }
    for (const paymentId of appliedTuitionPaymentIds) {
      const ok = billingStorage.reverseTuitionPayment(paymentId);
      if (!ok) {
        compensated = false;
        leftoverTuition.push(paymentId);
      }
    }
    throw new CombinedPaymentCommandError({
      message: err instanceof Error ? err.message : '통합 수납 처리 중 오류가 발생했습니다.',
      appliedTuitionInvoiceIds: compensated ? [] : leftoverTuition,
      appliedTextbookSaleIds: compensated ? [] : leftoverTextbook,
      compensated,
    });
  }

  return {
    status: 'applied',
    tuitionInvoice,
    textbookPayments,
    totalPaidAmount: totalPaid,
    appliedTuitionInvoiceIds: appliedTuitionIds,
    appliedTextbookSaleIds: appliedTextbookIds,
  };
}
