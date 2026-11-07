import assert from 'node:assert/strict';
import type { ClassItem, Student } from '@/types';
import { computeClassCapacities } from './StudentTimetableSlotPicker';

function testCapacityCalculation() {
  const classes: ClassItem[] = [
    {
      id: 'c-mon-14',
      name: '월요 피아노 기초',
      daysOfWeek: ['월'],
      startTime: '14:00',
      endTime: '14:50',
      capacity: 4,
    },
    {
      id: 'c-wed-15',
      name: '수요 피아노 중급',
      daysOfWeek: ['수'],
      startTime: '15:00',
      endTime: '15:50',
      capacity: 3,
    },
  ];

  const students: Student[] = [
    {
      id: 's-1',
      name: '김원생',
      status: 'active',
      classIds: ['c-mon-14'],
      phone: '',
    } as Student,
    {
      id: 's-2',
      name: '이원생',
      status: 'active',
      classIds: ['c-mon-14'],
      phone: '',
    } as Student,
    {
      id: 's-3',
      name: '박원생',
      status: 'withdrawn', // 퇴원생은 인원 계산에서 제외
      classIds: ['c-mon-14'],
      phone: '',
    } as Student,
    {
      id: 's-4',
      name: '최원생',
      status: 'active',
      classIds: ['c-wed-15'],
      phone: '',
    } as Student,
    {
      id: 's-5',
      name: '정원생',
      status: 'active',
      classIds: ['c-wed-15'],
      phone: '',
    } as Student,
    {
      id: 's-6',
      name: '강원생',
      status: 'active',
      classIds: ['c-wed-15'],
      phone: '',
    } as Student,
  ];

  const result = computeClassCapacities(classes, students);

  assert.equal(result.length, 2);

  // c-mon-14: 활성 학생 2명 (정원 4) -> 2자리 남음, 마감 아님
  const mon = result[0];
  assert.equal(mon.classItem.id, 'c-mon-14');
  assert.equal(mon.assignedCount, 2);
  assert.equal(mon.capacity, 4);
  assert.equal(mon.remaining, 2);
  assert.equal(mon.isFull, false);
  assert.equal(mon.isAlmostFull, false);

  // c-wed-15: 활성 학생 3명 (정원 3) -> 0자리 남음, 마감 맞음
  const wed = result[1];
  assert.equal(wed.classItem.id, 'c-wed-15');
  assert.equal(wed.assignedCount, 3);
  assert.equal(wed.capacity, 3);
  assert.equal(wed.remaining, 0);
  assert.equal(wed.isFull, true);
  assert.equal(wed.isAlmostFull, false);
}

testCapacityCalculation();
console.log('studentTimetableSlotPicker.test.ts: ok');
