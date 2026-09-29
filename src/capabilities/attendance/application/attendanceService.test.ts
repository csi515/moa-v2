/**
 * PIN 체크인 로컬 결과 — 원격 persist/푸시와 분리.
 * 실행: npm run test:pin-check-in
 */
import assert from 'node:assert/strict';
import type { Student } from '@/types';
import { hashCheckInPin } from './pinService';
import { newAttendanceSessionId, toggleCheckInByPinLocal } from './attendanceService';

const ORG = '11111111-1111-4111-8111-111111111111';
const STUDENT_ID = '22222222-2222-4222-8222-222222222222';

const student = {
  id: STUDENT_ID,
  name: '홍길동',
  status: 'active',
} as Student;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function pinRecord(pin: string) {
  return { customerId: STUDENT_ID, pinHash: await hashCheckInPin(ORG, STUDENT_ID, pin) };
}

async function run() {
  assert.match(newAttendanceSessionId(), UUID_RE);

  const pins = [await pinRecord('1234')];

  const disabled = await toggleCheckInByPinLocal({
    organizationId: ORG,
    pin: '1234',
    method: 'pin',
    pinRecords: pins,
    sessions: [],
    students: [student],
    moduleEnabled: false,
  });
  assert.equal(disabled.result.success, false);
  if (!disabled.result.success) assert.equal(disabled.result.error, 'module_disabled');
  assert.equal(disabled.sessions.length, 0);

  const invalid = await toggleCheckInByPinLocal({
    organizationId: ORG,
    pin: '9999',
    method: 'pin',
    pinRecords: pins,
    sessions: [],
    students: [student],
    moduleEnabled: true,
  });
  assert.equal(invalid.result.success, false);
  if (!invalid.result.success) assert.equal(invalid.result.error, 'invalid_pin');
  assert.equal(invalid.sessions.length, 0);

  const first = await toggleCheckInByPinLocal({
    organizationId: ORG,
    pin: '1234',
    method: 'pin',
    pinRecords: pins,
    sessions: [],
    students: [student],
    moduleEnabled: true,
  });
  assert.equal(first.result.success, true);
  if (first.result.success) {
    assert.equal(first.result.action, 'check_in');
    assert.equal(first.result.customerId, STUDENT_ID);
  }
  assert.equal(first.sessions.length, 1);
  assert.match(first.sessions[0].id, UUID_RE);
  assert.ok(first.sessions[0].checkInAt);

  const again = await toggleCheckInByPinLocal({
    organizationId: ORG,
    pin: '1234',
    method: 'pin',
    pinRecords: pins,
    sessions: first.sessions,
    students: [student],
    moduleEnabled: true,
  });
  assert.equal(again.result.success, false);
  if (!again.result.success) assert.equal(again.result.error, 'already_checked_in');
  assert.equal(again.sessions.length, 1);
  assert.equal(again.sessions[0].checkInAt, first.sessions[0].checkInAt);
}

run();
