import assert from 'node:assert/strict';
import {
  validateVehicleNumber,
  validateSlotAvailability,
  transitionValetStatus,
} from './valetKeyEngine';

function run() {
  // 1. 차량 번호 유효성
  assert.equal(validateVehicleNumber('123가 4567').isValid, true);
  assert.equal(validateVehicleNumber('').isValid, false);
  assert.equal(validateVehicleNumber('12').isValid, false);

  // 2. 슬롯 번호 검증
  assert.equal(validateSlotAvailability(5, [1, 2, 3], 30).isAvailable, true);
  assert.equal(validateSlotAvailability(2, [1, 2, 3], 30).isAvailable, false);
  assert.equal(validateSlotAvailability(35, [], 30).isAvailable, false);

  // 3. 상태 전이
  assert.equal(transitionValetStatus('PARKED', 'REQUEST_DISPATCH').nextStatus, 'DISPATCH_REQUESTED');
  assert.equal(transitionValetStatus('DISPATCH_REQUESTED', 'DELIVER_KEY').nextStatus, 'DELIVERED');
  assert.equal(transitionValetStatus('DELIVERED', 'REQUEST_DISPATCH').isAllowed, false);

  console.log('valetKeyEngine.test.ts: ok');
}

run();
