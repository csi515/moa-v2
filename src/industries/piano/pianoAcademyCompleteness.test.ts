/**
 * 피아노학원 프리셋·화면·일정 계약.
 * 실행: npm run test:piano-academy
 */
import assert from 'node:assert/strict';
import { getBusinessRule } from '@/app/presets/presetBusinessRules';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import {
  DEFAULT_OPERATING_DAYS,
  initialLessonDurationMinutes,
  operatingDaysFromPreset,
} from '@/shared/components/onboarding/onboardingHelpers';
import {
  PIANO_ATTENDANCE_HUB_TABS,
  PIANO_CUSTOMER_HUB_TABS,
  PIANO_FINANCE_HUB_TABS,
  PIANO_SCHEDULE_HUB_TABS,
  PIANO_SETTINGS_HUB_TABS,
} from './config/hubRoutes';
import {
  addMinutesToClock,
  PIANO_DEFAULT_LESSON_MINUTES,
  resolvePianoLessonMinutes,
} from './config/pianoLessonMinutes';
import { resolvePianoNavHighlightTab } from './config/navHighlight';
import {
  PIANO_ROOM_ENTRY_TABS,
  resolvePianoScheduleSegment,
} from './config/pianoScheduleRoutes';
import {
  getPianoSettingsExtras,
  PIANO_CORE_SETTINGS_EXTRAS,
} from './config/pianoSettingsExtras';
import { PIANO_MOBILE_MAIN_TABS } from './config/nav';
import { pianoPassConfig } from './config/passConfig';
import { slotEndTime } from './components/schedule/pianoTimetablePlacement';
import {
  monthGridDates,
  rangeForMode,
  shiftCalendarPeriod,
  startOfWeekSunday,
} from './components/practiceRooms/practiceRoomCalendarUtils';
import viewMap from './viewMap';

const preset = getIndustryPreset('piano');
assert.ok(preset, 'piano preset');
assert.equal(preset.readinessLevel, 'verified');
assert.equal(preset.terms?.customer, '원생');
assert.equal(preset.terms?.space, '연습실');
assert.equal(getBusinessRule('piano', 'lessonDurationMinutes', 0), PIANO_DEFAULT_LESSON_MINUTES);
assert.equal(preset.operatingHours?.slot_minutes, 30);

for (const cap of preset.requiredCapabilities ?? []) {
  assert.ok(preset.capabilities.includes(cap), `required cap ${cap} must be enabled`);
}

const capabilityView: Record<string, string> = {
  attendance: 'attendance',
  passes: 'passes',
  billing_invoicing: 'finance',
  seat_room: 'practice-rooms',
  consultation_crm: 'consultations',
  curriculum_progress: 'curriculum',
  retention_marketing: 'retention',
  vehicle_shuttle: 'shuttle',
  membership_referral_tree: 'family-tree',
};
for (const [cap, tab] of Object.entries(capabilityView)) {
  assert.ok(preset.capabilities.includes(cap as never), cap);
  assert.equal(typeof viewMap[tab], 'function', `${cap} view ${tab}`);
}

const scheduleView = viewMap.timetable;
for (const tab of PIANO_ROOM_ENTRY_TABS) {
  assert.equal(viewMap[tab], scheduleView, `${tab} must share the schedule hub`);
  assert.equal(resolvePianoScheduleSegment(tab), 'rooms');
  assert.equal(resolvePianoNavHighlightTab(tab), 'timetable');
}
assert.equal(resolvePianoScheduleSegment('makeups'), 'makeups');
assert.equal(resolvePianoScheduleSegment('calendar'), 'events');
assert.equal(resolvePianoNavHighlightTab('lessons'), 'attendance');
assert.equal(resolvePianoNavHighlightTab('tuition'), 'tuition');
assert.equal(resolvePianoNavHighlightTab('income'), 'finance');
assert.equal(resolvePianoNavHighlightTab('passes'), 'settings');

const hubTabs = [
  ...PIANO_CUSTOMER_HUB_TABS,
  ...PIANO_ATTENDANCE_HUB_TABS,
  ...PIANO_SCHEDULE_HUB_TABS,
  ...PIANO_FINANCE_HUB_TABS,
  ...PIANO_SETTINGS_HUB_TABS,
  ...PIANO_MOBILE_MAIN_TABS,
];
for (const tab of hubTabs) {
  assert.equal(typeof viewMap[tab], 'function', `missing view for ${tab}`);
}

const extras = getPianoSettingsExtras([
  'retention_marketing',
  'vehicle_shuttle',
  'membership_referral_tree',
  'inventory',
]);
const extraTabs = extras.map((row) => row.tab);
assert.equal(new Set(extraTabs).size, extraTabs.length, 'settings extras must be unique');
for (const row of PIANO_CORE_SETTINGS_EXTRAS) {
  assert.equal(typeof viewMap[row.tab], 'function', row.tab);
}
assert.equal(extras.some((row) => row.tab === 'supplies'), true);
assert.equal(getPianoSettingsExtras([]).some((row) => row.tab === 'retention'), false);

assert.equal(pianoPassConfig.customerLabel, '원생');
assert.equal(pianoPassConfig.defaultTotalSessions, 8);
assert.match(pianoPassConfig.description, /1회 차감/);

assert.equal(slotEndTime('15:00'), '15:30');
assert.equal(resolvePianoLessonMinutes(50), 50);
assert.equal(resolvePianoLessonMinutes(undefined), 30);
assert.equal(addMinutesToClock('23:50', 30), '00:20');

assert.equal(
  initialLessonDurationMinutes({
    savedMinutes: 50,
    onboardingStatus: 'not_started',
    presetMinutes: 30,
  }),
  30
);
assert.equal(
  initialLessonDurationMinutes({
    savedMinutes: 40,
    onboardingStatus: 'completed',
    presetMinutes: 30,
  }),
  40
);

const freshDays = operatingDaysFromPreset(
  DEFAULT_OPERATING_DAYS,
  preset.operatingHours,
  'not_started'
);
assert.equal(freshDays.find((day) => day.day === '월')?.start, '13:00');
assert.equal(freshDays.find((day) => day.day === '월')?.end, '19:00');
assert.equal(freshDays.find((day) => day.day === '토')?.start, '10:00');
const keptDays = operatingDaysFromPreset(
  DEFAULT_OPERATING_DAYS,
  preset.operatingHours,
  'completed'
);
assert.equal(keptDays.find((day) => day.day === '월')?.start, '14:00');

assert.equal(startOfWeekSunday('2026-11-04'), '2026-11-01');
assert.deepEqual(rangeForMode('week', '2026-11-04'), {
  start: '2026-11-01',
  end: '2026-11-07',
});
assert.equal(shiftCalendarPeriod('month', '2026-01-31', 1), '2026-02-28');
assert.equal(shiftCalendarPeriod('day', '2026-11-04', -1), '2026-11-03');
const november = monthGridDates('2026-11-01');
assert.equal(november.length % 7, 0);
assert.equal(november[0], '2026-11-01');
assert.ok(november.includes('2026-11-30'));

/** 브라우저 E2E wave-1 스모크: 수납·상담·설정·일정(시간표/보강/캘린더/연습실) */
const PIANO_WAVE1_SMOKE_TABS = [
  'tuition',
  'consultations',
  'settings',
  'teachers',
  'notices',
  'account',
  'timetable',
  'calendar',
  'makeups',
  'practice-rooms',
] as const;
for (const tab of PIANO_WAVE1_SMOKE_TABS) {
  assert.equal(typeof viewMap[tab], 'function', `wave1 smoke route ${tab}`);
}

console.log('piano academy completeness: ok');
