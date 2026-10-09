import assert from 'node:assert/strict';
import {
  evaluatePassValidity,
  deductPassUsage,
  type PassDefinition,
} from './passesEngine';

function run() {
  const activeCountPass: PassDefinition = {
    id: 'pass-1',
    customerId: 'cust-1',
    passType: 'COUNT_BASED',
    status: 'ACTIVE',
    totalCount: 10,
    remainingCount: 2,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  };

  // 1. 유효성 체크
  const validCheck = evaluatePassValidity(activeCountPass, '2026-06-01');
  assert.equal(validCheck.canUse, true);
  assert.equal(validCheck.status, 'ACTIVE');

  // 2. 사용 차감
  const use1 = deductPassUsage(activeCountPass, '2026-06-01');
  assert.equal(use1.success, true);
  assert.equal(use1.updatedPass.remainingCount, 1);
  assert.equal(use1.updatedPass.status, 'ACTIVE');

  // 3. 마지막 1회 차감 -> 소진
  const use2 = deductPassUsage(use1.updatedPass, '2026-06-02');
  assert.equal(use2.success, true);
  assert.equal(use2.updatedPass.remainingCount, 0);
  assert.equal(use2.updatedPass.status, 'EXHAUSTED');

  // 4. 소진 후 사용 시도 -> 실패
  const use3 = deductPassUsage(use2.updatedPass, '2026-06-03');
  assert.equal(use3.success, false);
  assert.equal(use3.error, 'NO_REMAINING_COUNT');

  // 5. 기간 만료 체크
  const expiredCheck = evaluatePassValidity(activeCountPass, '2027-01-01');
  assert.equal(expiredCheck.canUse, false);
  assert.equal(expiredCheck.reason, 'EXPIRED');

  // 6. 일시정지 패스
  const pausedPass: PassDefinition = { ...activeCountPass, status: 'PAUSED' };
  assert.equal(evaluatePassValidity(pausedPass, '2026-06-01').canUse, false);

  console.log('passesEngine.test.ts: ok');
}

run();
