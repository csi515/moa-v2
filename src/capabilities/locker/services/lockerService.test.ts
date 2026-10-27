import { strict as assert } from 'node:assert';
import {
  DEMO_LOCKERS,
  fetchLockers,
  resolveLockerGridStatus,
  type LockerRecord,
} from './lockerService';

async function testFetchLockersDemo() {
  const result = await fetchLockers('demo');
  assert.equal(Array.isArray(result), true);
  assert.equal(result.length, DEMO_LOCKERS.length);
  assert.equal(result[0].locker_number, '101');
  console.log('testFetchLockersDemo: ok');
}

function testResolveLockerGridStatus() {
  const availableLocker: LockerRecord = {
    id: 'test-1',
    tenant_id: 'demo',
    locker_number: '101',
    section: '공용',
    status: 'AVAILABLE',
    assigned_customer_id: null,
    deposit_amount: 10000,
    monthly_fee: 10000,
    start_date: null,
    expires_at: null,
    created_at: new Date().toISOString(),
  };
  assert.equal(resolveLockerGridStatus(availableLocker), 'AVAILABLE');

  const occupiedLocker: LockerRecord = {
    ...availableLocker,
    status: 'OCCUPIED',
    assigned_customer_id: 'c-1',
    expires_at: '2099-12-31',
  };
  assert.equal(resolveLockerGridStatus(occupiedLocker), 'OCCUPIED');

  const overdueLocker: LockerRecord = {
    ...availableLocker,
    status: 'OCCUPIED',
    assigned_customer_id: 'c-1',
    expires_at: '2020-01-01',
  };
  assert.equal(resolveLockerGridStatus(overdueLocker), 'OVERDUE');

  console.log('testResolveLockerGridStatus: ok');
}

async function runAll() {
  await testFetchLockersDemo();
  testResolveLockerGridStatus();
  console.log('lockerService.test.ts: all ok');
}

void runAll();
