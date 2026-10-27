import {
  SeatTimerSlot,
  calculateSeatTimerBilling,
  summarizeSeatTimerBoard,
} from './seatTimerBillingEngine';

function runTests() {
  console.log('--- Testing seatTimerBillingEngine ---');

  // Test 1: 정상 이용 중인 좌석 (기본 60분 배정, 40분 경과)
  const slotInUse: SeatTimerSlot = {
    id: 'seat-1',
    slotNumber: '좌석 05번',
    spaceType: 'study_desk',
    status: 'OCCUPIED',
    startTime: '2026-10-14T14:00:00Z',
    allocatedMinutes: 60,
    baseRatePerHour: 3000,
    overdueRatePer10Min: 1000,
  };

  // 14:40 기준 (40분 경과)
  const billingNormal = calculateSeatTimerBilling(slotInUse, '2026-10-14T14:40:00Z');
  if (billingNormal.elapsedMinutes !== 40) {
    throw new Error(`Expected 40 elapsed minutes, got ${billingNormal.elapsedMinutes}`);
  }
  if (billingNormal.remainingMinutes !== 20) {
    throw new Error(`Expected 20 remaining minutes, got ${billingNormal.remainingMinutes}`);
  }
  if (billingNormal.overdueMinutes !== 0) {
    throw new Error(`Expected 0 overdue minutes, got ${billingNormal.overdueMinutes}`);
  }
  if (billingNormal.overdueFee !== 0) {
    throw new Error(`Expected 0 overdue fee, got ${billingNormal.overdueFee}`);
  }
  if (billingNormal.totalFee !== 3000) {
    throw new Error(`Expected base fee 3,000, got ${billingNormal.totalFee}`);
  }
  if (billingNormal.status !== 'OCCUPIED') {
    throw new Error('Expected status to be OCCUPIED');
  }
  console.log('✅ Test 1 passed: Normal ongoing seat timer');

  // Test 2: 초과 이용 좌석 (60분 배정, 75분 경과 -> 15분 초과, 2블록 과금 = 2,000원)
  const billingOverdue = calculateSeatTimerBilling(slotInUse, '2026-10-14T15:15:00Z');
  if (billingOverdue.elapsedMinutes !== 75) {
    throw new Error(`Expected 75 elapsed minutes, got ${billingOverdue.elapsedMinutes}`);
  }
  if (billingOverdue.remainingMinutes !== 0) {
    throw new Error(`Expected 0 remaining minutes, got ${billingOverdue.remainingMinutes}`);
  }
  if (billingOverdue.overdueMinutes !== 15) {
    throw new Error(`Expected 15 overdue minutes, got ${billingOverdue.overdueMinutes}`);
  }
  // 15분 초과 -> Math.ceil(15/10) = 2블록 * 1000원 = 2000원
  if (billingOverdue.overdueFee !== 2000) {
    throw new Error(`Expected 2,000 overdue fee, got ${billingOverdue.overdueFee}`);
  }
  if (billingOverdue.totalFee !== 5000) {
    throw new Error(`Expected 5,000 total fee (3000+2000), got ${billingOverdue.totalFee}`);
  }
  if (billingOverdue.status !== 'OVERDUE') {
    throw new Error('Expected status to be OVERDUE');
  }
  console.log('✅ Test 2 passed: Overdue seat timer and penalty fee auto-calculation');

  // Test 3: 보드 집계 요약
  const slotAvailable: SeatTimerSlot = {
    id: 'seat-2',
    slotNumber: '좌석 06번',
    spaceType: 'study_desk',
    status: 'AVAILABLE',
    allocatedMinutes: 60,
    baseRatePerHour: 3000,
    overdueRatePer10Min: 1000,
  };
  const slotCleaning: SeatTimerSlot = {
    id: 'seat-3',
    slotNumber: '좌석 07번',
    spaceType: 'study_desk',
    status: 'CLEANING',
    allocatedMinutes: 60,
    baseRatePerHour: 3000,
    overdueRatePer10Min: 1000,
  };

  const summary = summarizeSeatTimerBoard(
    [slotInUse, slotAvailable, slotCleaning],
    '2026-10-14T15:15:00Z'
  );
  if (summary.totalSlots !== 3) {
    throw new Error(`Expected 3 slots, got ${summary.totalSlots}`);
  }
  if (summary.overdueSlots !== 1) {
    throw new Error(`Expected 1 overdue slot, got ${summary.overdueSlots}`);
  }
  if (summary.availableSlots !== 1) {
    throw new Error(`Expected 1 available slot, got ${summary.availableSlots}`);
  }
  if (summary.cleaningSlots !== 1) {
    throw new Error(`Expected 1 cleaning slot, got ${summary.cleaningSlots}`);
  }
  console.log('✅ Test 3 passed: Board summary metrics');

  console.log('🎉 All seatTimerBillingEngine tests passed!');
}

runTests();
