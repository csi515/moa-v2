import assert from 'node:assert/strict';
import {
  assignLocker,
  evaluateLockerExpiry,
  releaseLocker,
  type LockerItem,
} from './lockerEngine';

function run() {
  const locker: LockerItem = {
    id: 'l-101',
    lockerNumber: '101',
    section: 'A구역',
    status: 'AVAILABLE',
    depositAmount: 10000,
  };

  // 1. 배정
  const assigned = assignLocker(locker, {
    customerId: 'cust-1',
    startDate: '2026-06-01',
    endDate: '2026-06-30',
  });
  assert.equal(assigned.success, true);
  assert.equal(assigned.updatedLocker.status, 'OCCUPIED');
  assert.equal(assigned.updatedLocker.assignedCustomerId, 'cust-1');

  // 2. 이미 사용 중인 락커 재배정 방어
  const duplicate = assignLocker(assigned.updatedLocker, {
    customerId: 'cust-2',
    startDate: '2026-06-05',
    endDate: '2026-06-15',
  });
  assert.equal(duplicate.success, false);

  // 3. 만료 검사 (기간 내)
  const inRange = evaluateLockerExpiry(assigned.updatedLocker, '2026-06-15');
  assert.equal(inRange.isExpired, false);
  assert.equal(inRange.daysRemaining, 15);
  assert.equal(inRange.updatedLocker.status, 'OCCUPIED');

  // 4. 만료 검사 (기간 초과)
  const expired = evaluateLockerExpiry(assigned.updatedLocker, '2026-07-01');
  assert.equal(expired.isExpired, true);
  assert.equal(expired.updatedLocker.status, 'EXPIRED');

  // 5. 락커 반납 및 보증금 반환
  const released = releaseLocker(assigned.updatedLocker);
  assert.equal(released.updatedLocker.status, 'AVAILABLE');
  assert.equal(released.refundDeposit, 10000);
  assert.equal(released.updatedLocker.assignedCustomerId, undefined);

  console.log('lockerEngine.test.ts: ok');
}

run();
