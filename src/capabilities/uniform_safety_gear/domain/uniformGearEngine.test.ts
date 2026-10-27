import assert from 'node:assert/strict';
import {
  calculateUnreturnedPenalty,
  transitionUniformStatus,
  validateAssignmentInput,
} from './uniformGearEngine';

function run() {
  // 1. 변상금 계산 (미반납 2벌 * 30,000원 = 60,000원)
  assert.equal(calculateUnreturnedPenalty(2, 30000), 60000);

  // 2. 상태 전이
  assert.equal(transitionUniformStatus('ASSIGNED', 'RETURN').nextStatus, 'RETURNED_CLEAN');
  assert.equal(transitionUniformStatus('ASSIGNED', 'REPORT_LOST').nextStatus, 'LOST_COMPENSATED');
  assert.equal(transitionUniformStatus('RETURNED_CLEAN', 'REPORT_LOST').isAllowed, false);

  // 3. 유효성 검증
  assert.equal(validateAssignmentInput('박셰프', 'L (100)', 2).isValid, true);
  assert.equal(validateAssignmentInput('', 'L', 2).isValid, false);
  assert.equal(validateAssignmentInput('박셰프', '', 2).isValid, false);

  console.log('uniformGearEngine.test.ts: ok');
}

run();
