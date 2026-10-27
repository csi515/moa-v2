import assert from 'node:assert';
import {
  createStaffCallRequest,
  updateStaffCallStatus,
  calculateStaffCallMetrics,
  StaffCallRequest,
} from './kioskStaffCallEngine';

console.log('--- Testing kioskStaffCallEngine ---');

// Test 1: Create standard staff call request
const r1 = createStaffCallRequest({
  roomOrSeatNumber: '룸 3번',
  requestType: 'temperature',
  customMessage: '에어컨 온도 좀 내려주세요',
});
assert.strictEqual(r1.roomOrSeatNumber, '룸 3번');
assert.strictEqual(r1.status, 'pending');
assert.strictEqual(r1.isSilent, false);
assert.strictEqual(r1.message, '에어컨 온도 좀 내려주세요');

// Test 2: Create silent report in quiet spaces (e.g. Study Cafe)
const r2 = createStaffCallRequest({
  roomOrSeatNumber: '자유석 18번',
  requestType: 'silent_report',
  customMessage: '옆자리 노트북 키보드 소음이 심합니다',
});
assert.strictEqual(r2.isSilent, true);
assert.strictEqual(r2.status, 'pending');
console.log('✅ Test 1 & 2 passed: Standard and silent call request creation');

// Test 3: Status transition to in_progress and resolved
const list: StaffCallRequest[] = [r1, r2];
const inProgressList = updateStaffCallStatus(list, r1.id, 'in_progress', '김직원');
assert.strictEqual(inProgressList[0].status, 'in_progress');
assert.strictEqual(inProgressList[0].resolvedByStaffName, '김직원');

const resolvedList = updateStaffCallStatus(inProgressList, r1.id, 'resolved');
assert.strictEqual(resolvedList[0].status, 'resolved');
assert.ok(resolvedList[0].resolvedAt);
console.log('✅ Test 3 passed: Status transition to resolved with timestamp');

// Test 4: Call metrics aggregation
const metrics = calculateStaffCallMetrics(resolvedList);
assert.strictEqual(metrics.totalPendingCount, 1); // r2 is still pending
assert.strictEqual(metrics.silentReportCount, 1); // r2 is silent
assert.strictEqual(metrics.resolvedTodayCount, 1); // r1 is resolved
console.log('✅ Test 4 passed: Digital bellboard metrics calculation');

console.log('🎉 All kioskStaffCallEngine tests passed!');
