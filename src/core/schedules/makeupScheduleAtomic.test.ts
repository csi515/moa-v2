/**
 * 보강 일정 서버 가드 — 충돌 모델·RPC 계약·에러 메시지.
 * 실행: npm run test:makeup-schedule-atomic
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findMakeupSlotConflicts,
  timesOverlap,
} from '@/core/academy/utils/scheduleConflicts';
import type { ClassItem, MakeupItem } from '@/types';
import { mapMakeupScheduleError } from './makeupScheduleErrors';

function makeup(partial: Partial<MakeupItem> & Pick<MakeupItem, 'attendanceId'>): MakeupItem {
  return {
    studentId: partial.studentId || 's1',
    studentName: partial.studentName || '학생',
    parentPhone: '',
    classId: 'c1',
    className: '초급',
    originalDate: '2026-09-20',
    makeUpDate: '2026-09-24',
    makeUpStartTime: '16:00',
    makeUpEndTime: '16:50',
    makeUpRoom: '연습실A',
    makeUpTeacherId: 't1',
    makeUpTeacherName: '김선생',
    status: 'scheduled',
    ...partial,
  };
}

function cls(partial: Partial<ClassItem> = {}): ClassItem {
  return {
    id: 'class-1',
    name: '월수 초급',
    teacherId: 't1',
    teacherName: '김선생',
    daysOfWeek: ['수'],
    startTime: '16:00',
    endTime: '16:50',
    capacity: 4,
    room: '연습실A',
    ...partial,
  };
}

function run() {
  assert.equal(timesOverlap('16:00', '16:50', '16:50', '17:40'), false);
  assert.equal(timesOverlap('16:00', '16:50', '16:20', '17:10'), true);

  const scheduled = makeup({ attendanceId: 'att-1' });
  const candidate = {
    date: '2026-09-24',
    startTime: '16:20',
    endTime: '17:10',
    teacherId: 't1',
    room: '연습실A',
    excludeAttendanceId: 'att-2',
  };

  const firstConflicts = findMakeupSlotConflicts({
    classes: [],
    makeups: [],
    candidate,
  });
  assert.equal(firstConflicts.length, 0);

  const secondAfterLock = findMakeupSlotConflicts({
    classes: [],
    makeups: [scheduled],
    candidate,
  });
  assert.ok(secondAfterLock.some((c) => c.kind === 'teacher'));
  assert.ok(secondAfterLock.some((c) => c.kind === 'room'));

  const cancelledDoesNotBlock = findMakeupSlotConflicts({
    classes: [],
    makeups: [makeup({ attendanceId: 'att-1', status: 'pending', makeUpDate: undefined })],
    candidate,
  });
  assert.equal(cancelledDoesNotBlock.length, 0);

  const classTeacherConflict = findMakeupSlotConflicts({
    classes: [cls({ daysOfWeek: ['목'] })],
    makeups: [],
    candidate,
  });
  assert.ok(classTeacherConflict.some((c) => c.kind === 'teacher'));
  assert.ok(classTeacherConflict.some((c) => c.kind === 'room'));

  const otherOrgIgnored = findMakeupSlotConflicts({
    classes: [],
    makeups: [makeup({ attendanceId: 'att-x', studentId: 'other-org' })],
    candidate: { ...candidate, teacherId: 't-other', room: '다른방' },
  });
  assert.equal(otherOrgIgnored.length, 0);

  assert.equal(mapMakeupScheduleError('MAKEUP_TEACHER_OVERLAP'), '같은 선생님의 시간이 겹칩니다.');
  assert.equal(mapMakeupScheduleError('MAKEUP_ROOM_OVERLAP'), '같은 연습실/강의실 시간이 겹칩니다.');
  assert.match(mapMakeupScheduleError('Time slot already reserved'), /겹칩니다/);

  const here = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(
    join(here, '../../../supabase/migrations/20260924140000_attendance_key_notify_makeup.sql'),
    'utf8'
  );
  assert.match(sql, /core\.schedule_makeup/);
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /is_org_staff_actor/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /MAKEUP_TEACHER_OVERLAP/);
  assert.match(sql, /MAKEUP_ROOM_OVERLAP/);
  assert.match(sql, /room_reservations/);
  assert.match(sql, /exclusion_violation/);
  assert.match(sql, /assert_room_slot_allowed/);
  assert.match(sql, /status = 'cancelled'/);
  assert.match(sql, /Organization mismatch/);

  const view = readFileSync(
    join(here, '../../industries/piano/components/makeup/MakeupManagementView.tsx'),
    'utf8'
  );
  assert.match(view, /scheduleMakeupAtomic/);
  assert.equal(view.includes('그래도 등록'), false);

  const atomic = readFileSync(join(here, 'makeupScheduleAtomic.ts'), 'utf8');
  assert.match(atomic, /schedule_makeup/);
  assert.match(atomic, /writeLocalMirror/);

  console.log('makeupScheduleAtomic.test.ts: ok');
}

run();
