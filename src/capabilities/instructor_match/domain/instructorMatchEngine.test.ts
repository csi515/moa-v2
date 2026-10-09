import assert from 'node:assert/strict';
import {
  detectScheduleConflict,
  aggregateMonthlyInstructorSessions,
  type LessonSession,
} from './instructorMatchEngine';

function run() {
  const existing: LessonSession[] = [
    {
      id: 'sess-1',
      instructorId: 'inst-1',
      customerId: 'cust-1',
      startAt: '2026-06-01T10:00:00Z',
      endAt: '2026-06-01T11:00:00Z',
      status: 'COMPLETED',
      durationMinutes: 60,
    },
    {
      id: 'sess-2',
      instructorId: 'inst-1',
      customerId: 'cust-2',
      startAt: '2026-06-01T14:00:00Z',
      endAt: '2026-06-01T15:00:00Z',
      status: 'SCHEDULED',
      durationMinutes: 60,
    },
    {
      id: 'sess-3',
      instructorId: 'inst-2', // 다른 강사
      customerId: 'cust-3',
      startAt: '2026-06-01T10:30:00Z',
      endAt: '2026-06-01T11:30:00Z',
      status: 'SCHEDULED',
      durationMinutes: 60,
    },
  ];

  // 1. 시간 겹침 충돌 감지 (동일 강사 inst-1, 10:30 ~ 11:30 -> sess-1과 겹침)
  const conflict = detectScheduleConflict(existing, {
    instructorId: 'inst-1',
    startAt: '2026-06-01T10:30:00Z',
    endAt: '2026-06-01T11:30:00Z',
  });
  assert.equal(conflict.hasConflict, true);
  assert.deepEqual(conflict.conflictingSessionIds, ['sess-1']);

  // 2. 다른 강사와의 동시간대 세션 -> 충돌 없음
  const diffInst = detectScheduleConflict(existing, {
    instructorId: 'inst-3',
    startAt: '2026-06-01T10:00:00Z',
    endAt: '2026-06-01T11:00:00Z',
  });
  assert.equal(diffInst.hasConflict, false);

  // 3. 앞뒤로 맞닿은 연속 시간 (11:00 ~ 12:00) -> 충돌 없음
  const adjacent = detectScheduleConflict(existing, {
    instructorId: 'inst-1',
    startAt: '2026-06-01T11:00:00Z',
    endAt: '2026-06-01T12:00:00Z',
  });
  assert.equal(adjacent.hasConflict, false);

  // 4. 월간 실적 집계
  const stats = aggregateMonthlyInstructorSessions(existing, 'inst-1', '2026-06');
  assert.equal(stats.instructorId, 'inst-1');
  assert.equal(stats.totalCompleted, 1);
  assert.equal(stats.totalScheduled, 1);
  assert.equal(stats.totalCancelled, 0);
  assert.equal(stats.totalMinutesCompleted, 60);
  assert.equal(stats.uniqueCustomersCount, 1);

  console.log('instructorMatchEngine.test.ts: ok');
}

run();
