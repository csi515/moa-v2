import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveTodayBirthdayStudents,
  resolveTodayPaymentBriefing,
  buildDailyOneLineSummary,
  type BriefingStudentLike,
  type BriefingInvoiceLike,
  type TodayAttendanceBriefing,
  type TodayCareAlertBriefing,
} from './pianoTodayBriefingHelpers';

describe('pianoTodayBriefingHelpers', () => {
  const mockStudents: BriefingStudentLike[] = [
    {
      id: 's-1',
      name: '김민준',
      birthDate: '2015-11-08',
      grade: '초3',
      paymentDay: 8,
      tuitionFee: 220000,
      status: 'active',
    },
    {
      id: 's-2',
      name: '김서아',
      birthDate: '2018-05-20',
      grade: '유치부',
      paymentDay: 15,
      tuitionFee: 160000,
      status: 'active',
    },
    {
      id: 's-3',
      name: '박도현',
      birthDate: '2014-11-08',
      grade: '초5',
      paymentDay: 8,
      tuitionFee: 200000,
      status: 'active',
    },
  ];

  it('오늘 생일인 원생을 정확하게 찾아내야 한다', () => {
    const birthdays = resolveTodayBirthdayStudents(mockStudents, '2026-11-08');
    assert.equal(birthdays.length, 2);
    assert.equal(birthdays[0].name, '김민준');
    assert.equal(birthdays[1].name, '박도현');

    const noBirthdays = resolveTodayBirthdayStudents(mockStudents, '2026-11-09');
    assert.equal(noBirthdays.length, 0);
  });

  it('오늘 수강료 결제일인 원생 및 미납 현황을 올바르게 산출해야 한다', () => {
    const mockInvoices: BriefingInvoiceLike[] = [
      { id: 'inv-1', studentId: 's-1', unpaidAmount: 220000 },
      { id: 'inv-2', studentId: 's-2', unpaidAmount: 160000 },
    ];

    const paymentBriefing = resolveTodayPaymentBriefing(mockStudents, mockInvoices, '2026-11-08');
    assert.equal(paymentBriefing.todayDueCount, 2); // s-1, s-3 (paymentDay 8)
    assert.equal(paymentBriefing.todayDueAmount, 420000); // 220,000 + 200,000
    assert.equal(paymentBriefing.totalUnpaidCount, 2);
    assert.equal(paymentBriefing.totalUnpaidAmount, 380000);
  });

  it('3초 한줄 브리핑 요약 멘트를 알맞게 조합해야 한다', () => {
    const attendance: TodayAttendanceBriefing = {
      totalExpected: 18,
      presentCount: 5,
      uncheckedCount: 13,
      absentCount: 0,
    };
    const birthdays = [{ id: 's-1', name: '김민준', birthDate: '2015-11-08', isToday: true }];
    const payment = {
      todayDueCount: 2,
      todayDueAmount: 420000,
      totalUnpaidCount: 1,
      totalUnpaidAmount: 160000,
      studentNames: ['김민준', '박도현'],
    };
    const careAlert: TodayCareAlertBriefing = {
      makeupPendingCount: 1,
      absentCount: 0,
      needsAttentionCount: 1,
    };

    const summary = buildDailyOneLineSummary(attendance, birthdays, payment, careAlert);
    assert.ok(summary.includes('김민준 원생의 생일입니다!'));
    assert.ok(summary.includes('총 18명의 원생 등원이 예정'));
    assert.ok(summary.includes('보강 대기 원생이 1명'));
    assert.ok(summary.includes('오늘 수강료 결제 예정 원생은 2명'));
  });
});
