import assert from 'node:assert/strict';
import {
  validateOverrideWitness,
  getOverrideReasonLabel,
} from './lockerOverrideEngine';

function run() {
  // 1. 단독 개방 (2인 입회 비활성)
  assert.equal(validateOverrideWitness(false, '김매니저', '').isValid, true);

  // 2. 2인 입회 필수 조건
  assert.equal(validateOverrideWitness(true, '김매니저', '이코치').isValid, true);
  assert.equal(validateOverrideWitness(true, '김매니저', '').isValid, false);
  assert.equal(validateOverrideWitness(true, '김매니저', '김매니저').isValid, false); // 동일인 불가

  // 3. 라벨 확인
  assert.equal(getOverrideReasonLabel('PIN_FORGOTTEN'), '비밀번호 분실');

  console.log('lockerOverrideEngine.test.ts: ok');
}

run();
