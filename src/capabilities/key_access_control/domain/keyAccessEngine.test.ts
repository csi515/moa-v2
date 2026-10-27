import assert from 'node:assert/strict';
import {
  checkPinRotationNeeded,
  checkoutKey,
  returnKey,
} from './keyAccessEngine';

function run() {
  const now = new Date('2026-10-18T00:00:00Z');

  // 1. PIN 교체 주기 (90일 기준)
  // 30일 전 교정 -> 교체 불필요
  assert.equal(checkPinRotationNeeded('2026-09-18', 90, now).needsRotation, false);
  // 100일 전 교정 -> 교체 필요
  assert.equal(checkPinRotationNeeded('2026-07-01', 90, now).needsRotation, true);
  // 기록 없음 -> 즉시 필요
  assert.equal(checkPinRotationNeeded(undefined, 90, now).needsRotation, true);

  // 2. 열쇠 대출 및 반납
  const outRes = checkoutKey('AVAILABLE', '박선생', '주말 보충 수업');
  assert.equal(outRes.isAllowed, true);
  assert.equal(outRes.nextState, 'CHECKED_OUT');

  const failOut = checkoutKey('CHECKED_OUT', '이선생', '수업');
  assert.equal(failOut.isAllowed, false);

  const retRes = returnKey('CHECKED_OUT');
  assert.equal(retRes.isAllowed, true);
  assert.equal(retRes.nextState, 'AVAILABLE');

  console.log('keyAccessEngine.test.ts: ok');
}

run();
