/**
 * 로컬(KST) 날짜 경계 — UTC slice 밀림 방지.
 * 실행: npm run test:local-date
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  businessDateInTimezone,
  formatIsoDateLocal,
  formatKoreanDateLocal,
  instantFromBusinessLocal,
  resolveIanaTimezone,
  startOfLocalDay,
  startOfNextLocalDay,
  weekStartIsoLocal,
  yearMonthLocal,
} from './localDate';

function localYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function run() {
  const kst001 = new Date('2026-09-24T00:01:00+09:00');
  assert.equal(formatIsoDateLocal(kst001), localYmd(kst001));
  assert.equal(yearMonthLocal(kst001), localYmd(kst001).slice(0, 7));

  const kst859 = new Date('2026-09-24T08:59:00+09:00');
  assert.equal(formatIsoDateLocal(kst859), localYmd(kst859));

  const utcDateChangeEve = new Date('2026-09-23T23:59:00.000Z');
  assert.equal(utcDateChangeEve.toISOString().slice(0, 10), '2026-09-23');
  assert.equal(formatIsoDateLocal(utcDateChangeEve), localYmd(utcDateChangeEve));
  if (localYmd(utcDateChangeEve) !== '2026-09-23') {
    assert.equal(formatIsoDateLocal(utcDateChangeEve), '2026-09-24');
  }

  const monthEnd = new Date('2026-09-30T23:59:00+09:00');
  assert.equal(formatIsoDateLocal(monthEnd), localYmd(monthEnd));
  assert.equal(yearMonthLocal(monthEnd), localYmd(monthEnd).slice(0, 7));

  const monthStart = new Date('2026-10-01T00:01:00+09:00');
  assert.equal(monthStart.toISOString().slice(0, 10), '2026-09-30');
  assert.equal(monthStart.toISOString().slice(0, 7), '2026-09');
  assert.equal(formatIsoDateLocal(monthStart), localYmd(monthStart));
  assert.equal(yearMonthLocal(monthStart), localYmd(monthStart).slice(0, 7));
  if (localYmd(monthStart) === '2026-10-01') {
    assert.equal(yearMonthLocal(monthStart), '2026-10');
  }

  const mondayEarly = new Date('2026-09-21T00:01:00+09:00');
  const weekStart = weekStartIsoLocal(mondayEarly);
  assert.match(weekStart, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(new Date(`${weekStart}T12:00:00`).getDay(), 1);
  const from = startOfLocalDay(kst001);
  const to = startOfNextLocalDay(kst001);
  assert.ok(from.getTime() <= kst001.getTime());
  assert.ok(kst001.getTime() < to.getTime());
  assert.equal(to.getTime() - from.getTime(), 24 * 60 * 60 * 1000);

  const utcNearSeoulMidnight = new Date('2026-09-23T15:30:00.000Z');
  assert.equal(utcNearSeoulMidnight.toISOString().slice(0, 10), '2026-09-23');
  assert.equal(businessDateInTimezone(utcNearSeoulMidnight, 'Asia/Seoul'), '2026-09-24');
  assert.equal(businessDateInTimezone(utcNearSeoulMidnight, 'America/Los_Angeles'), '2026-09-23');
  assert.equal(businessDateInTimezone(utcNearSeoulMidnight, 'UTC'), '2026-09-23');
  assert.equal(resolveIanaTimezone(null), 'Asia/Seoul');
  assert.equal(resolveIanaTimezone('Not/AZone'), 'Asia/Seoul');
  assert.equal(resolveIanaTimezone('Pacific/Honolulu'), 'Pacific/Honolulu');
  assert.equal(
    instantFromBusinessLocal('2026-09-24', '00:00', 'Asia/Seoul').toISOString(),
    '2026-09-23T15:00:00.000Z'
  );
  assert.equal(
    instantFromBusinessLocal('2026-09-24', '00:00', 'America/Los_Angeles').toISOString(),
    '2026-09-24T07:00:00.000Z'
  );

  const here = dirname(fileURLToPath(import.meta.url));
  assert.equal(formatKoreanDateLocal('2026-09-24'), '2026년 9월 24일 (목)');

  const pianoFiles = [
    '../../../src/industries/piano/components/lessons/LessonRecordsView.tsx',
    '../../../src/industries/piano/components/practice/PracticeRecordsView.tsx',
    '../../../src/industries/piano/components/makeup/MakeupManagementView.tsx',
    '../../../src/industries/piano/components/textbooks/TextbookPaymentModal.tsx',
    '../../../src/industries/piano/services/textbookSaleService.ts',
    '../../../src/core/finance/services/tuitionService.ts',
    '../../../src/core/finance/services/invoicePaymentService.ts',
    '../../../src/core/academy/components/students/useStudentDetailModal.ts',
    '../../../src/core/schedules/components/CreateConsultationScheduleModal.tsx',
    '../../../src/shared/components/layout/Header.tsx',
    '../../../src/core/dashboard/IndustryDashboardShell.tsx',
    '../../../src/core/academy/components/students/StudentListView.tsx',
  ];
  for (const rel of pianoFiles) {
    const src = readFileSync(join(here, rel), 'utf8');
    assert.equal(
      src.includes('toISOString().slice(0, 10)'),
      false,
      `${rel} still uses UTC date slice`
    );
    assert.equal(
      src.includes('toISOString().slice(0, 7)'),
      false,
      `${rel} still uses UTC month slice`
    );
  }

  console.log('localDate.test.ts: ok');
}

run();
