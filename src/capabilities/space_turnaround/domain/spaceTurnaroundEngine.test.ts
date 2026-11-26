import assert from 'node:assert/strict';
import {
  calculateTurnaroundSlot,
  hasTurnaroundConflict,
  transitionTurnaroundState,
  calculateSetupAndTeardownTimes,
  checkBufferCollision,
  type TurnaroundChecklistItem,
} from './spaceTurnaroundEngine';

console.log('[test:space-turnaround] starting test suite...');

// 1. 버퍼 타임 슬롯 계산 검증
{
  const start = '2026-10-16T14:00:00.000Z';
  const end = '2026-10-16T15:00:00.000Z'; // 1시간 이용
  const result = calculateTurnaroundSlot(start, end, 15); // 15분 버퍼

  assert.equal(result.serviceStartAt, start);
  assert.equal(result.serviceEndAt, end);
  assert.equal(result.bufferMinutes, 15);
  assert.equal(result.bufferEndAt, '2026-10-16T15:15:00.000Z');
  assert.equal(result.totalOccupiedMinutes, 75); // 60 + 15
}
console.log('✓ 1. 정비 버퍼 자동 가산 슬롯 계산 통과');

// 2. 예약 중복 충돌 감지 검증
{
  // A: 14:00 ~ 15:00 (버퍼 포함 15:15 종료)
  const slotA = {
    startAt: '2026-10-16T14:00:00.000Z',
    bufferEndAt: '2026-10-16T15:15:00.000Z',
  };

  // B1: 15:05 시작 (A의 버퍼가 15:15까지이므로 충돌!)
  const slotB1 = {
    startAt: '2026-10-16T15:05:00.000Z',
    bufferEndAt: '2026-10-16T16:20:00.000Z',
  };
  assert.equal(hasTurnaroundConflict(slotA, slotB1), true, '버퍼 구간 침범 충돌');

  // B2: 15:15 시작 (A의 버퍼가 끝나는 시점이므로 충돌 없음)
  const slotB2 = {
    startAt: '2026-10-16T15:15:00.000Z',
    bufferEndAt: '2026-10-16T16:30:00.000Z',
  };
  assert.equal(hasTurnaroundConflict(slotA, slotB2), false, '정상 연속 예약');
}
console.log('✓ 2. 정비 버퍼 포함 중복 예약 충돌 감지 통과');

// 3. 상태 머신 및 체크인 가드 검증
{
  // 퇴실 -> 청소 필요
  const s1 = transitionTurnaroundState('in_service', 'checkout');
  assert.equal(s1.nextStatus, 'cleaning_needed');
  assert.equal(s1.allowed, true);

  // 청소 시작
  const s2 = transitionTurnaroundState(s1.nextStatus, 'start_cleaning');
  assert.equal(s2.nextStatus, 'cleaning_in_progress');

  // 체크리스트 미완료 상태에서 완료 시도 -> 차단
  const checklist: TurnaroundChecklistItem[] = [
    { id: 'c1', item: '환기 및 소독 스프레이', done: true },
    { id: 'c2', item: '테이블 정리 및 쓰레기 비우기', done: false },
  ];
  const s3Fail = transitionTurnaroundState(s2.nextStatus, 'complete_cleaning', checklist);
  assert.equal(s3Fail.allowed, false);
  assert.ok(s3Fail.error?.includes('미완료'));

  // 체크리스트 전부 완료 후 완료 시도 -> 통과
  checklist[1].done = true;
  const s3Success = transitionTurnaroundState(s2.nextStatus, 'complete_cleaning', checklist);
  assert.equal(s3Success.allowed, true);
  assert.equal(s3Success.nextStatus, 'ready_for_next');

  // 정비 완료 전에는 다음 고객 체크인 차단
  const checkinFail = transitionTurnaroundState('cleaning_needed', 'checkin_next');
  assert.equal(checkinFail.allowed, false);

  // ready_for_next 상태에서 체크인 성공 -> in_service
  const checkinSuccess = transitionTurnaroundState('ready_for_next', 'checkin_next');
  assert.equal(checkinSuccess.allowed, true);
  assert.equal(checkinSuccess.nextStatus, 'in_service');
}
console.log('✓ 3. 룸 턴어라운드 상태 전이 및 체크인 가드 검증 통과');

// 4. 공간 사전 세팅 및 사후 철수 버퍼 분리 계산 검증
{
  const buffer = calculateSetupAndTeardownTimes('11:30', '14:00', 60, 30);
  assert.equal(buffer.setupStartTime, '10:30');
  assert.equal(buffer.eventStartTime, '11:30');
  assert.equal(buffer.eventEndTime, '14:00');
  assert.equal(buffer.teardownEndTime, '14:30');
}
console.log('✓ 4. 사전 세팅(60분 전) 및 사후 철수(30분 후) 버퍼 분리 계산 통과');

// 5. 연속 공간 대여 타임슬롯 간 세팅/철수 버퍼 충돌 감지 검증
{
  // 충돌 상황: 이전 행사 철수 14:30 vs 다음 행사 세팅 14:00
  const conflict = checkBufferCollision(
    { teardownEndTime: '14:30', eventEndTime: '14:00' },
    { setupStartTime: '14:00', eventStartTime: '15:00' }
  );
  assert.equal(conflict.hasCollision, true);
  assert.ok(conflict.reason?.includes('충돌'));

  // 안전 상황: 이전 행사 철수 14:30 vs 다음 행사 세팅 15:00
  const safe = checkBufferCollision(
    { teardownEndTime: '14:30', eventEndTime: '14:00' },
    { setupStartTime: '15:00', eventStartTime: '16:00' }
  );
  assert.equal(safe.hasCollision, false);
}
console.log('✓ 5. 연속 대여 타임슬롯 간 버퍼 충돌 감지 통과');

console.log('[test:space-turnaround] ALL TESTS PASSED! (100%)');
