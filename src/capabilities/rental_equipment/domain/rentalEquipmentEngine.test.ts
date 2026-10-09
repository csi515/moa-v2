import assert from 'node:assert/strict';
import {
  transitionRentalStatus,
  evaluateRentalOverdue,
  type EquipmentItem,
} from './rentalEquipmentEngine';

function run() {
  const equipment: EquipmentItem = {
    id: 'eq-1',
    name: '골프 7번 아이언',
    assetTag: 'GOLF-IRON-07',
    status: 'AVAILABLE',
  };

  // 1. 대여 (AVAILABLE -> RENTED)
  const rented = transitionRentalStatus(equipment, 'RENT', {
    renterId: 'member-1',
    rentedAt: '2026-06-01T10:00:00Z',
    dueAt: '2026-06-01T12:00:00Z',
  });
  assert.equal(rented.success, true);
  assert.equal(rented.nextItem.status, 'RENTED');
  assert.equal(rented.nextItem.currentRenterId, 'member-1');

  // 2. 이미 대여 중인 물품 중복 대여 방어
  const dupRent = transitionRentalStatus(rented.nextItem, 'RENT', {
    renterId: 'member-2',
  });
  assert.equal(dupRent.success, false);

  // 3. 정상 반납 (RENTED -> AVAILABLE)
  const returned = transitionRentalStatus(rented.nextItem, 'RETURN');
  assert.equal(returned.success, true);
  assert.equal(returned.nextItem.status, 'AVAILABLE');

  // 4. 파손 보고 및 수리/재입고
  const damaged = transitionRentalStatus(rented.nextItem, 'REPORT_DAMAGE', {
    note: '샤프트 휨 발생',
  });
  assert.equal(damaged.success, true);
  assert.equal(damaged.nextItem.status, 'DAMAGED');
  assert.equal(damaged.nextItem.damageNote, '샤프트 휨 발생');

  const restocked = transitionRentalStatus(damaged.nextItem, 'REPAIR_OR_RESTOCK');
  assert.equal(restocked.success, true);
  assert.equal(restocked.nextItem.status, 'AVAILABLE');

  // 5. 정시 반납 지연 판정 (지연료 0원)
  const onTime = evaluateRentalOverdue({
    dueAt: '2026-06-01T12:00:00Z',
    returnedAt: '2026-06-01T11:55:00Z',
    lateFeePerHour: 5000,
  });
  assert.equal(onTime.isOverdue, false);
  assert.equal(onTime.lateFee, 0);

  // 6. 연체 반납 지연 판정 (2시간 10분 초과 -> 올림 3시간 연체, 15,000원)
  const late = evaluateRentalOverdue({
    dueAt: '2026-06-01T12:00:00Z',
    returnedAt: '2026-06-01T14:10:00Z',
    lateFeePerHour: 5000,
  });
  assert.equal(late.isOverdue, true);
  assert.equal(late.overdueHours, 3);
  assert.equal(late.lateFee, 15000);

  console.log('rentalEquipmentEngine.test.ts: ok');
}

run();
