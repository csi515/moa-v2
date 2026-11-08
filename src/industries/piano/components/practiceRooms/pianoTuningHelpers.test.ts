import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTuningDDay,
  PIANO_TYPE_LABELS,
  PIANO_ISSUE_CHIPS,
  getRoomTuningRecord,
  markRoomTunedToday,
  type RoomTuningRecord,
} from './pianoTuningHelpers';

describe('pianoTuningHelpers', () => {
  it('피아노 악기 라벨 및 이상 건반 칩이 정상 정의되어 있어야 한다', () => {
    assert.equal(PIANO_TYPE_LABELS.grand.label, '그랜드 피아노');
    assert.equal(PIANO_TYPE_LABELS.upright.label, '업라이트 피아노');
    assert.equal(PIANO_TYPE_LABELS.digital.label, '디지털 피아노');
    assert.ok(PIANO_ISSUE_CHIPS.length >= 5);
  });

  it('calculateTuningDDay: 최근 조율일 기준 6개월 후 D-day를 정확히 계산해야 한다', () => {
    // 2026-01-01에 조율했고 오늘이 2026-05-01인 경우 (약 60일 남음 -> good)
    const resGood = calculateTuningDDay('2026-01-01', 6, '2026-05-01');
    assert.equal(resGood.status, 'good');
    assert.ok(resGood.daysRemaining > 30);

    // 2026-01-01에 조율했고 오늘이 2026-06-20인 경우 (약 11일 남음 -> upcoming)
    const resUpcoming = calculateTuningDDay('2026-01-01', 6, '2026-06-20');
    assert.equal(resUpcoming.status, 'upcoming');
    assert.ok(resUpcoming.daysRemaining <= 30 && resUpcoming.daysRemaining >= 0);

    // 2026-01-01에 조율했고 오늘이 2026-07-15인 경우 (지연 -> overdue)
    const resOverdue = calculateTuningDDay('2026-01-01', 6, '2026-07-15');
    assert.equal(resOverdue.status, 'overdue');
    assert.ok(resOverdue.daysRemaining < 0);
  });

  it('calculateTuningDDay: 빈 날짜 입력 시 지연/미조율로 처리해야 한다', () => {
    const res = calculateTuningDDay('', 6, '2026-05-01');
    assert.equal(res.status, 'overdue');
    assert.equal(res.statusText, '조율 이력 없음');
  });

  it('markRoomTunedToday: 오늘 조율 완료 처리 시 날짜가 오늘로 갱신되고 메모가 리셋되어야 한다', () => {
    const record: RoomTuningRecord = {
      roomId: 'room-1',
      roomName: '1번 그랜드룸',
      pianoType: 'grand',
      lastTunedAt: '2025-10-01',
      tuningCycleMonths: 6,
      issueNotes: '높은 솔 건반 뻑뻑함',
    };

    const updated = markRoomTunedToday(record, '2026-05-15');
    assert.equal(updated.lastTunedAt, '2026-05-15');
    assert.equal(updated.issueNotes, '');
  });
});
