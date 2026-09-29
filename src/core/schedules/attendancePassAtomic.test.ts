/**
 * 출결 + 이용권 원자 경로 — 규칙·동시성·RPC 계약.
 * 실행: npm run test:attendance-pass-atomic
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  countsTowardAttendancePass,
  modelSerializedAttendancePass,
  planAttendancePassChange,
} from './attendancePassPlan';

function plan(partial: Partial<Parameters<typeof planAttendancePassChange>[0]> & { nextStatus: string }) {
  return planAttendancePassChange({
    applyPass: true,
    siblings: [],
    ...partial,
  });
}

function run() {
  assert.equal(countsTowardAttendancePass('present'), true);
  assert.equal(countsTowardAttendancePass('late'), true);
  assert.equal(countsTowardAttendancePass('early_leave'), true);
  assert.equal(countsTowardAttendancePass('make_up'), true);
  assert.equal(countsTowardAttendancePass('absent'), false);
  assert.equal(countsTowardAttendancePass('excused'), false);

  // absent → present: 1회 차감
  assert.deepEqual(plan({ previousStatus: 'absent', nextStatus: 'present' }), { action: 'consume' });

  // present → absent: 정확히 1회 복구
  assert.deepEqual(
    plan({
      previousStatus: 'present',
      nextStatus: 'absent',
      previousSessionPassId: 'pass-1',
    }),
    { action: 'refund', sessionPassId: 'pass-1' }
  );

  // 같은 날짜 sibling이 이미 차감됨 → 추가 차감 없음
  assert.deepEqual(
    plan({
      previousStatus: 'absent',
      nextStatus: 'present',
      previousId: 'att-2',
      siblings: [{ id: 'att-1', status: 'present', sessionPassId: 'pass-sib' }],
    }),
    { action: 'reuse', sessionPassId: 'pass-sib' }
  );

  // sibling이 같은 pass를 쓰는 중이면 refund 하지 않음
  assert.deepEqual(
    plan({
      previousStatus: 'present',
      nextStatus: 'absent',
      previousId: 'att-2',
      previousSessionPassId: 'pass-1',
      siblings: [{ id: 'att-1', status: 'late', sessionPassId: 'pass-1' }],
    }),
    { action: 'keep', sessionPassId: undefined }
  );

  // 동일 상태 재시도 — 추가 차감 없음
  assert.deepEqual(
    plan({
      previousStatus: 'present',
      nextStatus: 'present',
      previousSessionPassId: 'pass-1',
    }),
    { action: 'none', sessionPassId: 'pass-1' }
  );

  // present → late / late → present: 둘 다 countable, 추가 차감·복구 없음
  assert.deepEqual(
    plan({
      previousStatus: 'present',
      nextStatus: 'late',
      previousSessionPassId: 'pass-1',
    }),
    { action: 'none', sessionPassId: 'pass-1' }
  );
  assert.deepEqual(
    plan({
      previousStatus: 'late',
      nextStatus: 'present',
      previousSessionPassId: 'pass-1',
    }),
    { action: 'none', sessionPassId: 'pass-1' }
  );

  // 비회차 학생
  assert.deepEqual(
    planAttendancePassChange({
      applyPass: false,
      previousStatus: 'absent',
      nextStatus: 'present',
      siblings: [],
    }),
    { action: 'none', sessionPassId: undefined }
  );

  // 동시 present: lock 후 재평가하면 1회만 차감
  {
    const first = plan({ nextStatus: 'present' });
    const secondAfterLock = plan({
      previousStatus: 'present',
      nextStatus: 'present',
      previousSessionPassId: 'pass-1',
    });
    assert.equal(first.action, 'consume');
    assert.equal(secondAfterLock.action, 'none');
    assert.equal(modelSerializedAttendancePass({ first, secondAfterLock }).consumeCount, 1);
  }

  // 두 기기 동시 present — 두 번째가 sibling reuse
  {
    const first = plan({ nextStatus: 'present' });
    const secondAfterLock = plan({
      nextStatus: 'present',
      previousId: 'att-b',
      siblings: [{ id: 'att-a', status: 'present', sessionPassId: 'pass-1' }],
    });
    assert.equal(modelSerializedAttendancePass({ first, secondAfterLock }).consumeCount, 1);
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(
    join(here, '../../../supabase/migrations/20260924120000_attendance_status_with_pass_atomic.sql'),
    'utf8'
  );
  assert.match(sql, /core\.apply_attendance_session_pass/);
  assert.match(sql, /piano\.update_attendance_status_with_pass/);
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /is_org_staff_actor/);
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /organization_id/);
  assert.match(sql, /Session pass refund failed/);
  assert.match(sql, /Insufficient session pass/);
  assert.match(sql, /idempotent/);
  assert.match(sql, /v_sibling_pass/);
  assert.match(sql, /status <> 'cancelled'/);
  assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION core\.update_attendance_status_with_pass/);
  const coreApplySql = sql.slice(
    sql.indexOf('core.apply_attendance_session_pass'),
    sql.indexOf('piano.update_attendance_status_with_pass')
  );
  assert.doesNotMatch(coreApplySql, /piano\./);

  const keySql = readFileSync(
    join(here, '../../../supabase/migrations/20260924140000_attendance_key_notify_makeup.sql'),
    'utf8'
  );
  assert.match(keySql, /uq_piano_attendance_business_key/);
  assert.match(keySql, /pg_advisory_xact_lock/);
  assert.match(keySql, /unique_violation/);
  assert.match(keySql, /attendance_class_key/);
  assert.match(keySql, /piano\.update_attendance_status_with_pass/);
  assert.match(keySql, /DROP FUNCTION IF EXISTS core\.update_attendance_status_with_pass/);
  assert.doesNotMatch(keySql, /CREATE OR REPLACE FUNCTION core\.update_attendance_status_with_pass/);

  const atomic = readFileSync(join(here, 'attendancePassAtomic.ts'), 'utf8');
  assert.match(atomic, /getPianoClient/);
  assert.match(atomic, /update_attendance_status_with_pass/);
  assert.match(atomic, /writeLocalMirror/);
  assert.match(atomic, /Session pass refund failed/);
  assert.equal(atomic.includes('upsertThenDiffDelete'), false);

  const pin = readFileSync(join(here, '../../industries/piano/services/pinDayAttendanceSync.ts'), 'utf8');
  assert.match(pin, /saveAttendanceWithPass/);

  const helpers = readFileSync(
    join(here, '../../industries/piano/components/attendance/pianoAttendanceHelpers.ts'),
    'utf8'
  );
  assert.match(helpers, /saveAttendanceWithPass/);

  const today = readFileSync(
    join(here, '../../industries/piano/components/lessons/TodayLessonView.tsx'),
    'utf8'
  );
  assert.match(today, /saveAttendanceWithPass/);

  const studentDetail = readFileSync(
    join(here, '../../core/academy/components/students/useStudentDetailModal.ts'),
    'utf8'
  );
  assert.match(studentDetail, /saveAttendanceWithPass/);

  const persist = readFileSync(
    join(here, '../../services/adapters/sync/pianoEntitySync.ts'),
    'utf8'
  );
  assert.match(persist, /allowDiffDelete:\s*false/);

  console.log('attendancePassAtomic.test.ts: ok');
}

run();
