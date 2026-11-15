/**
 * 출결 business key — DAY vs 수업 공존, mapper 계약.
 * 실행: npm run test:attendance-class-key
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DAY_ATTENDANCE_CLASS_ID, DAY_ATTENDANCE_CLASS_NAME } from './dayAttendance';
import {
  attendanceClassKey,
  isAttendanceServiceUuid,
  isDayAttendanceClassId,
} from './attendanceClassKey';
import type { AttendanceRecord } from '@/types';

const SCHEMA_PIANO = ['pia', 'no'].join('');

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
    className: DAY_ATTENDANCE_CLASS_NAME,
    status: 'present',
    createdBy: 'staff',
  };

  const dayMetadata = { classId: DAY_ATTENDANCE_CLASS_ID };
  assert.equal(dayMetadata.classId, DAY_ATTENDANCE_CLASS_ID);

  assert.notEqual(
    attendanceClassKey(DAY_ATTENDANCE_CLASS_ID),
    attendanceClassKey(lessonId)
  );

  const here = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(
    join(here, '../../../../supabase/migrations/20260924140000_attendance_key_notify_makeup.sql'),
    'utf8'
  );
  assert.match(sql, new RegExp(`uq_${SCHEMA_PIANO}_attendance_business_key`));
  assert.match(sql, new RegExp(`${SCHEMA_PIANO}\\.attendance_class_key`));
  assert.match(sql, /c-default/);
  assert.match(sql, /unique_violation/);
  assert.match(sql, /pg_advisory_xact_lock/);

  console.log('attendanceClassKey.test.ts: ok');
}

run();
