/**
 * 출결 예정자 — 정규 요일 + 보강. 시간표 예외 필드 없음.
 * 실행: npm run test:piano-expected-attendance
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ClassItem, MakeupItem, Student } from '@/types';
import { getExpectedStudentsOnDate } from './pianoExpectedAttendance';

function student(partial: Partial<Student> & Pick<Student, 'id' | 'name'>): Student {
  return {
    status: 'active',
    classIds: [],
    phone: '',
    ...partial,
  } as Student;
}

function cls(partial: Partial<ClassItem> & Pick<ClassItem, 'id' | 'daysOfWeek'>): ClassItem {
  return {
    name: '초급',
    teacherId: 't1',
    teacherName: '김선생',
    startTime: '16:00',
    endTime: '16:50',
    capacity: 4,
    room: '1번',
    ...partial,
  };
}

function makeup(partial: Partial<MakeupItem> & Pick<MakeupItem, 'attendanceId' | 'studentId'>): MakeupItem {
  return {
    studentName: '보강생',
    parentPhone: '',
    classId: 'c1',
    className: '초급',
    originalDate: '2026-09-20',
    makeUpDate: '2026-09-24',
    makeUpStartTime: '17:00',
    makeUpEndTime: '17:50',
    status: 'scheduled',
    ...partial,
  };
}

function run() {
  const monday = '2026-09-21';
  const thursday = '2026-09-24';
  const regular = student({ id: 's-reg', name: '정규', classIds: ['c-mon'] });
  const makeupOnly = student({ id: 's-mk', name: '보강만', classIds: [] });
  const classes = [cls({ id: 'c-mon', daysOfWeek: ['월'], startTime: '16:00' })];

  const weekdayOnly = getExpectedStudentsOnDate(monday, [regular, makeupOnly], classes);
  assert.equal(weekdayOnly.map((r) => r.student.id).join(','), 's-reg');

  const withMakeup = getExpectedStudentsOnDate(thursday, [regular, makeupOnly], classes, {
    makeups: [makeup({ attendanceId: 'att-1', studentId: 's-mk' })],
  });
  assert.equal(withMakeup.map((r) => r.student.id).join(','), 's-mk');
  assert.match(withMakeup[0].classes[0].name, /보강/);

  const cancelledMakeup = getExpectedStudentsOnDate(thursday, [makeupOnly], classes, {
    makeups: [makeup({ attendanceId: 'att-2', studentId: 's-mk', status: 'pending', makeUpDate: undefined })],
  });
  assert.equal(cancelledMakeup.length, 0);

  const holidayStillShowsRegular = getExpectedStudentsOnDate(monday, [regular], classes);
  assert.equal(holidayStillShowsRegular.length, 1);

  const classType = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../../../types/index.ts'),
    'utf8'
  );
  assert.equal(classType.includes('cancelledDates'), false);
  assert.equal(classType.includes('timeOverrides'), false);

  const here = dirname(fileURLToPath(import.meta.url));
  const hook = readFileSync(join(here, 'usePianoExpectedDay.ts'), 'utf8');
  assert.match(hook, /getMakeupItems/);

  console.log('pianoExpectedAttendance.test.ts: ok');
}

run();
