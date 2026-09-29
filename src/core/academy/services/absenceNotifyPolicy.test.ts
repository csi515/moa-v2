/**
 * 결석 알림 정책 — 전이·당일·이벤트 키.
 * 실행: npm run test:absence-notify
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DAY_ATTENDANCE_CLASS_ID } from '@/core/attendance/dayAttendance';
import { absenceEventKey, shouldNotifyParentAbsence } from './absenceNotifyPolicy';

function run() {
  const today = '2026-09-24';

  assert.equal(
    shouldNotifyParentAbsence({
      previousStatus: 'present',
      nextStatus: 'absent',
      date: today,
      today,
    }),
    true
  );
  assert.equal(
    shouldNotifyParentAbsence({
      previousStatus: undefined,
      nextStatus: 'absent',
      date: today,
      today,
    }),
    true
  );
  assert.equal(
    shouldNotifyParentAbsence({
      previousStatus: 'absent',
      nextStatus: 'absent',
      date: today,
      today,
    }),
    false
  );
  assert.equal(
    shouldNotifyParentAbsence({
      previousStatus: 'present',
      nextStatus: 'late',
      date: today,
      today,
    }),
    false
  );
  assert.equal(
    shouldNotifyParentAbsence({
      previousStatus: 'present',
      nextStatus: 'absent',
      date: '2026-09-20',
      today,
    }),
    false
  );

  assert.equal(
    absenceEventKey({ studentId: 's1', date: today, classId: DAY_ATTENDANCE_CLASS_ID }),
    absenceEventKey({ studentId: 's1', date: today, classId: '' })
  );
  assert.notEqual(
    absenceEventKey({ studentId: 's1', date: today, classId: DAY_ATTENDANCE_CLASS_ID }),
    absenceEventKey({ studentId: 's1', date: today, classId: 'class-a' })
  );

  const here = dirname(fileURLToPath(import.meta.url));
  const alert = readFileSync(join(here, 'academyAlertService.ts'), 'utf8');
  assert.match(alert, /shouldNotifyParentAbsence/);
  assert.match(alert, /eventKey/);

  const view = readFileSync(
    join(here, '../../../industries/piano/components/attendance/usePianoAttendanceView.ts'),
    'utf8'
  );
  assert.match(view, /previousStatus: existing\?\.status/);

  const todayLesson = readFileSync(
    join(here, '../../../industries/piano/components/lessons/TodayLessonView.tsx'),
    'utf8'
  );
  assert.match(todayLesson, /previousStatus: existingAtt\?\.status/);

  const detail = readFileSync(
    join(here, '../components/students/useStudentDetailModal.ts'),
    'utf8'
  );
  assert.match(detail, /previousStatus: existing\?\.status/);

  const sql = readFileSync(
    join(here, '../../../../supabase/migrations/20260924140000_attendance_key_notify_makeup.sql'),
    'utf8'
  );
  assert.match(sql, /uq_core_notifications_absence_event/);
  assert.match(sql, /eventKey/);

  console.log('absenceNotifyPolicy.test.ts: ok');
}

run();
