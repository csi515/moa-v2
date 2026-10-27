import assert from 'node:assert/strict';
import {
  evaluateWarrantyEligibility,
  validateClaimInput,
} from './warrantyClaimEngine';

function run() {
  // 1. 보증 기간(7일) 내 접수 (3일 후 접수 -> 무상 적격)
  const res1 = evaluateWarrantyEligibility('2026-10-10', '2026-10-13', 7);
  assert.equal(res1.isEligible, true);
  assert.equal(res1.daysElapsed, 3);
  assert.equal(res1.deadlineDate, '2026-10-17');

  // 2. 보증 기간 초과 접수 (10일 후 접수 -> 무상 부적격)
  const res2 = evaluateWarrantyEligibility('2026-10-10', '2026-10-20', 7);
  assert.equal(res2.isEligible, false);
  assert.equal(res2.daysElapsed, 10);

  // 3. 유효성 검증
  assert.equal(validateClaimInput('김고객', '셋팅펌', '컬이 3일만에 풀렸습니다').isValid, true);
  assert.equal(validateClaimInput('', '셋팅펌', '컬 풀림').isValid, false);
  assert.equal(validateClaimInput('김고객', '', '컬 풀림').isValid, false);

  console.log('warrantyClaimEngine.test.ts: ok');
}

run();
