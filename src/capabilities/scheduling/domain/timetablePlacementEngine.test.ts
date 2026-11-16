/**
 * timetablePlacementEngine 범용 단위 테스트 (Phase 4 승격 검증)
 */

import assert from 'node:assert';
import {
  TIMETABLE_DAYS,
  TIMETABLE_SLOTS,
  resolveTimetableSlots,
  minutesToTime,
  slotEndTime,
  slotHour,
  isEditableSlotClass,
  findEditableSlotClass,
} from './timetablePlacementEngine';
import type { ClassItem } from '@/types/classItem';

console.log('🧪 [Scheduling Suite] timetablePlacementEngine 도메인 불변성 검증 시작...\n');

// 1. 기본 슬롯 및 시간 변환 검증
assert.strictEqual(TIMETABLE_DAYS.length, 7, '요일은 7개여야 합니다');
assert.strictEqual(TIMETABLE_SLOTS[0], '09:00', '첫 슬롯은 09:00이어야 합니다');
assert.strictEqual(TIMETABLE_SLOTS[TIMETABLE_SLOTS.length - 1], '20:30', '마지막 슬롯은 20:30이어야 합니다');

assert.strictEqual(minutesToTime(540), '09:00');
assert.strictEqual(minutesToTime(570), '09:30');
assert.strictEqual(slotHour('14:30'), 14);

// 2. slotEndTime 계산 검증 (기본 30분 및 커스텀 분)
assert.strictEqual(slotEndTime('09:00'), '09:30', '기본 30분 후는 09:30');
assert.strictEqual(slotEndTime('09:00', 45), '09:45', '45분 후는 09:45');
assert.strictEqual(slotEndTime('23:45', 30), '00:15', '자정 롤오버 계산 확인');

// 3. 비정규 슬롯 동적 행 확장 검증
const testClasses: ClassItem[] = [
  {
    id: 'c1',
    name: '야간반',
    daysOfWeek: ['화'],
    startTime: '21:00',
    endTime: '21:50',
    capacity: 5,
    teacherId: 't1',
    teacherName: '강사',
    room: '룸1',
    color: '#000',
  },
  {
    id: 'c2',
    name: '변칙반',
    daysOfWeek: ['수'],
    startTime: '10:15',
    endTime: '11:00',
    capacity: 5,
    teacherId: 't1',
    teacherName: '강사',
    room: '룸1',
    color: '#000',
  },
];

const resolved = resolveTimetableSlots(testClasses);
assert.ok(resolved.includes('21:00'), '21:00 슬롯이 추가되어야 합니다');
assert.ok(resolved.includes('10:15'), '10:15 슬롯이 추가되어야 합니다');
assert.strictEqual(resolved[0], '09:00', '시간순 정렬되어야 합니다');

// 4. 편집 가능 슬롯 클래스 매칭 검증
assert.strictEqual(isEditableSlotClass(testClasses[0], '화', '21:00'), true);
assert.strictEqual(isEditableSlotClass(testClasses[0], '화', '20:00'), false);
assert.strictEqual(isEditableSlotClass(testClasses[0], '수', '21:00'), false);

const found = findEditableSlotClass(testClasses, '화', '21:00');
assert.ok(found, '일치하는 반을 찾아야 합니다');
assert.strictEqual(found?.id, 'c1');

console.log('✨ [Scheduling Suite] timetablePlacementEngine 모든 도메인 테스트 100% 통과!\n');
