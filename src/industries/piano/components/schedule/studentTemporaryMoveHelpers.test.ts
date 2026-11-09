import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTemporaryMoveRecord,
  findTemporaryMoveForSlot,
  TemporaryMoveRecord,
} from './studentTemporaryMoveHelpers';

test('createTemporaryMoveRecord: 임시 이동 객체 정상 생성', () => {
  const record = createTemporaryMoveRecord({
    studentId: 'st_123',
    studentName: '김하늘',
    originalDay: '월',
    originalStartTime: '14:00',
    targetDay: '수',
    targetStartTime: '16:00',
    weekStartDate: '2026-11-09',
  });

  assert.equal(record.studentId, 'st_123');
  assert.equal(record.studentName, '김하늘');
  assert.equal(record.originalDay, '월');
  assert.equal(record.targetDay, '수');
  assert.equal(record.targetStartTime, '16:00');
  assert.ok(record.id.startsWith('temp_move_'));
});

test('findTemporaryMoveForSlot: 대상 슬롯 일치 여부 판별', () => {
  const moves: TemporaryMoveRecord[] = [
    createTemporaryMoveRecord({
      studentId: 'st_1',
      studentName: '윤도현',
      originalDay: '화',
      originalStartTime: '15:00',
      targetDay: '목',
      targetStartTime: '17:00',
    }),
  ];

  // 매칭 성공
  const found = findTemporaryMoveForSlot(moves, 'st_1', '목', '17:00');
  assert.ok(found);
  assert.equal(found.studentName, '윤도현');

  // 매칭 실패 (요일 불일치)
  const notFoundDay = findTemporaryMoveForSlot(moves, 'st_1', '화', '15:00');
  assert.equal(notFoundDay, undefined);

  // 매칭 실패 (시간 불일치)
  const notFoundTime = findTemporaryMoveForSlot(moves, 'st_1', '목', '16:00');
  assert.equal(notFoundTime, undefined);
});
