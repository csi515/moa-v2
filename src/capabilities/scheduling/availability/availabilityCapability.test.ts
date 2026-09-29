/**
 * Availability Capability. 실행: npm run test:availability
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AvailabilityOverride, AvailabilityRule } from './types';
import {
  chunkSlots,
  getOverrideWindows,
  isClosedOnDate,
  isOutsideAvailabilityWindows,
  isOutsideResourceHours,
  isOutsideStaffHours,
  resolveWindowsForDate,
  windowsFromResourceHours,
} from './windows';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

function readSrc(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkTs(full, acc);
      continue;
    }
    if ((name.endsWith('.ts') || name.endsWith('.tsx')) && !name.endsWith('.test.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

function rule(partial: Partial<AvailabilityRule> & Pick<AvailabilityRule, 'day_of_week' | 'start_time' | 'end_time'>): AvailabilityRule {
  return {
    id: partial.id ?? 'rule-1',
    organization_id: 'org-1',
    staff_id: partial.staff_id ?? null,
    day_of_week: partial.day_of_week,
    start_time: partial.start_time,
    end_time: partial.end_time,
    slot_minutes: 30,
    title: partial.title ?? '예약',
    max_capacity: 1,
    is_active: true,
    metadata: {},
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
    ...partial,
  };
}

function override(
  partial: Partial<AvailabilityOverride> & Pick<AvailabilityOverride, 'override_date' | 'is_closed'>
): AvailabilityOverride {
  return {
    id: partial.id ?? 'ov-1',
    organization_id: 'org-1',
    staff_id: partial.staff_id ?? null,
    override_date: partial.override_date,
    is_closed: partial.is_closed,
    start_time: partial.start_time ?? null,
    end_time: partial.end_time ?? null,
    slot_minutes: partial.slot_minutes ?? 30,
    title: partial.title ?? null,
    max_capacity: 1,
    is_active: true,
    reason: null,
    metadata: partial.metadata ?? {},
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
    ...partial,
  };
}

function run() {
  const mondayRules = [rule({ day_of_week: 1, start_time: '10:00', end_time: '18:00' })];
  const monday = resolveWindowsForDate({
    date: '2026-09-21',
    rules: mondayRules,
    overrides: [],
    staffId: null,
  });
  assert.equal(monday.closed, false);
  assert.equal(monday.windows.length, 1);
  assert.equal(monday.windows[0].start_time, '10:00');
  assert.equal(monday.windows[0].end_time, '18:00');
  assert.equal(
    resolveWindowsForDate({
      date: '2026-09-26',
      rules: mondayRules,
      overrides: [],
      staffId: null,
    }).windows.length,
    0
  );

  const slots = chunkSlots('2026-09-21', '10:00', '11:30', 30);
  assert.equal(slots.length, 3);

  const thursdayOverride = resolveWindowsForDate({
    date: '2026-09-24',
    rules: [rule({ day_of_week: 4, start_time: '10:00', end_time: '18:00' })],
    overrides: [
      override({
        override_date: '2026-09-24',
        is_closed: false,
        start_time: '14:00',
        end_time: '17:00',
      }),
    ],
    staffId: null,
  });
  assert.deepEqual(
    thursdayOverride.windows.map((window) => `${window.start_time}-${window.end_time}`),
    ['14:00-17:00']
  );

  const closed = override({ override_date: '2026-09-24', is_closed: true });
  assert.equal(isClosedOnDate({ date: '2026-09-24', overrides: [closed], staffId: null }), true);
  assert.equal(
    resolveWindowsForDate({
      date: '2026-09-24',
      rules: [rule({ day_of_week: 4, start_time: '10:00', end_time: '18:00' })],
      overrides: [closed],
      staffId: null,
    }).closed,
    true
  );
  assert.deepEqual(getOverrideWindows(closed), []);

  const staffWindows = [
    { staffId: 'st1', days: ['목'] as Array<'목'>, startTime: '10:00', endTime: '18:00' },
  ];
  assert.equal(
    isOutsideStaffHours({
      staffId: 'st1',
      startsAt: '2026-09-24T10:00:00',
      endsAt: '2026-09-24T11:00:00',
      windows: staffWindows,
    }),
    false
  );
  assert.equal(
    isOutsideStaffHours({
      staffId: 'st1',
      startsAt: '2026-09-24T18:00:00',
      endsAt: '2026-09-24T19:00:00',
      windows: staffWindows,
    }),
    true
  );
  assert.equal(
    isOutsideStaffHours({
      staffId: 'st1',
      startsAt: '2026-09-24T10:00:00',
      endsAt: '2026-09-24T11:00:00',
      windows: [],
    }),
    false
  );
  assert.equal(
    isOutsideStaffHours({
      startsAt: '2026-09-24T22:00:00',
      endsAt: '2026-09-24T23:00:00',
      windows: staffWindows,
    }),
    false
  );

  const orgRules = [rule({ day_of_week: 4, start_time: '10:00', end_time: '18:00' })];
  assert.equal(
    isOutsideAvailabilityWindows({
      startsAt: '2026-09-24T10:00:00',
      endsAt: '2026-09-24T11:00:00',
      rules: orgRules,
      overrides: [],
    }),
    false
  );
  assert.equal(
    isOutsideAvailabilityWindows({
      startsAt: '2026-09-24T18:00:00',
      endsAt: '2026-09-24T19:00:00',
      rules: orgRules,
      overrides: [],
    }),
    true
  );
  assert.equal(
    isOutsideAvailabilityWindows({
      startsAt: '2026-09-26T10:00:00',
      endsAt: '2026-09-26T11:00:00',
      rules: orgRules,
      overrides: [],
    }),
    true
  );
  assert.equal(
    isOutsideAvailabilityWindows({
      startsAt: '2026-09-24T10:00:00',
      endsAt: '2026-09-24T11:00:00',
      rules: [],
      overrides: [],
    }),
    false
  );
  assert.equal(
    isOutsideAvailabilityWindows({
      startsAt: '2026-09-24T10:00:00',
      endsAt: '2026-09-24T11:00:00',
      rules: orgRules,
      overrides: [closed],
    }),
    true
  );

  const resourceWindow = windowsFromResourceHours({
    id: 'res-1',
    open_time: '09:00:00',
    close_time: '21:00:00',
  });
  assert.equal(
    isOutsideResourceHours({
      resourceId: 'res-1',
      startsAt: '2026-09-24T20:30:00',
      endsAt: '2026-09-24T21:00:00',
      windows: [resourceWindow],
    }),
    false
  );
  assert.equal(
    isOutsideResourceHours({
      resourceId: 'res-1',
      startsAt: '2026-09-24T21:00:00',
      endsAt: '2026-09-24T22:00:00',
      windows: [resourceWindow],
    }),
    true
  );

  const capabilitySrc = readSrc('src/capabilities/scheduling/availability/availabilityCapability.ts');
  assert.match(capabilitySrc, /availabilityService/);
  assert.match(capabilitySrc, /materializeAvailabilitySlots/);
  assert.match(capabilitySrc, /isOutsideStaffHours/);
  assert.match(capabilitySrc, /isOutsideResourceHours/);
  assert.match(capabilitySrc, /resolveWindowsForDate/);
  assert.doesNotMatch(capabilitySrc, /bath|sauna|piano|pilates|skin|retail|daycare/i);

  const coreAvail = walkTs(join(root, 'src/core/availability'))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  assert.doesNotMatch(coreAvail, /sauna_jjimjilbang/);
  assert.doesNotMatch(coreAvail, /EXCLUDE USING gist/);
  assert.doesNotMatch(coreAvail, /CREATE TABLE/);

  const skinFacade = readSrc('src/industries/skin/staffHours.ts');
  assert.match(skinFacade, /@\/capabilities\/scheduling/);
  assert.doesNotMatch(skinFacade, /function isOutsideStaffHours/);

  const pilatesValidate = readSrc('src/industries/pilates/components/bookings/validateBookingCreate.ts');
  assert.match(pilatesValidate, /@\/capabilities\/scheduling/);
  assert.doesNotMatch(pilatesValidate, /@\/modules\/skin\/staffHours/);

  const settings = readSrc('src/capabilities/scheduling/availability/AvailabilitySettingsView.tsx');
  assert.match(settings, /availabilityCapability/);
  assert.match(settings, /listOrgRules/);
  assert.doesNotMatch(settings, /availabilityService/);

  const materialize = readSrc('src/capabilities/scheduling/availability/materializeAvailabilitySlots.ts');
  assert.match(materialize, /resolveWindowsForDate/);
  assert.match(materialize, /staffId: null/);

  const service = readSrc('src/capabilities/scheduling/availability/availabilityService.ts');
  assert.match(service, /staff_id/);
  assert.match(service, /AvailabilityListQuery/);

  const settingsShim = readSrc('src/core/schedules/components/AvailabilitySettingsView.tsx');
  assert.match(settingsShim, /@deprecated 신규 코드는/);
  assert.match(settingsShim, /@\/capabilities\/scheduling/);

  const materializeShim = readSrc('src/core/schedules/services/materializeAvailabilitySlots.ts');
  assert.match(materializeShim, /@deprecated 신규 코드는/);
  assert.match(materializeShim, /@\/capabilities\/scheduling/);

  const serviceShim = readSrc('src/core/schedules/services/availabilityService.ts');
  assert.match(serviceShim, /@deprecated 신규 코드는/);
  assert.match(serviceShim, /@\/capabilities\/scheduling/);

  console.log('availabilityCapability.test.ts: ok');
}

run();
