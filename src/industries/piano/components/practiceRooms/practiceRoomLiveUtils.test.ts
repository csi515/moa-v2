import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveRoomLiveInfo,
  calculateSlotRange,
  getBookingDisplayName,
} from './practiceRoomLiveUtils';
import type { RoomReservationRow } from '@/core/customer/services/practiceRoomReservationService';

describe('practiceRoomLiveUtils', () => {
  const dummyReservation = (
    startsAt: string,
    endsAt: string,
    status = 'approved',
    customerName = '김민지'
  ): RoomReservationRow => ({
    id: 'res-1',
    organization_id: 'org-1',
    room_id: 'room-1',
    customer_id: 'cust-1',
    requested_by: 'staff',
    starts_at: startsAt,
    ends_at: endsAt,
    status,
    memo: '체르니 30번 연습',
    customers: customerName ? { name: customerName } : null,
    practice_rooms: { name: '1번 연습실' },
  });

  it('예약이 없으면 vacant 상태를 반환해야 한다', () => {
    const now = new Date('2026-11-08T14:30:00+09:00');
    const info = resolveRoomLiveInfo(now, []);

    assert.equal(info.state, 'vacant');
    assert.equal(info.currentReservation, undefined);
    assert.equal(info.remainingMinutes, 0);
    assert.equal(info.progressPercent, 0);
  });

  it('현재 시각이 예약 시간 내에 있으면 occupied 상태와 진행률을 계산해야 한다', () => {
    const now = new Date('2026-11-08T14:25:00+09:00');
    const res = dummyReservation(
      '2026-11-08T14:00:00+09:00',
      '2026-11-08T14:50:00+09:00'
    );

    const info = resolveRoomLiveInfo(now, [res]);

    assert.equal(info.state, 'occupied');
    assert.equal(info.currentReservation?.id, 'res-1');
    assert.equal(info.totalMinutes, 50);
    assert.equal(info.elapsedMinutes, 25);
    assert.equal(info.remainingMinutes, 25);
    assert.equal(info.progressPercent, 50);
  });

  it('남은 시간이 5분 이내이면 imminent(종료 임박) 상태를 반환해야 한다', () => {
    const now = new Date('2026-11-08T14:46:00+09:00');
    const res = dummyReservation(
      '2026-11-08T14:00:00+09:00',
      '2026-11-08T14:50:00+09:00'
    );

    const info = resolveRoomLiveInfo(now, [res]);

    assert.equal(info.state, 'imminent');
    assert.equal(info.remainingMinutes, 4);
    assert.ok(info.progressPercent >= 90);
  });

  it('종료 시간 직후 10분 이내라면 overdue(초과) 상태를 반환해야 한다', () => {
    const now = new Date('2026-11-08T14:53:00+09:00');
    const res = dummyReservation(
      '2026-11-08T14:00:00+09:00',
      '2026-11-08T14:50:00+09:00'
    );

    const info = resolveRoomLiveInfo(now, [res]);

    assert.equal(info.state, 'overdue');
    assert.equal(info.remainingMinutes, -3);
  });

  it('현재는 비어 있으나 나중에 예정된 예약이 있으면 nextReservation에 채워져야 한다', () => {
    const now = new Date('2026-11-08T13:00:00+09:00');
    const upcoming = dummyReservation(
      '2026-11-08T15:00:00+09:00',
      '2026-11-08T15:50:00+09:00',
      'approved',
      '박지민'
    );

    const info = resolveRoomLiveInfo(now, [upcoming]);

    assert.equal(info.state, 'vacant');
    assert.equal(info.nextReservation?.id, 'res-1');
    assert.equal(getBookingDisplayName(info.nextReservation), '박지민 학생');
  });

  it('calculateSlotRange는 주어진 분만큼의 종료 시각을 올바르게 계산해야 한다', () => {
    const start = new Date('2026-11-08T14:00:00+09:00');
    const { startTime, endTime } = calculateSlotRange(start, 50);

    assert.equal(startTime, '14:00');
    assert.equal(endTime, '14:50');
  });
});
