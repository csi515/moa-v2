import assert from 'node:assert/strict';
import {
  calculateTotalFromDenominations,
  computeExpectedCash,
  computeDiscrepancy,
  validateReconciliationInput,
} from './posReconciliationEngine';

function run() {
  // 1. 화폐 권종별 합산 검증
  const total = calculateTotalFromDenominations({
    bill_50000: 2, // 100,000
    bill_10000: 5, // 50,000
    bill_5000: 2,  // 10,000
    bill_1000: 10, // 10,000
    coin_500: 4,   // 2,000
    coin_100: 10,  // 1,000
  });
  assert.equal(total, 173000);

  // 2. 장부상 기대 현금 계산
  const expected = computeExpectedCash(100000, 250000, 20000, 10000);
  assert.equal(expected, 320000);

  // 3. 일치 및 과부족 판정
  const balanced = computeDiscrepancy(320000, 320000);
  assert.equal(balanced.difference, 0);
  assert.equal(balanced.status, 'BALANCED');

  const shortage = computeDiscrepancy(320000, 315000);
  assert.equal(shortage.difference, -5000);
  assert.equal(shortage.status, 'DISCREPANCY');

  // 4. 유효성 검증
  assert.equal(validateReconciliationInput('메인포스 1호', 100000, 300000).isValid, true);
  assert.equal(validateReconciliationInput('', 100000, 300000).isValid, false);
  assert.equal(validateReconciliationInput('메인포스', -100, 300000).isValid, false);

  console.log('posReconciliationEngine.test.ts: ok');
}

run();
