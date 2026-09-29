/**
 * 학생 상세 수동 출결 — 반 선택 로직
 * 실행: npx tsx src/core/academy/components/students/detail/studentManualAttendanceClass.test.ts
 */
import assert from 'node:assert/strict';
import type { ClassItem } from '@/types';
import { DAY_ATTENDANCE_CLASS_ID } from '@/core/attendance/dayAttendance';
import {
  getEnrolledClassesOnDate,
  nextManualAttendanceClassId,
  resolveManualAttendanceClass,
  weekdayKoFromIsoDate,
} from './studentManualAttendanceClass';

function makeClass(
  partial: Partial<ClassItem> & Pick<ClassItem, 'id' | 'daysOfWeek' | 'startTime'>
): ClassItem {
  return {
    name: partial.name || `${partial.daysOfWeek[0]} ${partial.startTime}`,
    teacherId: 't1',
    teacherName: '김선생',
    endTime: '16:20',
    capacity: 4,
    room: '연습실',
    color: '#4f46e5',
    ...partial,
  };
}

// 2026-09-21 = 월요일
assert.equal(weekdayKoFromIsoDate('2026-09-21'), '월');
assert.equal(weekdayKoFromIsoDate('2026-09-22'), '화');

const monClass = makeClass({
  id: 'cls-mon',
  name: '월 15:00',
  daysOfWeek: ['월'],
  startTime: '15:00',
});
const monEvening = makeClass({
  id: 'cls-mon-eve',
  name: '월 19:00',
  daysOfWeek: ['월'],
  startTime: '19:00',
});
const tueClass = makeClass({
  id: 'cls-tue',
  name: '화 10:00',
  daysOfWeek: ['화'],
  startTime: '10:00',
});
const enrolled = [monClass, monEvening, tueClass];

// 1. 해당 날짜 반 1개 → 자동 선택
const tueOnly = getEnrolledClassesOnDate([tueClass, monClass], '2026-09-22');
assert.equal(tueOnly.length, 1);
assert.equal(tueOnly[0].id, 'cls-tue');
assert.equal(nextManualAttendanceClassId(tueOnly, ''), 'cls-tue');
const autoOne = resolveManualAttendanceClass({ options: tueOnly, selectedClassId: '' });
assert.equal(autoOne.ok, true);
if (autoOne.ok) {
  assert.equal(autoOne.classId, 'cls-tue');
  assert.equal(autoOne.className, '화 10:00');
}

// 2~3. 해당 날짜 반 2개 이상 → 선택 필수, 미선택 시 저장 거부
const monOptions = getEnrolledClassesOnDate(enrolled, '2026-09-21');
assert.equal(monOptions.length, 2);
assert.equal(nextManualAttendanceClassId(monOptions, ''), '');
const needSelect = resolveManualAttendanceClass({
  options: monOptions,
  selectedClassId: '',
});
assert.equal(needSelect.ok, false);
if (!needSelect.ok) assert.equal(needSelect.reason, 'need_select');

const picked = resolveManualAttendanceClass({
  options: monOptions,
  selectedClassId: 'cls-mon-eve',
});
assert.equal(picked.ok, true);
if (picked.ok) assert.equal(picked.classId, 'cls-mon-eve');

// 유효한 기존 선택은 유지
assert.equal(nextManualAttendanceClassId(monOptions, 'cls-mon'), 'cls-mon');

// 4. 해당 날짜 반 없음 → DAY_ATTENDANCE
const wedOptions = getEnrolledClassesOnDate(enrolled, '2026-09-23'); // 수
assert.equal(wedOptions.length, 0);
assert.equal(nextManualAttendanceClassId(wedOptions, ''), DAY_ATTENDANCE_CLASS_ID);
const dayAtt = resolveManualAttendanceClass({ options: wedOptions, selectedClassId: '' });
assert.equal(dayAtt.ok, true);
if (dayAtt.ok) {
  assert.equal(dayAtt.classId, DAY_ATTENDANCE_CLASS_ID);
  assert.equal(dayAtt.className, '일반 수업');
}

// 5. 다른 요일 반이 후보에 섞이지 않음
assert.equal(
  monOptions.some((c) => c.id === 'cls-tue'),
  false,
  '월요일 후보에 화요일 반이 있으면 안 됨'
);
assert.deepEqual(
  monOptions.map((c) => c.id).sort(),
  ['cls-mon', 'cls-mon-eve']
);

// 잘못된 선택 id(다른 요일 반)로는 저장 불가
const wrongDayPick = resolveManualAttendanceClass({
  options: monOptions,
  selectedClassId: 'cls-tue',
});
assert.equal(wrongDayPick.ok, false);

// 6. resolve는 classIds·ClassItem을 변경하지 않음
const classIdsBefore = ['cls-mon', 'cls-tue'];
const snapshot = JSON.stringify(enrolled);
resolveManualAttendanceClass({ options: monOptions, selectedClassId: 'cls-mon' });
getEnrolledClassesOnDate(enrolled, '2026-09-21');
assert.equal(JSON.stringify(enrolled), snapshot);
assert.deepEqual(classIdsBefore, ['cls-mon', 'cls-tue']);

console.log('studentManualAttendanceClass.test.ts: all assertions passed');
