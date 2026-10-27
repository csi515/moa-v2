import assert from 'node:assert/strict';
import {
  validateCardUid,
  transitionCardStatus,
  calculateReissueFee,
} from './lostCardEngine';

function run() {
  // 1. UID 검증
  assert.equal(validateCardUid('04A1B2C3D4').isValid, true);
  assert.equal(validateCardUid('').isValid, false);
  assert.equal(validateCardUid('12').isValid, false);

  // 2. 상태 전이 검증
  assert.equal(transitionCardStatus('IN_STOCK', 'ISSUE').nextStatus, 'ISSUED');
  assert.equal(transitionCardStatus('ISSUED', 'SUSPEND').nextStatus, 'SUSPENDED');
  assert.equal(transitionCardStatus('SUSPENDED', 'REACTIVATE').nextStatus, 'ISSUED');
  assert.equal(transitionCardStatus('ISSUED', 'REPORT_LOST').nextStatus, 'LOST');
  assert.equal(transitionCardStatus('IN_STOCK', 'REPORT_LOST').isAllowed, false);
  assert.equal(transitionCardStatus('ISSUED', 'RETURN').nextStatus, 'RETURNED');
  assert.equal(transitionCardStatus('LOST', 'DISCARD').nextStatus, 'DISCARDED');

  // 3. 수수료 계산
  assert.equal(calculateReissueFee(5000, false), 5000);
  assert.equal(calculateReissueFee(5000, true), 0);

  console.log('lostCardEngine.test.ts: ok');
}

run();
