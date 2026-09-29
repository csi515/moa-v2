/**
 * 온라인 수납 이후 local projection.
 * writeLocalMirror만 사용한다. setItem persist/outbox를 타지 않아 remote를 덮지 않는다.
 */
import { STORAGE_KEYS } from '@/services/adapters/storageKeys';
import type { TextbookPayment, TextbookSale, TuitionInvoice, TuitionPayment } from '@/types';
import {
  emptyFinanceMirrorResult,
  isRemotePaymentApplied,
  summarizeFinanceMirror,
  type FinanceMirrorResult,
  type RemotePaymentStatus,
} from './financePaymentOutcome';

export type FinanceIncomeWriter = (params: {
  sourceType: 'tuition' | 'textbook';
  paymentId: string;
  date: string;
  amount: number;
  paymentMethod: TuitionPayment['paymentMethod'];
  description: string;
  payer: string;
  memo?: string;
}) => void;

export type FinanceMirrorPort = {
  readList<T>(key: string): T[];
  writeList<T>(key: string, value: T[]): void;
};

export type FinanceMirrorJob =
  | { kind: 'upsert'; key: string; entity: { id: string } }
  | { kind: 'append-if-absent'; key: string; entity: { id: string } }
  | { kind: 'income'; label: string; apply: () => void };

export function applyFinanceMirrorJobs(
  port: FinanceMirrorPort,
  jobs: FinanceMirrorJob[]
): FinanceMirrorResult {
  const appliedKeys: string[] = [];
  const failedKeys: string[] = [];
  const errors: string[] = [];

  for (const job of jobs) {
    const label = job.kind === 'income' ? job.label : job.key;
    try {
      if (job.kind === 'income') {
        job.apply();
      } else {
        const list = port.readList<{ id: string }>(job.key);
        const idx = list.findIndex((row) => row.id === job.entity.id);
        if (job.kind === 'append-if-absent' && idx >= 0) {
          appliedKeys.push(label);
          continue;
        }
        const next = list.slice();
        if (idx >= 0) next[idx] = { ...next[idx], ...job.entity };
        else next.unshift(job.entity);
        port.writeList(job.key, next);
      }
      appliedKeys.push(label);
    } catch (err) {
      failedKeys.push(label);
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return {
    status: summarizeFinanceMirror({
      status: 'applied',
      appliedKeys,
      failedKeys,
      errors,
    }),
    appliedKeys,
    failedKeys,
    errors,
  };
}

/**
 * Remote 성공 후에만 local projection을 수행한다.
 * Remote 실패면 jobs를 실행하지 않아 local 성공 잔존을 막는다.
 * projection 예외는 삼키고 failed 결과를 반환한다.
 */
export function projectIfRemoteApplied(params: {
  remoteStatus: RemotePaymentStatus;
  jobs: FinanceMirrorJob[];
  port: FinanceMirrorPort;
}): FinanceMirrorResult {
  if (!isRemotePaymentApplied(params.remoteStatus)) {
    return emptyFinanceMirrorResult('skipped');
  }
  try {
    const result = applyFinanceMirrorJobs(params.port, params.jobs);
    if (result.status !== 'applied') {
      console.error('[financePaymentMirror] local projection incomplete', result);
    }
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[financePaymentMirror] local projection failed', err);
    return {
      status: 'failed',
      appliedKeys: [],
      failedKeys: ['projection'],
      errors: [message],
    };
  }
}

export function tuitionPaymentMirrorJobs(params: {
  invoice: TuitionInvoice;
  payment?: TuitionPayment;
  memo?: string;
  upsertIncome?: FinanceIncomeWriter;
}): FinanceMirrorJob[] {
  const jobs: FinanceMirrorJob[] = [
    { kind: 'upsert', key: STORAGE_KEYS.INVOICES, entity: params.invoice },
  ];
  if (!params.payment) return jobs;
  jobs.push({
    kind: 'append-if-absent',
    key: STORAGE_KEYS.TUITION_PAYMENTS,
    entity: params.payment,
  });
  if (!params.upsertIncome) return jobs;
  const payment = params.payment;
  const writeIncome = params.upsertIncome;
  jobs.push({
    kind: 'income',
    label: STORAGE_KEYS.INCOME_ENTRIES,
    apply: () => {
      writeIncome({
        sourceType: 'tuition',
        paymentId: payment.id,
        date: payment.paymentDate,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        description: `${params.invoice.yearMonth} 수강료 · ${params.invoice.studentName}`,
        payer: params.invoice.studentName,
        memo: params.memo,
      });
    },
  });
  return jobs;
}

export function textbookPaymentMirrorJobs(params: {
  sale: TextbookSale;
  payment: TextbookPayment;
  skipIncome?: boolean;
  upsertIncome?: FinanceIncomeWriter;
}): FinanceMirrorJob[] {
  const jobs: FinanceMirrorJob[] = [
    { kind: 'upsert', key: STORAGE_KEYS.TEXTBOOK_SALES, entity: params.sale },
    { kind: 'append-if-absent', key: STORAGE_KEYS.TEXTBOOK_PAYMENTS, entity: params.payment },
  ];
  if (params.skipIncome || !params.upsertIncome) return jobs;
  const writeIncome = params.upsertIncome;
  jobs.push({
    kind: 'income',
    label: STORAGE_KEYS.INCOME_ENTRIES,
    apply: () => {
      writeIncome({
        sourceType: 'textbook',
        paymentId: params.payment.id,
        date: params.payment.paymentDate,
        amount: params.payment.amount,
        paymentMethod: params.payment.paymentMethod,
        description: `교재비 · ${params.sale.textbookTitle} · ${params.sale.studentName}`,
        payer: params.sale.studentName,
        memo: params.payment.memo,
      });
    },
  });
  return jobs;
}

/** hydrate와 같은 복구: remote 스냅샷으로 local list를 맞춘다. */
export function restoreFinanceListsFromRemote(params: {
  port: FinanceMirrorPort;
  invoices?: TuitionInvoice[];
  tuitionPayments?: TuitionPayment[];
  textbookSales?: TextbookSale[];
  textbookPayments?: TextbookPayment[];
}): FinanceMirrorResult {
  const jobs: FinanceMirrorJob[] = [];
  for (const invoice of params.invoices || []) {
    jobs.push({ kind: 'upsert', key: STORAGE_KEYS.INVOICES, entity: invoice });
  }
  for (const payment of params.tuitionPayments || []) {
    jobs.push({ kind: 'append-if-absent', key: STORAGE_KEYS.TUITION_PAYMENTS, entity: payment });
  }
  for (const sale of params.textbookSales || []) {
    jobs.push({ kind: 'upsert', key: STORAGE_KEYS.TEXTBOOK_SALES, entity: sale });
  }
  for (const payment of params.textbookPayments || []) {
    jobs.push({ kind: 'append-if-absent', key: STORAGE_KEYS.TEXTBOOK_PAYMENTS, entity: payment });
  }
  if (jobs.length === 0) return emptyFinanceMirrorResult('skipped');
  return applyFinanceMirrorJobs(params.port, jobs);
}
