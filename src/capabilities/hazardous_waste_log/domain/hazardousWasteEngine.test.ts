import assert from 'node:assert/strict';
import {
  calculateStorageLimitDday,
  validateDischargeInput,
} from './hazardousWasteEngine';

function run() {
  const now = new Date('2026-10-18T00:00:00Z');

  // 1. D-Day 보관 기한 (10일 전 최초 투입, 15일 한도 -> 잔여 5일)
  const res1 = calculateStorageLimitDday('2026-10-08', 15, now);
  assert.equal(res1.deadlineDate, '2026-10-23');
  assert.equal(res1.daysRemaining, 5);
  assert.equal(res1.isOverdue, false);

  // 2. 기한 초과 (20일 전 투입 -> 5일 초과 위반)
  const res2 = calculateStorageLimitDday('2026-09-28', 15, now);
  assert.equal(res2.isOverdue, true);
  assert.ok(res2.daysRemaining < 0);

  // 3. 유효성 검증
  assert.equal(validateDischargeInput('BOX-991', 3.5).isValid, true);
  assert.equal(validateDischargeInput('', 3.5).isValid, false);
  assert.equal(validateDischargeInput('BOX-991', 0).isValid, false);

  console.log('hazardousWasteEngine.test.ts: ok');
}

run();
