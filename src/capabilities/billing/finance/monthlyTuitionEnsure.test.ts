/**
 * 선택 월 월회비 청구 자동 보장 — 없는 건만
 * 실행: npm run test:monthly-tuition-ensure
 */
import assert from 'node:assert/strict';
import type { Student, TuitionInvoice } from '@/types';
import { listMonthlyTuitionMissingInvoices } from './monthlyTuitionEnsure';

function student(
  partial: Pick<Student, 'id'> & Partial<Pick<Student, 'billingMode' | 'status' | 'joinDate' | 'name'>>
): Pick<Student, 'id' | 'name' | 'billingMode' | 'status' | 'joinDate'> {
  return {
    id: partial.id,
    name: partial.name ?? '원생',
    billingMode: partial.billingMode ?? 'monthly',
    status: partial.status ?? 'active',
    joinDate: partial.joinDate ?? '2026-01-01',
  };
}

function invoice(
  partial: Partial<TuitionInvoice> &
    Pick<TuitionInvoice, 'id' | 'studentId' | 'yearMonth' | 'paidAmount' | 'unpaidAmount'>
): TuitionInvoice {
  const total = (partial.paidAmount ?? 0) + (partial.unpaidAmount ?? 0);
  return {
    studentName: '원생',
    title: `${partial.yearMonth} 수강료`,
    baseFee: 180000,
    discount: 0,
    totalAmount: partial.totalAmount ?? total,
    dueDate: `${partial.yearMonth}-10`,
    status: partial.status ?? (partial.unpaidAmount > 0 ? 'unpaid' : 'paid'),
    invoiceSent: true,
    ...partial,
  };
}

function run() {
  const september = '2026-09';
  const roster = [
    student({ id: 'has-1' }),
    student({ id: 'has-2' }),
    student({ id: 'missing-1' }),
    student({ id: 'missing-2' }),
    student({ id: 'missing-3' }),
    student({ id: 'pass-1', billingMode: 'session_pass' }),
    student({ id: 'out-1', status: 'withdrawn' }),
    student({ id: 'leave-1', status: 'leave' }),
  ];
  const existing = [
    invoice({
      id: 'paid',
      studentId: 'has-1',
      yearMonth: september,
      paidAmount: 180000,
      unpaidAmount: 0,
      status: 'paid',
    }),
    invoice({
      id: 'partial',
      studentId: 'has-2',
      yearMonth: september,
      paidAmount: 100000,
      unpaidAmount: 80000,
      status: 'partial',
    }),
    invoice({
      id: 'aug',
      studentId: 'missing-1',
      yearMonth: '2026-08',
      paidAmount: 0,
      unpaidAmount: 180000,
    }),
  ];

  const missing = listMonthlyTuitionMissingInvoices(roster, existing, september, september);
  assert.deepEqual(
    missing.map((row) => row.id),
    ['missing-1', 'missing-2', 'missing-3']
  );

  const afterEnsure = [
    ...existing,
    invoice({ id: 'new-1', studentId: 'missing-1', yearMonth: september, paidAmount: 0, unpaidAmount: 180000 }),
    invoice({ id: 'new-2', studentId: 'missing-2', yearMonth: september, paidAmount: 0, unpaidAmount: 180000 }),
    invoice({ id: 'new-3', studentId: 'missing-3', yearMonth: september, paidAmount: 0, unpaidAmount: 180000 }),
  ];
  assert.deepEqual(listMonthlyTuitionMissingInvoices(roster, afterEnsure, september, september), []);

  const paidBefore = existing.find((row) => row.id === 'paid');
  const paidAfter = afterEnsure.find((row) => row.id === 'paid');
  assert.deepEqual(paidBefore, paidAfter);
  assert.equal(paidAfter?.paidAmount, 180000);
  assert.equal(paidAfter?.status, 'paid');

  const cancelledOnly = [
    invoice({
      id: 'cancelled',
      studentId: 'missing-1',
      yearMonth: september,
      paidAmount: 0,
      unpaidAmount: 180000,
      status: 'cancelled',
    }),
  ];
  assert.deepEqual(
    listMonthlyTuitionMissingInvoices([student({ id: 'missing-1' })], cancelledOnly, september, september).map(
      (row) => row.id
    ),
    ['missing-1']
  );

  console.log('monthlyTuitionEnsure.test.ts: ok');
}

run();
