import assert from 'node:assert/strict';
import {
  shouldTriggerBroadcast,
  validateScheduleInput,
  type BroadcastScheduleRecord,
} from './soundBroadcastEngine';

function run() {
  const schedule: BroadcastScheduleRecord = {
    id: 'bc-1',
    tenant_id: 't-1',
    title: '마감 30분 전 안내',
    broadcast_type: 'CLOSING_ANNOUNCEMENT',
    target_time: '21:30',
    days_of_week: [1, 2, 3, 4, 5], // 월~금
    volume_percent: 80,
    is_active: true,
  };

  // 1. 트리거 조건 일치 (월요일 21:30)
  const matchDate = new Date('2026-10-19T21:30:00'); // 2026-10-19는 월요일 (day 1)
  assert.equal(shouldTriggerBroadcast(schedule, matchDate), true);

  // 2. 시간 불일치 (월요일 21:29)
  const nonMatchTime = new Date('2026-10-19T21:29:00');
  assert.equal(shouldTriggerBroadcast(schedule, nonMatchTime), false);

  // 3. 요일 불일치 (일요일 21:30)
  const nonMatchDay = new Date('2026-10-18T21:30:00'); // 2026-10-18은 일요일 (day 0)
  assert.equal(shouldTriggerBroadcast(schedule, nonMatchDay), false);

  // 4. 유효성 검증
  assert.equal(validateScheduleInput('수업 시작 종', '14:00', [1, 2, 3]).isValid, true);
  assert.equal(validateScheduleInput('수업 시작 종', '25:00', [1, 2, 3]).isValid, false);
  assert.equal(validateScheduleInput('수업 시작 종', '14:00', []).isValid, false);

  console.log('soundBroadcastEngine.test.ts: ok');
}

run();
