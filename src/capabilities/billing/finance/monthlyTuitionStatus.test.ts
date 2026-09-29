/**
 * 월회비 납부 상태 판정·필터
 * 실행: npm run test:monthly-tuition-status
 */
import assert from 'node:assert/strict';
import type { Student, TuitionInvoice } from '@/types';
import {
  countMonthlyTuitionWorkStatuses,
  filterMonthlyTuitionWorkStudents,
  resolveMonthlyTuitionWorkStatus,
} from './monthlyTuitionStatus';

function student(
  partial: Pick<Student, 'id'> & Partial<Pick<Student, 'billingMode' | 'name'>>
): Pick<Student, 'id' | 'name' | 'billingMode'> {
  return {
    id: partial.id,
    name: partial.name ?? '원생',
    billingMode: partial.billingMode ?? 'monthly',
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
    dueDate: `${partial.yearMonth}-25`,
    status: partial.status ?? (partial.unpaidAmount > 0 ? 'unpaid' : 'paid'),
    invoiceSent: true,
    ...partial,
  };
}

function ids(
  rows: Array<Pick<Student, 'id'>>,
): string[] {
  return rows.map((row) => row.id);
}

function run() {
  const september = '2026-09';
  const august = '2026-08';
  const monthly = student({ id: 's1', name: '월회비' });

  // 1. 완납
  assert.equal(
    resolveMonthlyTuitionWorkStatus(
      monthly,
      [invoice({ id: 'paid', studentId: 's1', yearMonth: september, paidAmount: 180000, unpaidAmount: 0 })],
      september
    ),
    'paid'
  );

  // 2. 전액 미납
  assert.equal(
    resolveMonthlyTuitionWorkStatus(
      monthly,
      [invoice({ id: 'unpaid', studentId: 's1', yearMonth: september, paidAmount: 0, unpaidAmount: 180000 })],
      september
    ),
    'unpaid'
  );

  // 3. 일부 납부 (status=partial) → 업무상 미납
  assert.equal(
    resolveMonthlyTuitionWorkStatus(
      monthly,
      [
        invoice({
          id: 'partial',
          studentId: 's1',
          yearMonth: september,
          paidAmount: 100000,
          unpaidAmount: 80000,
          status: 'partial',
        }),
      ],
      september
    ),
    'unpaid'
  );

  // 4. 연체 (status=overdue, 미납 남음) → 업무상 미납
  assert.equal(
    resolveMonthlyTuitionWorkStatus(
      monthly,
      [
        invoice({
          id: 'overdue',
          studentId: 's1',
          yearMonth: september,
          paidAmount: 0,
          unpaidAmount: 180000,
          status: 'overdue',
        }),
      ],
      september
    ),
    'unpaid'
  );

  // 5. 청구서 없음
  assert.equal(resolveMonthlyTuitionWorkStatus(monthly, [], september), 'no_invoice');

  // 6. 회차권 학생은 판정·필터 대상 제외
  const sessionPass = student({ id: 'pass-1', name: '회차권', billingMode: 'session_pass' });
  assert.equal(
    resolveMonthlyTuitionWorkStatus(
      sessionPass,
      [invoice({ id: 'pass-inv', studentId: 'pass-1', yearMonth: september, paidAmount: 0, unpaidAmount: 180000 })],
      september
    ),
    null
  );

  // 7. 다른 월 청구서만 있으면 선택 월 기준 청구서 없음
  assert.equal(
    resolveMonthlyTuitionWorkStatus(
      monthly,
      [invoice({ id: 'aug-only', studentId: 's1', yearMonth: august, paidAmount: 180000, unpaidAmount: 0 })],
      september
    ),
    'no_invoice'
  );

  const roster = [
    student({ id: 'paid-1', name: '박완납' }),
    student({ id: 'unpaid-1', name: '김미납' }),
    student({ id: 'partial-1', name: '김일부' }),
    student({ id: 'overdue-1', name: '최연체' }),
    student({ id: 'none-1', name: '정무청구' }),
    student({ id: 'textbook-1', name: '이교재' }),
    student({ id: 'pass-1', name: '회차권', billingMode: 'session_pass' }),
  ];
  const invoices = [
    invoice({ id: 'sep-paid', studentId: 'paid-1', yearMonth: september, paidAmount: 180000, unpaidAmount: 0 }),
    invoice({ id: 'sep-unpaid', studentId: 'unpaid-1', yearMonth: september, paidAmount: 0, unpaidAmount: 180000 }),
    invoice({
      id: 'sep-partial',
      studentId: 'partial-1',
      yearMonth: september,
      paidAmount: 100000,
      unpaidAmount: 80000,
      status: 'partial',
    }),
    invoice({
      id: 'sep-overdue',
      studentId: 'overdue-1',
      yearMonth: september,
      paidAmount: 0,
      unpaidAmount: 180000,
      status: 'overdue',
    }),
    invoice({ id: 'aug-none', studentId: 'none-1', yearMonth: august, paidAmount: 180000, unpaidAmount: 0 }),
    invoice({
      id: 'sep-textbook',
      studentId: 'textbook-1',
      yearMonth: september,
      paidAmount: 180000,
      unpaidAmount: 0,
      textbookFee: 15000,
    }),
    invoice({ id: 'aug-paid-1', studentId: 'paid-1', yearMonth: august, paidAmount: 0, unpaidAmount: 180000 }),
    invoice({ id: 'aug-unpaid-1', studentId: 'unpaid-1', yearMonth: august, paidAmount: 180000, unpaidAmount: 0 }),
  ];

  assert.deepEqual(countMonthlyTuitionWorkStatuses(roster, invoices, september), {
    all: 6,
    paid: 2,
    unpaid: 3,
    no_invoice: 1,
  });

  assert.deepEqual(
    ids(filterMonthlyTuitionWorkStudents(roster, invoices, september, { statusFilter: 'all' })),
    ['paid-1', 'unpaid-1', 'partial-1', 'overdue-1', 'none-1', 'textbook-1']
  );
  assert.deepEqual(
    ids(filterMonthlyTuitionWorkStudents(roster, invoices, september, { statusFilter: 'paid' })),
    ['paid-1', 'textbook-1']
  );
  assert.deepEqual(
    ids(filterMonthlyTuitionWorkStudents(roster, invoices, september, { statusFilter: 'unpaid' })),
    ['unpaid-1', 'partial-1', 'overdue-1']
  );
  assert.deepEqual(
    ids(filterMonthlyTuitionWorkStudents(roster, invoices, september, { statusFilter: 'no_invoice' })),
    ['none-1']
  );

  // 8. 미납 필터 + 이름 "김"
  assert.deepEqual(
    ids(
      filterMonthlyTuitionWorkStudents(roster, invoices, september, {
        statusFilter: 'unpaid',
        searchQuery: '김',
      })
    ),
    ['unpaid-1', 'partial-1']
  );

  // 9. 월 변경 — 같은 원생도 선택 월 기준으로 다시 판정
  assert.deepEqual(
    ids(filterMonthlyTuitionWorkStudents(roster, invoices, august, { statusFilter: 'paid' })),
    ['unpaid-1', 'none-1']
  );
  assert.deepEqual(
    ids(filterMonthlyTuitionWorkStudents(roster, invoices, august, { statusFilter: 'unpaid' })),
    ['paid-1']
  );
  assert.equal(resolveMonthlyTuitionWorkStatus(student({ id: 'paid-1' }), invoices, august), 'unpaid');
  assert.equal(resolveMonthlyTuitionWorkStatus(student({ id: 'paid-1' }), invoices, september), 'paid');
  assert.equal(resolveMonthlyTuitionWorkStatus(student({ id: 'unpaid-1' }), invoices, august), 'paid');
  assert.equal(resolveMonthlyTuitionWorkStatus(student({ id: 'unpaid-1' }), invoices, september), 'unpaid');

  // 10. 교재비 미납과 월회비 분리 — 월회비 unpaidAmount=0이면 납부완료
  const textbookStudent = student({ id: 'textbook-1', name: '이교재' });
  assert.equal(resolveMonthlyTuitionWorkStatus(textbookStudent, invoices, september), 'paid');
  assert.ok(
    ids(filterMonthlyTuitionWorkStudents(roster, invoices, september, { statusFilter: 'paid' })).includes(
      'textbook-1'
    )
  );
  assert.equal(
    ids(
      filterMonthlyTuitionWorkStudents(roster, invoices, september, { statusFilter: 'unpaid' })
    ).includes('textbook-1'),
    false
  );

  console.log('monthlyTuitionStatus.test.ts: ok');
}

run();
