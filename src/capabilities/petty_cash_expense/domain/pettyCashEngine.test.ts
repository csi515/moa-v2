import assert from 'node:assert/strict';
import {
  deductPettyCash,
  validateExpenseClaim,
} from './pettyCashEngine';

function run() {
  // 1. 전도금 차감 (잔액 300,000원 - 지출 45,000원 = 255,000원)
  const res1 = deductPettyCash(300000, 45000);
  assert.equal(res1.isSufficient, true);
  assert.equal(res1.remainingBalance, 255000);

  // 2. 잔액 부족 에러 방어
  const res2 = deductPettyCash(30000, 50000);
  assert.equal(res2.isSufficient, false);

  // 3. 유효성 검증
  assert.equal(validateExpenseClaim('종량제 봉투 구매', 12000, '김매니저').isValid, true);
  assert.equal(validateExpenseClaim('', 12000, '김매니저').isValid, false);
  assert.equal(validateExpenseClaim('봉투', 0, '김매니저').isValid, false);

  console.log('pettyCashEngine.test.ts: ok');
}

run();
