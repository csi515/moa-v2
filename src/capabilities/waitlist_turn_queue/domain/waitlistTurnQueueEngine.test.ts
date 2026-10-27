import assert from 'node:assert';
import {
  registerWaitlistEntry,
  estimateWaitTimeMinutes,
  callWaitlistEntry,
  seatWaitlistEntry,
  calculateBoardMetrics,
  WaitlistEntry,
} from './waitlistTurnQueueEngine';

console.log('--- Testing waitlistTurnQueueEngine ---');

// Test 1: Ticket registration and sequence increment
const initialEntries: WaitlistEntry[] = [];
const { newEntry: e1, updatedEntries: step1 } = registerWaitlistEntry(initialEntries, {
  customerName: '김철수',
  phoneLastDigits: '1234',
  partySize: 2,
  hasInfant: false,
  seatPreference: 'table',
});
assert.strictEqual(e1.ticketNumber, 1);
assert.strictEqual(step1.length, 1);
assert.strictEqual(e1.status, 'waiting');

const { newEntry: e2, updatedEntries: step2 } = registerWaitlistEntry(step1, {
  customerName: '이영희',
  phoneLastDigits: '5678',
  partySize: 4,
  hasInfant: true,
  seatPreference: 'room',
});
assert.strictEqual(e2.ticketNumber, 2);
assert.strictEqual(step2.length, 2);
console.log('✅ Test 1 passed: Ticket registration and auto-increment');

// Test 2: Estimated wait time calculation
const waitTimeGeneral = estimateWaitTimeMinutes(step2, 'any');
assert.strictEqual(waitTimeGeneral, 16); // 2 teams * 8 min = 16
const waitTimeTable = estimateWaitTimeMinutes(step2, 'table');
assert.strictEqual(waitTimeTable, 8); // 1 table team * 8 min = 8
const waitTimeRoom = estimateWaitTimeMinutes(step2, 'room');
assert.strictEqual(waitTimeRoom, 20); // 1 room team * 8 min + 12 bonus = 20
console.log('✅ Test 2 passed: Dynamic wait time estimation');

// Test 3: Calling customer and DID board metrics
const step3 = callWaitlistEntry(step2, e1.id);
assert.strictEqual(step3[0].status, 'called');
assert.ok(step3[0].calledAt);

const metrics = calculateBoardMetrics(step3);
assert.strictEqual(metrics.totalWaitingCount, 1); // e2 is still waiting
assert.strictEqual(metrics.lastCalledTicket, 1);
assert.deepStrictEqual(metrics.currentlyCalledTickets, [1]);
assert.strictEqual(metrics.seatedTodayCount, 0);

// Test 4: Seating customer
const step4 = seatWaitlistEntry(step3, e1.id);
assert.strictEqual(step4[0].status, 'seated');
const metricsAfterSeating = calculateBoardMetrics(step4);
assert.strictEqual(metricsAfterSeating.seatedTodayCount, 1);
assert.strictEqual(metricsAfterSeating.currentlyCalledTickets.length, 0);
console.log('✅ Test 3 & 4 passed: Calling, seating transition and DID metrics');

console.log('🎉 All waitlistTurnQueueEngine tests passed!');
