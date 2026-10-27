import assert from 'node:assert';
import {
  calculateFinalSettlement,
  evaluateCancellationRefund,
  summarizeDepositEscrowMetrics,
  DepositEscrowRecord,
} from './depositEscrowEngine';

console.log('--- Testing depositEscrowEngine ---');

// Test 1: Final settlement with auto-deduction
const settlement = calculateFinalSettlement({
  totalServiceFee: 150000,
  depositAmount: 50000,
});
assert.strictEqual(settlement.netPayableAmount, 100000);
assert.strictEqual(settlement.isFullyCovered, false);

const fullCover = calculateFinalSettlement({
  totalServiceFee: 30000,
  depositAmount: 30000,
});
assert.strictEqual(fullCover.netPayableAmount, 0);
assert.strictEqual(fullCover.isFullyCovered, true);
console.log('✅ Test 1 passed: Deposit deduction and net payable calculation');

// Test 2: Cancellation 48 hours prior (100% refund)
const scheduled = '2026-10-20T14:00:00Z';
const earlyCancel = '2026-10-18T10:00:00Z';
const refundEarly = evaluateCancellationRefund({
  bookingScheduledAt: scheduled,
  cancellationRequestedAt: earlyCancel,
  depositAmount: 50000,
});
assert.strictEqual(refundEarly.isFreeCancellation, true);
assert.strictEqual(refundEarly.refundAmount, 50000);
assert.strictEqual(refundEarly.penaltyForfeitAmount, 0);
assert.strictEqual(refundEarly.suggestedStatus, 'refunded');

// Test 3: No-show or late cancel within 24 hours (forfeit deposit)
const lateCancel = '2026-10-20T12:00:00Z'; // 2 hours before
const forfeitLate = evaluateCancellationRefund({
  bookingScheduledAt: scheduled,
  cancellationRequestedAt: lateCancel,
  depositAmount: 50000,
});
assert.strictEqual(forfeitLate.isFreeCancellation, false);
assert.strictEqual(forfeitLate.refundAmount, 0);
assert.strictEqual(forfeitLate.penaltyForfeitAmount, 50000);
assert.strictEqual(forfeitLate.suggestedStatus, 'forfeited_noshow');
console.log('✅ Test 2 & 3 passed: Early cancellation refund and no-show forfeit policy');

// Test 4: Financial metrics summary
const records: DepositEscrowRecord[] = [
  {
    id: 'd1',
    bookingId: 'b1',
    customerName: '홍길동',
    serviceName: '파티룸 루프탑',
    totalEstimatedFee: 200000,
    depositAmount: 50000,
    status: 'held',
    bookingScheduledAt: '2026-10-25T18:00:00Z',
    createdAt: '2026-10-14T10:00:00Z',
  },
  {
    id: 'd2',
    bookingId: 'b2',
    customerName: '김영희',
    serviceName: '1:1 PT 세션',
    totalEstimatedFee: 70000,
    depositAmount: 20000,
    status: 'deducted_settled',
    bookingScheduledAt: '2026-10-14T15:00:00Z',
    createdAt: '2026-10-10T10:00:00Z',
    finalPaidAmount: 50000,
  },
  {
    id: 'd3',
    bookingId: 'b3',
    customerName: '이철수',
    serviceName: '사진 스튜디오',
    totalEstimatedFee: 120000,
    depositAmount: 30000,
    status: 'forfeited_noshow',
    bookingScheduledAt: '2026-10-13T14:00:00Z',
    createdAt: '2026-10-09T10:00:00Z',
    forfeitedPenaltyAmount: 30000,
  },
];

const summary = summarizeDepositEscrowMetrics(records);
assert.strictEqual(summary.totalActiveHeldDeposit, 50000);
assert.strictEqual(summary.totalSettledDeductions, 20000);
assert.strictEqual(summary.totalForfeitedPenaltyIncome, 30000);
assert.strictEqual(summary.totalRefundedDeposit, 0);
console.log('✅ Test 4 passed: Escrow financial summary metrics');

console.log('🎉 All depositEscrowEngine tests passed!');
