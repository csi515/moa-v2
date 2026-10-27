import assert from 'node:assert/strict';
import {
  validateTagAvailability,
  claimBaggage,
  getBaggageTypeLabel,
} from './coatroomEngine';

function run() {
  // 1. 태그 번호 유효성
  assert.equal(validateTagAvailability(10, [1, 2, 3], 50).isAvailable, true);
  assert.equal(validateTagAvailability(2, [1, 2, 3], 50).isAvailable, false);
  assert.equal(validateTagAvailability(55, [], 50).isAvailable, false);

  // 2. 회수 상태 전이
  assert.equal(claimBaggage('CHECKED_IN').nextStatus, 'CLAIMED');
  assert.equal(claimBaggage('CLAIMED').isAllowed, false);

  // 3. 라벨 확인
  assert.equal(getBaggageTypeLabel('COAT'), '외투/의류');

  console.log('coatroomEngine.test.ts: ok');
}

run();
