import assert from 'node:assert';
import {
  calculateNextAvailableTime,
  canTransitionCleaningStatus,
} from './turnaroundEngine';

// Test 1: calculateNextAvailableTime with Date object
{
  const bookingEndTime = new Date('2026-10-19T12:00:00.000Z');
  const nextAvailable = calculateNextAvailableTime(bookingEndTime, 15);
  assert.strictEqual(nextAvailable.toISOString(), '2026-10-19T12:15:00.000Z');
}

// Test 2: calculateNextAvailableTime with ISO string and custom buffer (e.g. 30 min)
{
  const nextAvailable = calculateNextAvailableTime('2026-10-19T14:30:00.000Z', 30);
  assert.strictEqual(nextAvailable.toISOString(), '2026-10-19T15:00:00.000Z');
}

// Test 3: calculateNextAvailableTime with 0 min buffer
{
  const nextAvailable = calculateNextAvailableTime('2026-10-19T10:00:00.000Z', 0);
  assert.strictEqual(nextAvailable.toISOString(), '2026-10-19T10:00:00.000Z');
}

// Test 4: canTransitionCleaningStatus lifecycle
{
  assert.strictEqual(canTransitionCleaningStatus('DIRTY', 'CLEANING'), true);
  assert.strictEqual(canTransitionCleaningStatus('CLEANING', 'READY'), true);
  assert.strictEqual(canTransitionCleaningStatus('READY', 'DIRTY'), true);
  assert.strictEqual(canTransitionCleaningStatus('DIRTY', 'READY'), false); // Cannot skip cleaning
}

console.log('✅ space_turnaround turnaroundEngine tests passed!');
