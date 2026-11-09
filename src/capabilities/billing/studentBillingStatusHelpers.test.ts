import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveStudentUnpaidBadge } from './studentBillingStatusHelpers';

test('resolveStudentUnpaidBadge: 미납 금액이 0원이거나 음수면 null 반환', () => {
  assert.equal(resolveStudentUnpaidBadge('s1', 0), null);
  assert.equal(resolveStudentUnpaidBadge('s2', -5000), null);
});

test('resolveStudentUnpaidBadge: 결제일 경과 미납 뱃지 정상 생성', () => {
  // 현재 일자: 15일, 결제일: 10일 -> 결제일 경과 (isOverdue: true)
  const badge = resolveStudentUnpaidBadge('s1', 180000, 10, 15);
  assert.ok(badge);
  assert.equal(badge.label, '미납 18만');
  assert.equal(badge.isOverdue, true);
  assert.ok(badge.tooltip.includes('결제일 경과'));
});

test('resolveStudentUnpaidBadge: 결제일 이전 미납 뱃지 정상 생성', () => {
  // 현재 일자: 5일, 결제일: 10일 -> 결제일 전 (isOverdue: false)
  const badge = resolveStudentUnpaidBadge('s2', 200000, 10, 5);
  assert.ok(badge);
  assert.equal(badge.label, '미납 20만');
  assert.equal(badge.isOverdue, false);
});
