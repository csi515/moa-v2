/**
 * 동일 학생·동일 연월 청구 중복 방지
 * 실행: npx tsx src/core/finance/invoiceDedupe.test.ts
 */
import assert from 'node:assert/strict';
import type { TuitionInvoice } from '@/types';
import { findExistingStudentMonthInvoice } from './invoiceDedupe';

function makeInvoice(partial: Partial<TuitionInvoice> & Pick<TuitionInvoice, 'id' | 'studentId' | 'yearMonth'>): TuitionInvoice {
  return {
    studentName: '테스트',
    title: `${partial.yearMonth} 수강료`,
    baseFee: 100000,
    discount: 0,
    totalAmount: 100000,
    paidAmount: 0,
    unpaidAmount: 100000,
    dueDate: `${partial.yearMonth}-10`,
    status: 'unpaid',
    invoiceSent: false,
    sentAt: null,
    ...partial,
  } as TuitionInvoice;
}

const list: TuitionInvoice[] = [
  makeInvoice({ id: 'inv-a-draft', studentId: 's1', yearMonth: '2026-09', invoiceSent: false }),
  makeInvoice({
    id: 'inv-a-sent',
    studentId: 's1',
    yearMonth: '2026-08',
    invoiceSent: true,
    sentAt: '2026-08-01T00:00:00.000Z',
  }),
  makeInvoice({ id: 'inv-b', studentId: 's2', yearMonth: '2026-09', invoiceSent: false }),
];

// 초안만 있어도 동일 월은 기존 건 반환
const draft = findExistingStudentMonthInvoice(list, 's1', '2026-09');
assert.ok(draft);
assert.equal(draft.id, 'inv-a-draft');

// 발송된 청구서도 중복 생성 대상이 아님
const sent = findExistingStudentMonthInvoice(list, 's1', '2026-08');
assert.ok(sent);
assert.equal(sent.id, 'inv-a-sent');
assert.equal(sent.invoiceSent, true);

// 다른 월은 없음 → undefined (신규 생성 가능)
assert.equal(findExistingStudentMonthInvoice(list, 's1', '2026-10'), undefined);

// 다른 학생 동일 월은 별개
const other = findExistingStudentMonthInvoice(list, 's2', '2026-09');
assert.ok(other);
assert.equal(other.id, 'inv-b');

// 초안+발송이 같은 달에 있으면 발송분 우선
const dupMonth: TuitionInvoice[] = [
  makeInvoice({ id: 'inv-draft', studentId: 's9', yearMonth: '2026-07', invoiceSent: false }),
  makeInvoice({
    id: 'inv-sent',
    studentId: 's9',
    yearMonth: '2026-07',
    invoiceSent: true,
    sentAt: '2026-07-05T00:00:00.000Z',
  }),
];
const preferSent = findExistingStudentMonthInvoice(dupMonth, 's9', '2026-07');
assert.ok(preferSent);
assert.equal(preferSent.id, 'inv-sent');

console.log('invoiceDedupe.test.ts: all assertions passed');
