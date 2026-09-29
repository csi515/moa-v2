/**
 * 마지막 수납 표시 = TuitionPayment 원장.
 * 실행: npm run test:latest-tuition-payment
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TuitionInvoice, TuitionPayment } from '@/types';
import {
  getLatestTuitionPaymentForInvoice,
  lastTuitionPaymentSummaryText,
  resolveLastTuitionPaymentDisplay,
} from './latestTuitionPayment';

function payment(
  override: Partial<TuitionPayment> & Pick<TuitionPayment, 'id' | 'amount' | 'paymentMethod'>
): TuitionPayment {
  return {
    invoiceId: 'inv-1',
    studentId: 'stu-1',
    studentName: '홍길동',
    yearMonth: '2026-09',
    paymentDate: '2026-09-01',
    ...override,
  };
}

function staleInvoice(): TuitionInvoice {
  return {
    id: 'inv-1',
    studentId: 'stu-1',
    studentName: '홍길동',
    yearMonth: '2026-09',
    totalAmount: 100000,
    paidAmount: 100000,
    unpaidAmount: 0,
    dueDate: '2026-09-10',
    status: 'paid',
    paymentMethod: 'cash',
    paidAt: '2026-09-01',
    paidDate: '2026-09-01',
  };
}

function run() {
  const invoiceId = 'inv-1';

  const twoPayments = [
    payment({
      id: 'pay-30',
      amount: 30000,
      paymentMethod: 'cash',
      paymentDate: '2026-09-02',
      createdAt: '2026-09-02T10:00:00.000Z',
    }),
    payment({
      id: 'pay-70',
      amount: 70000,
      paymentMethod: 'transfer',
      paymentDate: '2026-09-05',
      createdAt: '2026-09-05T10:00:00.000Z',
    }),
  ];
  const lastOfTwo = getLatestTuitionPaymentForInvoice(twoPayments, invoiceId);
  assert.equal(lastOfTwo?.id, 'pay-70');
  assert.equal(lastOfTwo?.amount, 70000);
  assert.equal(lastOfTwo?.paymentMethod, 'transfer');
  assert.equal(resolveLastTuitionPaymentDisplay(twoPayments, invoiceId)?.amount, 70000);

  const partial = [
    payment({
      id: 'pay-partial',
      amount: 30000,
      paymentMethod: 'card',
      paymentDate: '2026-09-03',
    }),
  ];
  const lastPartial = resolveLastTuitionPaymentDisplay(partial, invoiceId);
  assert.equal(lastPartial?.amount, 30000);
  assert.equal(lastPartial?.paymentMethod, 'card');

  assert.equal(getLatestTuitionPaymentForInvoice([], invoiceId), null);
  assert.equal(resolveLastTuitionPaymentDisplay([], invoiceId), null);
  assert.equal(lastTuitionPaymentSummaryText(null), null);

  const stale = staleInvoice();
  const mismatchPayments = [
    payment({
      id: 'pay-transfer',
      amount: 100000,
      paymentMethod: 'transfer',
      paymentDate: '2026-09-08',
    }),
  ];
  const display = resolveLastTuitionPaymentDisplay(mismatchPayments, stale.id);
  assert.equal(stale.paymentMethod, 'cash');
  assert.equal(display?.paymentMethod, 'transfer');
  assert.notEqual(display?.paymentMethod, stale.paymentMethod);
  assert.equal(lastTuitionPaymentSummaryText(display), '계좌이체 · 2026-09-08');

  const many = [
    payment({
      id: 'pay-old',
      amount: 10000,
      paymentMethod: 'cash',
      paymentDate: '2026-09-01',
      createdAt: '2026-09-01T09:00:00.000Z',
    }),
    payment({
      id: 'pay-mid',
      amount: 20000,
      paymentMethod: 'card',
      paymentDate: '2026-09-04',
      createdAt: '2026-09-04T09:00:00.000Z',
    }),
    payment({
      id: 'pay-same-date-earlier',
      amount: 25000,
      paymentMethod: 'cash',
      paymentDate: '2026-09-10',
      createdAt: '2026-09-10T08:00:00.000Z',
    }),
    payment({
      id: 'pay-newest',
      amount: 45000,
      paymentMethod: 'transfer',
      paymentDate: '2026-09-10',
      createdAt: '2026-09-10T18:00:00.000Z',
    }),
    payment({
      id: 'pay-other-invoice',
      invoiceId: 'inv-2',
      amount: 99999,
      paymentMethod: 'cash',
      paymentDate: '2026-09-20',
      createdAt: '2026-09-20T10:00:00.000Z',
    }),
  ];
  const newest = getLatestTuitionPaymentForInvoice(many, invoiceId);
  assert.equal(newest?.id, 'pay-newest');
  assert.equal(newest?.paymentMethod, 'transfer');

  const sameDateNoCreated = [
    payment({ id: 'pay-a', amount: 10000, paymentMethod: 'cash', paymentDate: '2026-09-10' }),
    payment({ id: 'pay-z', amount: 20000, paymentMethod: 'transfer', paymentDate: '2026-09-10' }),
  ];
  assert.equal(getLatestTuitionPaymentForInvoice(sameDateNoCreated, invoiceId)?.id, 'pay-z');

  const here = dirname(fileURLToPath(import.meta.url));
  const helperSrc = readFileSync(join(here, 'latestTuitionPayment.ts'), 'utf8');
  assert.equal(helperSrc.includes('invoice.paymentMethod'), false);
  assert.equal(helperSrc.includes('.paidAt'), false);
  assert.equal(helperSrc.includes('.paidDate'), false);

  const displayFiles = [
    '../../../core/academy/components/students/detail/StudentDetailTuitionTab.tsx',
    '../../../core/academy/components/tuition/TuitionInvoiceListView.tsx',
    '../../../modules/parent/views/ParentTuitionView.tsx',
    '../../../core/customer/CustomerHomeView.tsx',
  ];
  for (const relative of displayFiles) {
    const src = readFileSync(join(here, relative), 'utf8');
    assert.equal(src.includes('inv.paymentMethod'), false, relative);
    assert.equal(src.includes('invoice.paymentMethod'), false, relative);
    assert.equal(src.includes('invoice.paidAt'), false, relative);
    assert.equal(src.includes('invoice.paidDate'), false, relative);
    assert.match(src, /lastTuitionPaymentSummaryText|getLatestTuitionPaymentForInvoice/);
  }

  console.log('latestTuitionPayment.test.ts: ok');
}

run();
