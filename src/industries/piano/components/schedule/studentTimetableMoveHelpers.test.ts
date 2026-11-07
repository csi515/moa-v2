import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAvailableMoveSlots,
  formatMoveConfirmationMessage,
  type ClassItemLike,
} from './studentTimetableMoveHelpers';

describe('studentTimetableMoveHelpers', () => {
  const dummyClasses: ClassItemLike[] = [
    {
      id: 'class-1',
      name: '화 14시 기초반',
      daysOfWeek: ['화'],
      startTime: '14:00',
      endTime: '14:50',
      capacity: 3,
      teacherName: '박선생',
    },
    {
      id: 'class-2',
      name: '수 15시 중급반',
      daysOfWeek: ['수'],
      startTime: '15:00',
      endTime: '15:50',
      capacity: 2,
      teacherName: '김선생',
    },
  ];

  const dummyStudents = [
    { id: 's-1', name: '김민지', classIds: ['class-1'] },
    { id: 's-2', name: '이준호', classIds: ['class-2'] },
    { id: 's-3', name: '박서연', classIds: ['class-2'] },
  ];

  it('대상 요일의 시간대 슬롯 목록과 정원/인원수를 올바르게 산출해야 한다', () => {
    const slots = resolveAvailableMoveSlots({
      classes: dummyClasses,
      students: dummyStudents,
      targetDay: '수',
      currentDay: '화',
      currentStartTime: '14:00',
      currentStudentId: 's-1',
    });

    assert.ok(slots.length > 0);
    const slot15 = slots.find((s) => s.startTime === '15:00');
    assert.ok(slot15);
    assert.equal(slot15.maxCapacity, 2);
    assert.equal(slot15.currentCount, 2);
    assert.equal(slot15.isFull, true);
    assert.equal(slot15.isCurrent, false);
    assert.equal(slot15.teacherName, '김선생');
  });

  it('현재 배정된 시간대와 동일하면 isCurrent가 true여야 한다', () => {
    const slots = resolveAvailableMoveSlots({
      classes: dummyClasses,
      students: dummyStudents,
      targetDay: '화',
      currentDay: '화',
      currentStartTime: '14:00',
      currentStudentId: 's-1',
    });

    const slot14 = slots.find((s) => s.startTime === '14:00');
    assert.ok(slot14);
    assert.equal(slot14.isCurrent, true);
    // 본인을 제외한 인원은 0명이어야 함
    assert.equal(slot14.currentCount, 0);
  });

  it('formatMoveConfirmationMessage는 안내 문구를 올바르게 생성해야 한다', () => {
    const msg = formatMoveConfirmationMessage('김민지', '화', '14:00', '수', '15:00');
    assert.equal(
      msg,
      '김민지 학생을 [화요일 14:00]에서 [수요일 15:00](으)로 이동하시겠습니까?'
    );
  });
});
