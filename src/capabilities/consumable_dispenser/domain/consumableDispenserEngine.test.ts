import assert from 'node:assert/strict';
import {
  computeDispenseCost,
  isBudgetExceeded,
  validateDispenseInput,
} from './consumableDispenserEngine';

function run() {
  // 1. 소모 비용 계산 (단가 24,000원 * 3박스 = 72,000원)
  assert.equal(computeDispenseCost(24000, 3), 72000);

  // 2. 부서 예산 초과 여부
  assert.equal(isBudgetExceeded(250000, 72000, 300000), true); // 322,000 > 300,000
  assert.equal(isBudgetExceeded(100000, 50000, 300000), false);

  // 3. 유효성 검증
  assert.equal(validateDispenseInput('A4 용지', 2, '초등부', '김선생').isValid, true);
  assert.equal(validateDispenseInput('', 2, '초등부', '김선생').isValid, false);
  assert.equal(validateDispenseInput('A4 용지', 0, '초등부', '김선생').isValid, false);

  console.log('consumableDispenserEngine.test.ts: ok');
}

run();
