import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchStudentByPin,
  verifyMasterExitPin,
  processKioskCheckin,
  type KioskStudentMatch,
} from './kioskPinEngine';

describe('kioskPinEngine', () => {
  const mockStudents: KioskStudentMatch[] = [
    { id: 'st-1', name: '김민준', phone: '010-1234-5678' },
    { id: 'st-2', name: '이지원', phone: '010-9876-4321', pin: '7788' },
    { id: 'st-3', name: '박서현', phone: '010-5555-1234' },
  ];

  it('matches student by phone last 4 digits', () => {
    const matched = matchStudentByPin('5678', mockStudents);
    assert.ok(matched);
    assert.equal(matched.name, '김민준');
  });

  it('matches student by custom pin prioritizing over phone', () => {
    const matched = matchStudentByPin('7788', mockStudents);
    assert.ok(matched);
    assert.equal(matched.name, '이지원');
  });

  it('returns null when pin length is not 4 or not found', () => {
    assert.equal(matchStudentByPin('12', mockStudents), null);
    assert.equal(matchStudentByPin('0000', mockStudents), null);
  });

  it('verifies master exit pin correctly', () => {
    assert.equal(verifyMasterExitPin('9999'), true);
    assert.equal(verifyMasterExitPin('1234'), false);
    assert.equal(verifyMasterExitPin('0000', '0000'), true);
  });

  it('processes checkin successfully for valid pin', () => {
    const result = processKioskCheckin('5678', mockStudents);
    assert.equal(result.success, true);
    assert.equal(result.studentName, '김민준');
    assert.match(result.message, /출석이 완료되었습니다/);
  });

  it('automatically redirects checkin to temporary slot when student has temporary move (케이스 6번)', () => {
    const temporaryMoves = [
      {
        studentId: 'st-1',
        originalStartTime: '14:00',
        targetStartTime: '16:00',
        targetDate: '2026-11-10',
        memo: '오늘만 4시 보강',
      },
    ];

    const result = processKioskCheckin('5678', mockStudents, {
      todayIso: '2026-11-10',
      temporaryMoves,
    });

    assert.equal(result.success, true);
    assert.equal(result.temporaryMoveApplied, true);
    assert.equal(result.assignedSlotTime, '16:00');
    assert.equal(result.originalSlotTime, '14:00');
    assert.match(result.message, /오늘 임시 16:00 수업 배정/);
  });

  it('returns failure when student not found', () => {
    const result = processKioskCheckin('9998', mockStudents);
    assert.equal(result.success, false);
    assert.match(result.message, /일치하는 원생 정보/);
  });
});
