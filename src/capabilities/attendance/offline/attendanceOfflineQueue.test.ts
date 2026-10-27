import assert from 'node:assert/strict';
import {
  enqueueAttendance,
  getPendingAttendanceQueue,
  removeAttendanceFromQueue,
  flushAttendanceQueue,
  _resetMemoryQueueForTesting,
} from './attendanceOfflineQueue';

async function runTests() {
  _resetMemoryQueueForTesting();

  // 1. Enqueue item optimistically
  const item1 = await enqueueAttendance({
    organizationId: 'org-123',
    customerId: 'cust-456',
    pin: '1234',
    timestamp: '2026-10-12T10:00:00.000Z',
    status: 'present',
    metadata: { source: 'counter_pad' },
  });

  assert.ok(item1.id, 'Record must have an ID');
  assert.equal(item1.status, 'present');
  assert.equal(item1.organizationId, 'org-123');

  // 2. Query pending queue
  let pending = await getPendingAttendanceQueue();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].id, item1.id);

  // 3. Enqueue second item
  const item2 = await enqueueAttendance({
    organizationId: 'org-123',
    customerId: 'cust-789',
    pin: '5678',
    timestamp: '2026-10-12T10:05:00.000Z',
    status: 'late',
  });

  pending = await getPendingAttendanceQueue();
  assert.equal(pending.length, 2);

  // 4. Flush queue with sync handler (simulate item1 success, item2 fail)
  const syncHandler = async (record: typeof item1) => {
    if (record.id === item1.id) return true;
    return false;
  };

  const result = await flushAttendanceQueue(syncHandler);
  assert.equal(result.successCount, 1);
  assert.equal(result.failureCount, 1);

  // item1 should be removed, item2 should remain
  pending = await getPendingAttendanceQueue();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].id, item2.id);

  // 5. Remove remaining item
  await removeAttendanceFromQueue(item2.id);
  pending = await getPendingAttendanceQueue();
  assert.equal(pending.length, 0);

  console.log('attendanceOfflineQueue tests passed!');
}

void runTests();
