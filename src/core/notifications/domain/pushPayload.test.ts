/**
 * Web Push 페이로드 단위 테스트 (Pure Domain Test)
 * 실행: npx tsx src/core/notifications/domain/pushPayload.test.ts
 */
import assert from 'node:assert/strict';
import {
  buildAttendancePushPayload,
  buildPassExpiringPushPayload,
} from './pushPayload';

console.log('[TEST] pushPayload pure domain tests running...');

// 1. buildAttendancePushPayload default checkin
{
  const payload = buildAttendancePushPayload('김민준', '14:30');
  assert.equal(payload.title, '[출결 알림] 김민준 출석');
  assert.match(payload.body, /김민준님이 14:30에 출석 처리되었습니다/);
  assert.equal(payload.url, '/workspace/attendance');
  assert.equal(payload.data?.studentName, '김민준');
  assert.equal(payload.data?.actionType, 'checkin');
}

// 2. buildAttendancePushPayload checkout
{
  const payload = buildAttendancePushPayload('이서연', '17:00', { actionType: 'checkout' });
  assert.equal(payload.title, '[출결 알림] 이서연 하원/퇴실');
  assert.match(payload.body, /이서연님이 17:00에 하원\/퇴실 처리되었습니다/);
  assert.equal(payload.data?.actionType, 'checkout');
}

// 3. buildAttendancePushPayload fallback on empty name
{
  const payload = buildAttendancePushPayload('', '12:00');
  assert.equal(payload.title, '[출결 알림] 회원 출석');
  assert.match(payload.body, /회원님이 12:00에 출석 처리되었습니다/);
}

// 4. buildPassExpiringPushPayload standard
{
  const payload = buildPassExpiringPushPayload('필라테스 30회권', 5);
  assert.equal(payload.title, '[이용권 만료 예정] 필라테스 30회권');
  assert.match(payload.body, /필라테스 30회권의 유효기간이 5일 남았습니다/);
  assert.equal(payload.url, '/customer/pass');
  assert.equal(payload.data?.remainingDays, 5);
}

// 5. buildPassExpiringPushPayload custom url & negative clamp
{
  const payload = buildPassExpiringPushPayload('골프장 정기권', -1, { url: '/passes' });
  assert.equal(payload.title, '[이용권 만료 예정] 골프장 정기권');
  assert.match(payload.body, /유효기간이 0일 남았습니다/);
  assert.equal(payload.url, '/passes');
  assert.equal(payload.data?.remainingDays, 0);
}

console.log('pushPayload.test.ts: ok');
