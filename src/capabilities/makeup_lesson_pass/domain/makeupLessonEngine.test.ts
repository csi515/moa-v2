import assert from 'node:assert/strict';
import {
  issueMakeupToken,
  evaluateTokenValidity,
  canReserveSlot,
  reserveMakeupLesson,
  cancelMakeupReservation,
  assembleMakeupConfirmationMessage,
  MakeupSlot,
} from './makeupLessonEngine.js';

console.log('[test:makeup-lesson] starting test suite...');

// 1. 보강 토큰 발행 및 유효기간 계산 검증
const token = issueMakeupToken({
  id: 'tok-1',
  organizationId: 'org-test',
  studentId: 'stud-1',
  studentName: '김보강',
  originReason: 'absence',
  originDate: '2026-10-01',
  validityDays: 30,
});

assert.equal(token.studentName, '김보강');
assert.equal(token.expiresAt, '2026-10-31');
assert.equal(token.status, 'available');
console.log('✓ 1. 보강 토큰 30일 만료일 산출 통과');

// 2. 만료 여부 판정
const validCheck = evaluateTokenValidity(token, '2026-10-15');
assert.equal(validCheck.isValid, true);
assert.equal(validCheck.isExpired, false);
assert.equal(validCheck.daysRemaining, 16);

const expiredCheck = evaluateTokenValidity(token, '2026-11-05');
assert.equal(expiredCheck.isValid, false);
assert.equal(expiredCheck.isExpired, true);
assert.equal(expiredCheck.daysRemaining, 0);
console.log('✓ 2. 보강 토큰 유효성 및 만료 판정 통과');

// 3. 슬롯 정원 검증 및 원자적 예약 처리
const slot: MakeupSlot = {
  id: 'slot-1',
  organizationId: 'org-test',
  instructorId: 'inst-1',
  instructorName: '박선생',
  roomName: '피아노 1실',
  slotDate: '2026-10-20',
  startTime: '16:00',
  endTime: '16:50',
  capacity: 1,
  reservedCount: 0,
  status: 'open',
};

assert.equal(canReserveSlot(slot), true);

const reserveResult = reserveMakeupLesson(token, slot, '2026-10-15', 'res-1');
assert.equal(reserveResult.success, true);
assert.equal(reserveResult.updatedSlot?.reservedCount, 1);
assert.equal(reserveResult.updatedSlot?.status, 'full');
assert.equal(reserveResult.updatedToken?.status, 'reserved');
assert.equal(reserveResult.reservation?.studentName, '김보강');

// 꽉 찬 슬롯에 중복 예약 방어
const duplicateAttempt = reserveMakeupLesson(token, reserveResult.updatedSlot!, '2026-10-15', 'res-2');
assert.equal(duplicateAttempt.success, false);
assert.match(duplicateAttempt.error ?? '', /마감되었습니다/);
console.log('✓ 3. 보강 슬롯 예약 및 정원 초과 차단 통과');

// 4. 예약 취소 및 토큰 복구
const cancelResult = cancelMakeupReservation(
  reserveResult.updatedToken!,
  reserveResult.updatedSlot!,
  reserveResult.reservation!
);
assert.equal(cancelResult.updatedToken.status, 'available');
assert.equal(cancelResult.updatedSlot.reservedCount, 0);
assert.equal(cancelResult.updatedSlot.status, 'open');
assert.equal(cancelResult.updatedReservation.status, 'canceled');
console.log('✓ 4. 예약 취소 및 보강 토큰 원상 복구 통과');

// 5. 알림 텍스트 조립
const message = assembleMakeupConfirmationMessage({
  studentName: '김보강',
  instructorName: '박선생',
  roomName: '피아노 1실',
  slotDate: '2026-10-20',
  startTime: '16:00',
  endTime: '16:50',
  originDate: '2026-10-01',
});
assert.match(message, /\[보강 수업 확정 안내\]/);
assert.match(message, /김보강/);
assert.match(message, /피아노 1실/);
console.log('✓ 5. 알림 텍스트 조립 통과');

console.log('[test:makeup-lesson] ALL TESTS PASSED! (100%)');
