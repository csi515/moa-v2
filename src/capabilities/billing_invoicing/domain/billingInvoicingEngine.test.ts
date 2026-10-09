import assert from 'node:assert/strict';
import {
  calculateBillingDueTargets,
  transitionInvoiceStatus,
  generateInvoiceShareText,
  type BillingMember,
  type InvoiceRecord,
} from './billingInvoicingEngine';

function run() {
  const members: BillingMember[] = [
    {
      id: 'm-1',
      name: '홍길동',
      billingDay: 25,
      monthlyAmount: 200000,
      isActive: true,
      enrollmentStartDate: '2026-01-01',
    },
    {
      id: 'm-2',
      name: '이순신',
      billingDay: 25,
      monthlyAmount: 250000,
      isActive: true,
      enrollmentStartDate: '2026-03-01',
    },
    {
      id: 'm-3',
      name: '강감찬',
      billingDay: 10, // 다른 청구일
      monthlyAmount: 180000,
      isActive: true,
      enrollmentStartDate: '2026-02-01',
    },
    {
      id: 'm-4',
      name: '휴면회원',
      billingDay: 25,
      monthlyAmount: 200000,
      isActive: false, // 비활성
      enrollmentStartDate: '2026-01-01',
    },
  ];

  // 1. 매월 25일 정기 청구 대상자 산출 (홍길동, 이순신 2명 / 총 450,000원)
  const targets = calculateBillingDueTargets(members, '2026-06', 25);
  assert.equal(targets.dueMembers.length, 2);
  assert.equal(targets.totalExpectedAmount, 450000);
  assert.deepEqual(
    targets.dueMembers.map((m) => m.name),
    ['홍길동', '이순신']
  );

  // 2. 청구서 납부 상태 머신 전이 (PENDING -> PAID)
  const invoice: InvoiceRecord = {
    id: 'inv-1',
    memberId: 'm-1',
    memberName: '홍길동',
    amount: 200000,
    billingYearMonth: '2026-06',
    dueDate: '2026-06-30',
    status: 'PENDING',
  };

  const paid = transitionInvoiceStatus(invoice, 'PAY', {
    paidAt: '2026-06-25T14:00:00Z',
  });
  assert.equal(paid.success, true);
  assert.equal(paid.updatedInvoice.status, 'PAID');
  assert.equal(paid.updatedInvoice.paidAt, '2026-06-25T14:00:00Z');

  // 3. 연체 및 면제 전이
  const overdue = transitionInvoiceStatus(invoice, 'MARK_OVERDUE');
  assert.equal(overdue.success, true);
  assert.equal(overdue.updatedInvoice.status, 'OVERDUE');

  const waived = transitionInvoiceStatus(overdue.updatedInvoice, 'WAIVE', {
    waiveReason: '장학 혜택 100% 감면',
  });
  assert.equal(waived.success, true);
  assert.equal(waived.updatedInvoice.status, 'WAIVED');
  assert.equal(waived.updatedInvoice.waiveReason, '장학 혜택 100% 감면');

  // 4. Web Share 청구서 텍스트 생성 검증 (0원 비용 원칙)
  const share = generateInvoiceShareText({
    orgName: '모아피아노학원',
    memberName: '홍길동',
    billingYearMonth: '2026년 6월',
    amount: 200000,
    dueDate: '2026-06-30',
    bankName: '토스뱅크',
    accountNumber: '1000-1234-5678',
    accountHolder: '모아원장',
  });

  assert.match(share.title, /모아피아노학원/);
  assert.match(share.text, /홍길동/);
  assert.match(share.text, /200,000원/);
  assert.match(share.text, /2026-06-30/);
  assert.match(share.text, /1000-1234-5678/);

  console.log('billingInvoicingEngine.test.ts: ok');
}

run();
