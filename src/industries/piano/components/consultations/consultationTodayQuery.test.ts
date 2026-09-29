/**
 * 오늘 상담 조회 창 — 과거 혼입 방지, 100건 초과 페이지.
 * 실행: npm run test:consultation-today
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TODAY_RESERVATION_PAGE_SIZE,
  isReservationOnLocalDay,
  localDayReservationWindow,
  shouldFetchNextReservationPage,
} from './consultationTodayQuery';

function run() {
  const now = new Date('2026-09-24T10:00:00+09:00');
  const { from, to } = localDayReservationWindow(now);
  assert.ok(from.getTime() <= now.getTime());
  assert.ok(now.getTime() < to.getTime());
  assert.equal(to.getTime() - from.getTime(), 24 * 60 * 60 * 1000);

  const todayIso = '2026-09-24T03:00:00.000Z';
  const yesterdayIso = '2026-09-23T03:00:00.000Z';
  assert.equal(isReservationOnLocalDay(todayIso, '2026-09-24'), true);
  assert.equal(isReservationOnLocalDay(yesterdayIso, '2026-09-24'), false);

  assert.equal(shouldFetchNextReservationPage(100, 0), true);
  assert.equal(shouldFetchNextReservationPage(40, 0), false);
  assert.equal(shouldFetchNextReservationPage(100, 400), false);
  assert.equal(TODAY_RESERVATION_PAGE_SIZE, 100);

  const here = dirname(fileURLToPath(import.meta.url));
  const hub = readFileSync(join(here, 'usePianoConsultationHub.ts'), 'utf8');
  assert.match(hub, /localDayReservationWindow/);
  assert.match(hub, /shouldFetchNextReservationPage/);
  assert.match(hub, /TODAY_RESERVATION_PAGE_SIZE/);
  assert.match(hub, /offset,\r?\n\s+to/);
  assert.equal(hub.includes('getOrganizationReservations(currentOrganization.id)'), false);

  const sql = readFileSync(
    join(here, '../../../../../supabase/migrations/20260924150000_organization_reservations_to_date.sql'),
    'utf8'
  );
  assert.match(sql, /p_to_date/);
  assert.match(sql, /s\.starts_at < p_to_date/);

  console.log('consultationTodayQuery.test.ts: ok');
}

run();
