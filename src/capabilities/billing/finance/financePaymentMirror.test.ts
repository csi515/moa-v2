/**
 * Remote 수납과 local projection 분리 계약.
 * 실행: npm run test:finance-payment-mirror
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STORAGE_KEYS } from '@/services/adapters/storageKeys';
import type { TextbookPayment, TextbookSale, TuitionInvoice, TuitionPayment } from '@/types';
import {
  applyFinanceMirrorJobs,
  projectIfRemoteApplied,
  restoreFinanceListsFromRemote,
  textbookPaymentMirrorJobs,
  tuitionPaymentMirrorJobs,
  type FinanceIncomeWriter,
  type FinanceMirrorPort,
} from './financePaymentMirror';
import { isRemotePaymentApplied } from './financePaymentOutcome';

function memoryPort(store: Record<string, Array<{ id: string }>>): FinanceMirrorPort {
  return {
    readList<T>(key: string): T[] {
      return (store[key] || []) as T[];
    },
    writeList<T>(key: string, value: T[]): void {
      store[key] = value as Array<{ id: string }>;
    },
  };
}

function invoice(id = 'inv-1'): TuitionInvoice {
  return {
    id,
    studentId: 'stu-1',
    studentName: '홍길동',
    yearMonth: '2026-09',
    totalAmount: 100000,
    paidAmount: 100000,
    unpaidAmount: 0,
    dueDate: '2026-09-30',
    status: 'paid',
  };
}

function tuitionPayment(id = 'pay-1'): TuitionPayment {
  return {
    id,
    invoiceId: 'inv-1',
    studentId: 'stu-1',
    studentName: '홍길동',
    yearMonth: '2026-09',
    paymentDate: '2026-09-26',
    amount: 100000,
    paymentMethod: 'cash',
  };
}

function sale(id = 'sale-1'): TextbookSale {
  return {
    id,
    studentId: 'stu-1',
    studentName: '홍길동',
    parentName: '학부모',
    parentPhone: '010-0000-0000',
    textbookId: 'tb-1',
    textbookTitle: '교재A',
    saleDate: '2026-09-01',
    quantity: 1,
    unitPrice: 20000,
    discount: 0,
    totalAmount: 20000,
    paidAmount: 20000,
    unpaidAmount: 0,
    status: 'paid',
  };
}

function textbookPayment(id = 'tbpay-1'): TextbookPayment {
  return {
    id,
    textbookSaleId: 'sale-1',
    studentId: 'stu-1',
    studentName: '홍길동',
    textbookTitle: '교재A',
    paymentDate: '2026-09-26',
    amount: 20000,
    paymentMethod: 'cash',
  };
}

function incomeWriter(incomes: Array<{ sourceType: string; paymentId: string }>): FinanceIncomeWriter {
  return (params) => {
    const exists = incomes.some(
      (row) => row.sourceType === params.sourceType && row.paymentId === params.paymentId
    );
    if (exists) return;
    incomes.push({ sourceType: params.sourceType, paymentId: params.paymentId });
  };
}

function run() {
  const pay = tuitionPayment();
  const inv = invoice();
  const tbSale = sale();
  const tbPay = textbookPayment();

  // Remote 성공 + mirror 성공
  {
    const store: Record<string, Array<{ id: string }>> = {};
    const incomes: Array<{ sourceType: string; paymentId: string }> = [];
    const remoteStatus = 'applied' as const;
    assert.equal(isRemotePaymentApplied(remoteStatus), true);
    const mirror = projectIfRemoteApplied({
      remoteStatus,
      jobs: tuitionPaymentMirrorJobs({
        invoice: inv,
        payment: pay,
        upsertIncome: incomeWriter(incomes),
      }),
      port: memoryPort(store),
    });
    assert.equal(mirror.status, 'applied');
    assert.equal(store[STORAGE_KEYS.INVOICES]?.[0]?.id, 'inv-1');
    assert.equal(store[STORAGE_KEYS.TUITION_PAYMENTS]?.[0]?.id, 'pay-1');
    assert.equal(incomes.length, 1);
  }

  // Remote 성공 + mirror 실패 — remote 결과는 유지, local은 실패로만 표시
  {
    const store: Record<string, Array<{ id: string }>> = {};
    const failingPort: FinanceMirrorPort = {
      readList: () => [],
      writeList: () => {
        throw new Error('disk full');
      },
    };
    const remoteStatus = 'applied' as const;
    const mirror = projectIfRemoteApplied({
      remoteStatus,
      jobs: tuitionPaymentMirrorJobs({ invoice: inv, payment: pay }),
      port: failingPort,
    });
    assert.equal(isRemotePaymentApplied(remoteStatus), true);
    assert.equal(mirror.status, 'failed');
    assert.ok(mirror.failedKeys.length > 0);
    assert.equal(store[STORAGE_KEYS.INVOICES], undefined);
  }

  // Remote 실패 + mirror 미반영
  {
    const store: Record<string, Array<{ id: string }>> = {};
    const incomes: Array<{ sourceType: string; paymentId: string }> = [];
    const remoteStatus = 'rejected' as const;
    const mirror = projectIfRemoteApplied({
      remoteStatus,
      jobs: tuitionPaymentMirrorJobs({
        invoice: inv,
        payment: pay,
        upsertIncome: incomeWriter(incomes),
      }),
      port: memoryPort(store),
    });
    assert.equal(isRemotePaymentApplied(remoteStatus), false);
    assert.equal(mirror.status, 'skipped');
    assert.equal(store[STORAGE_KEYS.INVOICES], undefined);
    assert.equal(store[STORAGE_KEYS.TUITION_PAYMENTS], undefined);
    assert.equal(incomes.length, 0);
  }

  // 동일 payment 재처리 — append-if-absent, income sourceId 중복 없음
  {
    const store: Record<string, Array<{ id: string }>> = {};
    const incomes: Array<{ sourceType: string; paymentId: string }> = [];
    const port = memoryPort(store);
    const jobs = tuitionPaymentMirrorJobs({
      invoice: inv,
      payment: pay,
      upsertIncome: incomeWriter(incomes),
    });
    applyFinanceMirrorJobs(port, jobs);
    applyFinanceMirrorJobs(port, jobs);
    assert.equal(store[STORAGE_KEYS.TUITION_PAYMENTS]?.length, 1);
    assert.equal(incomes.length, 1);
  }

  // 앱 재실행 후 remote 스냅샷으로 mirror 복구
  {
    const empty: Record<string, Array<{ id: string }>> = {};
    const restored = restoreFinanceListsFromRemote({
      port: memoryPort(empty),
      invoices: [inv],
      tuitionPayments: [pay],
      textbookSales: [tbSale],
      textbookPayments: [tbPay],
    });
    assert.equal(restored.status, 'applied');
    assert.equal(empty[STORAGE_KEYS.INVOICES]?.[0]?.id, 'inv-1');
    assert.equal(empty[STORAGE_KEYS.TUITION_PAYMENTS]?.[0]?.id, 'pay-1');
    assert.equal(empty[STORAGE_KEYS.TEXTBOOK_SALES]?.[0]?.id, 'sale-1');
    assert.equal(empty[STORAGE_KEYS.TEXTBOOK_PAYMENTS]?.[0]?.id, 'tbpay-1');
  }

  // linked income 중복 생성 방지 (교재 포함)
  {
    const store: Record<string, Array<{ id: string }>> = {};
    const incomes: Array<{ sourceType: string; paymentId: string }> = [];
    const writer = incomeWriter(incomes);
    const jobs = textbookPaymentMirrorJobs({
      sale: tbSale,
      payment: tbPay,
      upsertIncome: writer,
    });
    applyFinanceMirrorJobs(memoryPort(store), jobs);
    applyFinanceMirrorJobs(memoryPort(store), jobs);
    assert.equal(incomes.length, 1);
    assert.equal(incomes[0].sourceType, 'textbook');
    assert.equal(incomes[0].paymentId, 'tbpay-1');
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const adapter = readFileSync(join(here, 'financePaymentMirrorAdapter.ts'), 'utf8');
  assert.match(adapter, /writeLocalMirror/);
  assert.equal(adapter.includes('setItem('), false);

  const tuition = readFileSync(join(here, 'tuitionPaymentAtomic.ts'), 'utf8');
  assert.match(tuition, /projectIfRemoteApplied/);
  assert.match(tuition, /tuitionPaymentMirrorJobs/);
  assert.equal(tuition.includes('writeInvoiceMirror'), false);
  assert.equal(tuition.includes('writeTuitionPaymentMirror'), false);

  const combined = readFileSync(join(here, 'combinedPaymentAtomic.ts'), 'utf8');
  assert.match(combined, /projectIfRemoteApplied/);
  assert.equal(combined.includes('writeCombinedInvoiceMirror'), false);
  assert.equal(combined.includes('combinedPaymentMirrors'), false);

  const textbook = readFileSync(
    join(here, '../../../industries/piano/services/textbookPaymentAtomic.ts'),
    'utf8'
  );
  assert.match(textbook, /projectIfRemoteApplied/);
  assert.match(textbook, /textbookPaymentMirrorJobs/);
  assert.equal(textbook.includes('writeSaleMirror'), false);
  assert.equal(textbook.includes('writePaymentMirror'), false);

  console.log('financePaymentMirror.test.ts: ok');
}

run();
