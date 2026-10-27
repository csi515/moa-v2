import assert from 'node:assert/strict';
import {
  evaluateDeviceCalibration,
  validateDeviceInput,
} from './calibrationEngine';

function run() {
  const now = new Date('2026-10-18T00:00:00Z');

  // 1. 유효/정상 상태 (6개월 전 교정, 12개월 주기)
  const validRes = evaluateDeviceCalibration('2026-04-18', 12, 0.5, 2.0, now);
  assert.equal(validRes.status, 'CALIBRATED_VALID');
  assert.ok(validRes.daysRemaining > 30);

  // 2. 만료 임박 상태 (11개월 15일 전 교정 -> 잔여 15일)
  const warnRes = evaluateDeviceCalibration('2025-11-01', 12, 0.8, 2.0, now);
  assert.equal(warnRes.status, 'WARNING_EXPIRING_SOON');

  // 3. 만료 초과
  const expiredRes = evaluateDeviceCalibration('2025-01-01', 12, 0.5, 2.0, now);
  assert.equal(expiredRes.status, 'EXPIRED_OVERDUE');

  // 4. 허용 오차 초과 (불합격)
  const ootRes = evaluateDeviceCalibration('2026-10-01', 12, 3.5, 2.0, now);
  assert.equal(ootRes.status, 'OUT_OF_TOLERANCE');

  // 5. 유효성 검증
  assert.equal(validateDeviceInput('인바디 770', 'IB-99214').isValid, true);
  assert.equal(validateDeviceInput('', 'IB-99214').isValid, false);

  console.log('calibrationEngine.test.ts: ok');
}

run();
