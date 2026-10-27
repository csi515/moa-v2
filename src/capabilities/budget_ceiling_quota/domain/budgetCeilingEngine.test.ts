import assert from 'node:assert/strict';
import {
  calculateRemainingBudget,
  calculateBudgetUsageRate,
  checkSpendEligibility,
} from './budgetCeilingEngine';

function run() {
  // 1. calculateRemainingBudget & calculateBudgetUsageRate
  // 한도 1,000,000원, 지출 650,000원 -> 잔여 350,000원, 사용률 65.0%
  assert.equal(calculateRemainingBudget(1000000, 650000), 350000);
  assert.equal(calculateBudgetUsageRate(1000000, 650000), 65.0);

  // 2. checkSpendEligibility - 한도 내 정상 지출 (신규 200,000원)
  const okCase = checkSpendEligibility(1000000, 650000, 200000, 'block');
  assert.equal(okCase.isAllowed, true);
  assert.equal(okCase.overAmount, 0);
  assert.equal(okCase.projectedSpent, 850000);

  // 3. checkSpendEligibility - 초과 시 block 정책 (신규 400,000원 -> 1,050,000원, 50,000원 초과)
  const blockCase = checkSpendEligibility(1000000, 650000, 400000, 'block');
  assert.equal(blockCase.isAllowed, false);
  assert.equal(blockCase.overAmount, 50000);
  assert.ok(blockCase.warningMessage?.includes('차단'));

  // 4. checkSpendEligibility - 초과 시 warn_only 정책
  const warnCase = checkSpendEligibility(1000000, 650000, 400000, 'warn_only');
  assert.equal(warnCase.isAllowed, true);
  assert.equal(warnCase.overAmount, 50000);
  assert.ok(warnCase.warningMessage?.includes('특별 승인'));

  console.log('budgetCeilingEngine tests passed!');
}

run();
