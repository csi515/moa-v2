/**
 * 실행: npx tsx src/components/common/weekStripLogic.test.ts
 */
import assert from 'node:assert/strict';
import {
  buildWeekStripDays,
  isSameLocalDay,
  shiftWeek,
  toDateKey,
} from './weekStripLogic';

{
  // 2026-10-26은 월요일 → 주는 10/25(일)~10/31(토)
  const days = buildWeekStripDays(new Date(2026, 9, 26));
  assert.equal(days.length, 7);
  assert.equal(days[0].weekdayLabel, '일');
  assert.equal(days[0].dateKey, '2026-10-25');
  assert.equal(days[1].dateKey, '2026-10-26');
  assert.equal(days[6].weekdayLabel, '토');
  assert.equal(days[6].dateKey, '2026-10-31');
}

{
  const sun = buildWeekStripDays(new Date(2026, 9, 25));
  assert.equal(sun[0].dateKey, '2026-10-25');
}

{
  const next = shiftWeek(new Date(2026, 9, 26), 1);
  assert.equal(toDateKey(next), '2026-11-02');
  const prev = shiftWeek(new Date(2026, 9, 26), -1);
  assert.equal(toDateKey(prev), '2026-10-19');
}

{
  assert.equal(
    isSameLocalDay(new Date(2026, 9, 26, 8), new Date(2026, 9, 26, 23)),
    true
  );
  assert.equal(
    isSameLocalDay(new Date(2026, 9, 26), new Date(2026, 9, 27)),
    false
  );
}

console.log('weekStripLogic.test.ts: ok');
