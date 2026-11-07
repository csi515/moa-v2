import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatShortCurrency,
  resolveAttendanceBillingBadge,
  type AttendanceBillingStudent,
} from './pianoAttendanceBillingHelpers';
import type { StudentMonthlyBillingSummary } from '@/capabilities/billing/finance/billingLedgerTypes';

describe('pianoAttendanceBillingHelpers', () => {
  const dummyStudent: AttendanceBillingStudent = {
    id: 'student-1',
    name: '김민지',
    paymentDay: 10,
    tuitionFee: 280000,
  };

  const dummySummary = (unpaid: number): StudentMonthlyBillingSummary => ({
    studentId: 'student-1',
    studentName: '김민지',
    yearMonth: '2026-11',
    tuitionBilled: 280000,
    tuitionPaid: 280000 - unpaid,
    tuitionUnpaid: unpaid,
    tuitionStatus: unpaid === 0 ? 'paid' : 'unpaid',
    textbookBilled: 0,
    textbookPaid: 0,
    textbookUnpaid: 0,
    textbookStatus: 'paid',
    totalBilled: 280000,
    totalPaid: 280000 - unpaid,
    totalUnpaid: unpaid,
    grandUnpaid: unpaid,
  });

  it('formatShortCurrency는 만원 단위로 올바르게 포맷해야 한다', () => {
    assert.equal(formatShortCurrency(280000), '28만원');
    assert.equal(formatShortCurrency(50000), '5만원');
    assert.equal(formatShortCurrency(1250000), '125만원');
    assert.equal(formatShortCurrency(285000), '28.5만원');
    assert.equal(formatShortCurrency(0), '0원');
  });

  it('결제일 당일이고 미납이 있는 경우 오늘 결제일 뱃지를 반환해야 한다', () => {
    const badge = resolveAttendanceBillingBadge(
      dummyStudent,
      '2026-11-10',
      dummySummary(280000)
    );

    assert.ok(badge);
    assert.equal(badge.type, 'due_today');
    assert.equal(badge.label, '오늘 결제일 · 28만원');
    assert.equal(badge.isActionable, true);
  });

  it('결제일이 지났고 미납이 있는 경우 미납 D+N일 뱃지를 반환해야 한다', () => {
    const badge = resolveAttendanceBillingBadge(
      dummyStudent,
      '2026-11-15',
      dummySummary(280000)
    );

    assert.ok(badge);
    assert.equal(badge.type, 'overdue');
    assert.equal(badge.label, '미납 D+5일 · 28만원');
    assert.equal(badge.isActionable, true);
  });

  it('결제일 전인데도 누적 미납이 있는 경우 미납 뱃지를 반환해야 한다', () => {
    const badge = resolveAttendanceBillingBadge(
      dummyStudent,
      '2026-11-03',
      dummySummary(280000)
    );

    assert.ok(badge);
    assert.equal(badge.type, 'overdue');
    assert.equal(badge.label, '미납 · 28만원');
    assert.equal(badge.isActionable, true);
  });

  it('미납은 없으나 오늘이 결제일인 경우 오늘 결제일 뱃지를 반환해야 한다', () => {
    const badge = resolveAttendanceBillingBadge(
      dummyStudent,
      '2026-11-10',
      dummySummary(0)
    );

    assert.ok(badge);
    assert.equal(badge.type, 'due_today');
    assert.equal(badge.label, '오늘 결제일');
    assert.equal(badge.unpaidAmount, 0);
  });

  it('결제일 3일 전(D-3)인 경우 결제 D-3 뱃지를 반환해야 한다', () => {
    const badge = resolveAttendanceBillingBadge(
      dummyStudent,
      '2026-11-07',
      dummySummary(0)
    );

    assert.ok(badge);
    assert.equal(badge.type, 'due_soon');
    assert.equal(badge.label, '결제 D-3');
  });

  it('결제일과 무관한 평상시 완납 상태는 null을 반환해야 한다', () => {
    const badge = resolveAttendanceBillingBadge(
      dummyStudent,
      '2026-11-20',
      dummySummary(0)
    );

    assert.equal(badge, null);
  });
});
