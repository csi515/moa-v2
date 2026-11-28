import assert from 'node:assert/strict';
import {
  detectScheduleConflict,
  hasScheduleConflict,
  intervalsOverlap,
} from './detectScheduleConflict.ts';

assert.equal(
  intervalsOverlap(
    '2026-11-28T10:00:00+09:00',
    '2026-11-28T10:30:00+09:00',
    '2026-11-28T10:30:00+09:00',
    '2026-11-28T11:00:00+09:00'
  ),
  false,
  '끝점 접침은 충돌 아님'
);

assert.equal(
  intervalsOverlap(
    '2026-11-28T10:00:00+09:00',
    '2026-11-28T10:30:00+09:00',
    '2026-11-28T10:15:00+09:00',
    '2026-11-28T10:45:00+09:00'
  ),
  true
);

{
  const hits = detectScheduleConflict(
    {
      id: 'new',
      staffId: 't1',
      spaceResourceId: 'room-a',
      startsAt: '2026-11-28T10:00:00+09:00',
      endsAt: '2026-11-28T10:30:00+09:00',
    },
    [
      {
        id: 'ex1',
        staffId: 't1',
        spaceResourceId: 'room-b',
        startsAt: '2026-11-28T10:00:00+09:00',
        endsAt: '2026-11-28T10:30:00+09:00',
      },
      {
        id: 'ex2',
        staffId: 't2',
        spaceResourceId: 'room-a',
        startsAt: '2026-11-28T10:10:00+09:00',
        endsAt: '2026-11-28T10:40:00+09:00',
      },
    ]
  );
  assert.equal(hits.some((h) => h.kind === 'staff'), true);
  assert.equal(hits.some((h) => h.kind === 'room'), true);
  assert.equal(hasScheduleConflict(
    {
      staffId: 't9',
      spaceResourceId: 'room-z',
      startsAt: '2026-11-28T12:00:00+09:00',
      endsAt: '2026-11-28T12:30:00+09:00',
    },
    []
  ), false);
}

console.log('detectScheduleConflict.test.ts: ok');
