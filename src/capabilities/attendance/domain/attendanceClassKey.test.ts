/**
 * 출결 business key — DAY vs 수업 공존, mapper 계약.
 * 실행: npm run test:attendance-class-key
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DAY_ATTENDANCE_CLASS_ID } from './dayAttendance';
import {
  attendanceClassKey,
  isAttendanceServiceUuid,
  isDayAttendanceClassId,
} from './attendanceClassKey';
import { attendanceToPianoRow, pianoRowToAttendance } from '@/services/adapters/sync/piano/attendanceMappers';
import type { AttendanceRecord } from '@/types';

function run() {
  const lessonId = '11111111-1111-4111-8111-111111111111';
  assert.equal(attendanceClassKey(DAY_ATTENDANCE_CLASS_ID, null), DAY_ATTENDANCE_CLASS_ID);
  assert.equal(attendanceClassKey('', null), DAY_ATTENDANCE_CLASS_ID);
  assert.equal(attendanceClassKey(lessonId, lessonId), lessonId);
  assert.equal(isDayAttendanceClassId(''), true);
  assert.equal(isDayAttendanceClassId(DAY_ATTENDANCE_CLASS_ID), true);
  assert.equal(isDayAttendanceClassId(lessonId), false);
  assert.equal(isAttendanceServiceUuid(DAY_ATTENDANCE_CLASS_ID), false);
  assert.equal(isAttendanceServiceUuid(lessonId), true);

  const day: AttendanceRecord = {
    id: '22222222-2222-4222-8222-222222222222',
    date: '2026-09-24',
    studentId: '33333333-3333-4333-8333-333333333333',
    studentName: '학생',
    classId: DAY_ATTENDANCE_CLASS_ID,
    className: '학원 등원',
    status: 'present',
    createdBy: 'staff',
  };
  const dayRow = attendanceToPianoRow(day, '44444444-4444-4444-8444-444444444444');
  assert.equal(dayRow.service_id, null);
  assert.equal((dayRow.metadata as { classId: string }).classId, DAY_ATTENDANCE_CLASS_ID);

  const hydrated = pianoRowToAttendance({
    id: day.id,
    customer_id: day.studentId,
    service_id: null,
    attendance_date: day.date,
    status: 'present',
    absent_reason: null,
    make_up_required: false,
    make_up_date: null,
    memo: null,
    created_by: 'staff',
    metadata: dayRow.metadata,
    created_at: '2026-09-24T00:00:00.000Z',
  });
  assert.equal(hydrated.classId, DAY_ATTENDANCE_CLASS_ID);

  const lesson = attendanceToPianoRow(
    { ...day, classId: lessonId, className: '초급' },
    '44444444-4444-4444-8444-444444444444'
  );
  assert.equal(lesson.service_id, lessonId);
  assert.notEqual(
    attendanceClassKey(DAY_ATTENDANCE_CLASS_ID),
    attendanceClassKey(lessonId)
  );

  const here = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(
    join(here, '../../../../supabase/migrations/20260924140000_attendance_key_notify_makeup.sql'),
    'utf8'
  );
  assert.match(sql, /uq_piano_attendance_business_key/);
  assert.match(sql, /piano\.attendance_class_key/);
  assert.match(sql, /c-default/);
  assert.match(sql, /unique_violation/);
  assert.match(sql, /pg_advisory_xact_lock/);

  console.log('attendanceClassKey.test.ts: ok');
}

run();
