import assert from 'node:assert/strict';
import {
  transitionSeatStatus,
  calculateOverdueFee,
  type SeatRoomState,
} from './seatRoomEngine';

function run() {
  const room: SeatRoomState = {
    id: 'room-1',
    roomName: '집중 스터디룸 1호',
    status: 'VACANT',
    requiresCleaning: true,
  };

  // 1. 체크인 (VACANT -> IN_USE)
  const inUse = transitionSeatStatus(room, 'CHECK_IN', {
    occupantId: 'user-1',
    allottedMinutes: 60,
  });
  assert.equal(inUse.success, true);
  assert.equal(inUse.nextState.status, 'IN_USE');
  assert.equal(inUse.nextState.currentOccupantId, 'user-1');

  // 2. 이미 사용 중일 때 중복 체크인 방어
  const dupCheckIn = transitionSeatStatus(inUse.nextState, 'CHECK_IN', {
    occupantId: 'user-2',
  });
  assert.equal(dupCheckIn.success, false);

  // 3. 시간 초과 (IN_USE -> OVERDUE)
  const overdue = transitionSeatStatus(inUse.nextState, 'TIME_EXPIRE');
  assert.equal(overdue.success, true);
  assert.equal(overdue.nextState.status, 'OVERDUE');

  // 4. 퇴실 (OVERDUE -> CLEANING_REQUIRED)
  const cleaning = transitionSeatStatus(overdue.nextState, 'CHECK_OUT');
  assert.equal(cleaning.success, true);
  assert.equal(cleaning.nextState.status, 'CLEANING_REQUIRED');

  // 5. 청소 완료 (CLEANING_REQUIRED -> VACANT)
  const vacantAgain = transitionSeatStatus(cleaning.nextState, 'COMPLETE_CLEANING');
  assert.equal(vacantAgain.success, true);
  assert.equal(vacantAgain.nextState.status, 'VACANT');

  // 6. 초과 요금 계산식 검증 (기본 60분, 실제 90분 이용, 분당 100원, 초과할증 1.5배)
  // 기본: 60 * 100 = 6,000원
  // 초과: 30 * 100 * 1.5 = 4,500원
  // 총: 10,500원
  const feeResult = calculateOverdueFee({
    usedMinutes: 90,
    allottedMinutes: 60,
    baseRatePerMinute: 100,
    overduePenaltyRate: 1.5,
  });
  assert.equal(feeResult.isOverdue, true);
  assert.equal(feeResult.overdueMinutes, 30);
  assert.equal(feeResult.baseFee, 6000);
  assert.equal(feeResult.overdueFee, 4500);
  assert.equal(feeResult.totalFee, 10500);

  // 7. 정시 이용 시 초과 요금 0원 검증
  const onTimeResult = calculateOverdueFee({
    usedMinutes: 50,
    allottedMinutes: 60,
    baseRatePerMinute: 100,
    overduePenaltyRate: 1.5,
  });
  assert.equal(onTimeResult.isOverdue, false);
  assert.equal(onTimeResult.overdueMinutes, 0);
  assert.equal(onTimeResult.baseFee, 5000);
  assert.equal(onTimeResult.overdueFee, 0);
  assert.equal(onTimeResult.totalFee, 5000);

  console.log('seatRoomEngine.test.ts: ok');
}

run();
