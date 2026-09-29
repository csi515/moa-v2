/**
 * 예약 쓰기 경로 감사 — production mutation이 canonical service만 쓰는지.
 * 실행: npm run test:booking-write-path
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../..');

const SKIP_DIR = new Set(['node_modules', 'dist', '.git']);

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkTsFiles(full, out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx')) {
      out.push(full);
    }
  }
  return out;
}

function rel(file: string): string {
  return relative(srcRoot, file).replace(/\\/g, '/');
}

function run() {
  const files = walkTsFiles(srcRoot);
  const storageStatusCallers: string[] = [];
  const persistFromMutation: string[] = [];

  const mutationAllowlist = new Set([
    'services/storage/scheduleStorage.ts',
    'core/schedules/bookingPassAtomic.ts',
    'core/services/scheduleService.ts',
    'core/schedules/parentBookingCancel.ts',
  ]);

  for (const file of files) {
    const path = rel(file);
    const src = readFileSync(file, 'utf8');

    if (
      /StorageService\.updateBookingStatus\s*\(/.test(src) &&
      path !== 'services/storage/scheduleStorage.ts'
    ) {
      storageStatusCallers.push(path);
    }

    if (
      path.startsWith('modules/') ||
      path.startsWith('core/') ||
      path.startsWith('shared/')
    ) {
      if (
        /(persistSchedules|upsertThenDiffDelete|flushPersist)\s*\(/.test(src) &&
        /updateBookingStatus|cancelBookingAsParent|saveBooking/.test(src)
      ) {
        if (
          path !== 'services/adapters/sync/corePersistCatalog.ts' &&
          path !== 'services/adapters/supabaseAdapter.ts'
        ) {
          persistFromMutation.push(path);
        }
      }
    }

    void mutationAllowlist;
  }

  assert.deepEqual(
    storageStatusCallers,
    [],
    `production이 StorageService.updateBookingStatus를 직접 호출하면 안 됩니다: ${storageStatusCallers.join(', ')}`
  );

  const calendar = readFileSync(
    join(srcRoot, 'industries/pilates/components/bookings/BookingCalendarView.tsx'),
    'utf8'
  );
  assert.match(calendar, /ScheduleService\.updateBookingStatus/);
  assert.doesNotMatch(calendar, /StorageService\.updateBookingStatus/);
  assert.doesNotMatch(calendar, /update_booking_status_with_pass/);

  const parentView = readFileSync(
    join(srcRoot, 'modules/parent/views/PilatesParentBookingsView.tsx'),
    'utf8'
  );
  assert.match(parentView, /ScheduleService\.cancelBookingAsParent/);
  assert.doesNotMatch(parentView, /ScheduleService\.updateBookingStatus/);

  const atomic = readFileSync(join(srcRoot, 'core/schedules/bookingPassAtomic.ts'), 'utf8');
  assert.match(atomic, /update_booking_status_with_pass/);
  assert.match(atomic, /writeLocalMirror/);
  assert.doesNotMatch(atomic, /persistSchedules/);
  assert.doesNotMatch(atomic, /upsertThenDiffDelete/);
  assert.doesNotMatch(atomic, /flushPersist/);

  const parentCancel = readFileSync(join(srcRoot, 'core/schedules/parentBookingCancel.ts'), 'utf8');
  assert.match(parentCancel, /cancel_booking_as_parent/);
  assert.doesNotMatch(parentCancel, /update_booking_status_with_pass/);
  assert.doesNotMatch(parentCancel, /persistSchedules/);

  const persistCatalog = readFileSync(
    join(srcRoot, 'services/adapters/sync/corePersistCatalog.ts'),
    'utf8'
  );
  assert.match(persistCatalog, /runRowUpserts/);
  assert.match(persistCatalog, /pendingDeleteIds/);
  assert.doesNotMatch(
    persistCatalog.match(/export async function persistSchedules[\s\S]*?(?=export async function|$)/)?.[0] ??
      '',
    /upsertThenDiffDelete/
  );

  assert.deepEqual(
    persistFromMutation.filter((p) =>
      /bookingPassAtomic|parentBookingCancel|scheduleService/.test(p)
    ),
    [],
    `예약 mutation이 snapshot persist를 호출하면 안 됩니다: ${persistFromMutation.join(', ')}`
  );

  console.log('bookingWritePath.test.ts: ok');
}

run();
