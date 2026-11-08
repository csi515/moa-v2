import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTodayAttendanceStatus,
  getTuitionSummaryText,
  type AttendanceLikeRecord,
} from './student360Helpers';

describe('student360Helpers', () => {
  it('오늘 출결 상태를 정확하게 판별해야 한다', () => {
    const records: AttendanceLikeRecord[] = [
      { id: 'att-1', date: '2026-11-07', status: 'present' },
      { id: 'att-2', date: '2026-11-08', status: 'present' },
    ];

    const todayStatus = getTodayAttendanceStatus(records, '2026-11-08');
    assert.equal(todayStatus.isChecked, true);
    assert.equal(todayStatus.status, 'present');
    assert.equal(todayStatus.label, '오늘 출석 완료');

    const futureStatus = getTodayAttendanceStatus(records, '2026-11-09');
    assert.equal(futureStatus.isChecked, false);
    assert.equal(futureStatus.label, '오늘 미체크');
  });

  it('수강료 미납 여부와 뱃지 텍스트를 정확하게 산출해야 한다', () => {
    const unpaidSummary = { unpaidAmount: 180000 };
    const res1 = getTuitionSummaryText(unpaidSummary);
    assert.equal(res1.hasUnpaid, true);
    assert.equal(res1.unpaidAmount, 180000);
    assert.equal(res1.badgeLabel, '미납 180,000원');

    const paidSummary = { unpaidAmount: 0 };
    const res2 = getTuitionSummaryText(paidSummary);
    assert.equal(res2.hasUnpaid, false);
    assert.equal(res2.unpaidAmount, 0);
    assert.equal(res2.badgeLabel, '당월 완납');
  });
});
