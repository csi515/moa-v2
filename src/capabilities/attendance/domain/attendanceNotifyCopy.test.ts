/**
 * PIN 출석 알림 문구가 실제 조건(연결·권한, 설치만으로 부족, 수동≠PIN)과 맞는지.
 * 실행: npm run test:pin-notify-copy
 */
import assert from 'node:assert/strict';
import { PIN_ATTENDANCE_DIRECTOR_COPY, PIN_ATTENDANCE_PARENT_COPY } from './attendanceNotifyCopy';

function run() {
  const director = Object.values(PIN_ATTENDANCE_DIRECTOR_COPY).join('\n');
  const parent = Object.values(PIN_ATTENDANCE_PARENT_COPY).join('\n');

  assert.match(director, /연결/);
  assert.match(director, /알림을 허용/);
  assert.match(PIN_ATTENDANCE_DIRECTOR_COPY.onboardingDisabledHint, /보내지 않습니다/);
  assert.equal(director.includes('설치만'), false);
  assert.equal(director.includes('자동 푸시'), false);
  assert.equal(director.includes('알림이 전송되었습니다'), false);

  assert.match(PIN_ATTENDANCE_PARENT_COPY.helpSummary, /연결이 필요/);
  assert.match(parent, /알림을 허용/);
  assert.match(PIN_ATTENDANCE_PARENT_COPY.helpHowTo, /직접 출석/);
  assert.equal(parent.includes('설치만 하면'), false);

  console.log('attendanceNotifyCopy.test.ts: ok');
}

run();
