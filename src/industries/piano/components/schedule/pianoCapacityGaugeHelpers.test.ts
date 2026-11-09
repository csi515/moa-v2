import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateSlotCapacity,
  summarizeDayCapacity,
  SlotCapacityInfo,
} from './pianoCapacityGaugeHelpers';

test('calculateSlotCapacity: 여유 슬롯 판별 (3/5명)', () => {
  const cap = calculateSlotCapacity('월', '14:00', 3, 5);
  assert.equal(cap.level, 'available');
  assert.equal(cap.percentage, 60);
  assert.equal(cap.badgeLabel, '3/5명');
  assert.ok(cap.toneClass.includes('emerald'));
});

test('calculateSlotCapacity: 정원 마감 슬롯 판별 (5/5명)', () => {
  const cap = calculateSlotCapacity('화', '15:00', 5, 5);
  assert.equal(cap.level, 'full');
  assert.equal(cap.percentage, 100);
  assert.equal(cap.badgeLabel, '5/5명 마감');
  assert.ok(cap.toneClass.includes('amber'));
});

test('calculateSlotCapacity: 정원 초과 슬롯 판별 (6/5명)', () => {
  const cap = calculateSlotCapacity('수', '16:00', 6, 5);
  assert.equal(cap.level, 'overflow');
  assert.equal(cap.percentage, 120);
  assert.equal(cap.badgeLabel, '6/5명 초과!');
  assert.ok(cap.toneClass.includes('rose'));
});

test('summarizeDayCapacity: 요일별 슬롯 상태 종합 요약', () => {
  const list: SlotCapacityInfo[] = [
    calculateSlotCapacity('목', '14:00', 2, 5), // available
    calculateSlotCapacity('목', '15:00', 5, 5), // full
    calculateSlotCapacity('목', '16:00', 7, 5), // overflow
    calculateSlotCapacity('목', '17:00', 3, 5), // available
  ];

  const summary = summarizeDayCapacity(list);
  assert.equal(summary.totalStudents, 17);
  assert.equal(summary.availableSlotCount, 2);
  assert.equal(summary.fullSlotCount, 1);
  assert.equal(summary.overflowSlotCount, 1);
});
