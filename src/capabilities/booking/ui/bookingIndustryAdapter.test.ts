/**
 * 공유 예약 UI는 업종 id가 아니라 플러그인 훅으로 필라테스/피부 규칙을 고른다.
 * 실행: npx tsx src/capabilities/booking/ui/bookingIndustryAdapter.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installIndustryPlugins } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { pilatesBookingAdapter } from '@/industries/pilates/bookingAdapter';
import { skinBookingAdapter } from '@/industries/skin/bookingAdapter';
import {
  NEUTRAL_SERVICE_CATEGORY_LABELS,
  resolveBookingUi,
} from './bookingIndustryAdapter';

installIndustryPlugins([
  { id: 'pilates', bookingAdapter: pilatesBookingAdapter },
  { id: 'skin_clinic', bookingAdapter: skinBookingAdapter },
  { id: 'piano' },
  { id: 'gym' },
] as IndustryPluginManifest[]);

const pilates = resolveBookingUi('pilates');
const skin = resolveBookingUi('skin_clinic');
const piano = resolveBookingUi('piano');
const gym = resolveBookingUi('gym');
const missing = resolveBookingUi('not-a-real-industry');

assert.equal(pilates.flow, 'classSlots');
assert.deepEqual(pilates.categoryLabels, {
  private: '개인',
  group: '그룹',
  reformer: '기구',
  other: '기타',
});
assert.equal(pilates.careIntervalLabel, undefined);
assert.equal(pilates.consumePassOnNoShow, true);
assert.deepEqual(pilates.notifyOnStatus, ['confirmed', 'cancelled', 'completed', 'no_show']);
assert.equal(pilates.sessionNoun, '수업');
assert.equal(pilates.serviceDescription, '개인·그룹·기구 필라테스 수업 종류와 시간·요금을 설정합니다');
assert.equal(pilates.serviceNamePlaceholder, '개인 레슨 50분');
assert.equal(pilates.calendarAccentBtn, 'bg-teal-600 hover:bg-teal-700');
assert.equal(pilates.serviceHeaderBtn, 'bg-purple-600 hover:bg-purple-700');
assert.equal(pilates.serviceSubmitBtn, 'bg-purple-600');

assert.equal(skin.flow, 'appointmentCards');
assert.deepEqual(skin.categoryLabels, {
  private: '1:1',
  group: '그룹',
  reformer: '집중',
  other: '기타',
});
assert.equal(skin.careIntervalLabel, '권장 재방문 간격(일)');
assert.equal(skin.consumePassOnNoShow, false);
assert.deepEqual(skin.notifyOnStatus, ['confirmed', 'cancelled']);
assert.equal(skin.sessionNoun, '시술');
assert.equal(skin.serviceDescription, '1:1·그룹 시술과 시간·요금을 설정합니다');
assert.equal(skin.serviceNamePlaceholder, '기본 관리 60분');
assert.equal(skin.calendarAccentBtn, 'bg-rose-600 hover:bg-rose-700');
assert.equal(skin.serviceHeaderBtn, 'bg-rose-600 hover:bg-rose-700');
assert.equal(skin.serviceSubmitBtn, 'bg-rose-600');

for (const other of [piano, gym, missing]) {
  assert.equal(other.flow, 'none', other.flow);
  assert.equal(other.consumePassOnNoShow, false);
  assert.deepEqual(other.notifyOnStatus, []);
  assert.equal(other.careIntervalLabel, undefined);
  assert.deepEqual(other.categoryLabels, NEUTRAL_SERVICE_CATEGORY_LABELS);
  assert.notEqual(other.categoryLabels.reformer, '기구');
  assert.notEqual(other.categoryLabels.reformer, '집중');
  assert.notEqual(other.categoryLabels.private, '개인');
  assert.notEqual(other.categoryLabels.private, '1:1');
  assert.doesNotMatch(other.serviceDescription, /필라테스|기구|시술/);
}

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../../..');

const calendar = readFileSync(join(here, 'BookingCalendarView.tsx'), 'utf8');
const services = readFileSync(join(here, 'ServiceManagementView.tsx'), 'utf8');
const resolver = readFileSync(join(here, 'bookingIndustryAdapter.ts'), 'utf8');

for (const src of [calendar, services, resolver]) {
  assert.doesNotMatch(src, /isSkinClinicIndustry|isPilatesIndustry/);
  assert.doesNotMatch(src, /industry\s*===/);
  assert.doesNotMatch(src, /PILATES_CATEGORY|SKIN_CATEGORY/);
}
assert.match(calendar, /resolveBookingUi/);
assert.match(services, /resolveBookingUi/);
assert.match(calendar, /notifyOnStatus/);
assert.match(calendar, /classSlots/);
assert.match(calendar, /appointmentCards/);
assert.match(services, /careIntervalLabel/);
assert.doesNotMatch(services, /기구 필라테스/);

const wiring: [string, RegExp][] = [
  ['industries/pilates/plugin.ts', /bookingAdapter:\s*pilatesBookingAdapter/],
  ['industries/skin/plugin.ts', /bookingAdapter:\s*skinBookingAdapter/],
];
for (const [rel, pattern] of wiring) {
  assert.match(readFileSync(join(srcRoot, rel), 'utf8'), pattern, rel);
}

for (const rel of [
  'industries/piano/plugin.ts',
  'industries/gym/plugin.ts',
  'industries/daycare/plugin.ts',
  'industries/retail/plugin.ts',
  'industries/bath/plugin.ts',
  'core/industry/genericPlugin.ts',
]) {
  assert.doesNotMatch(readFileSync(join(srcRoot, rel), 'utf8'), /bookingAdapter/, rel);
}

console.log('bookingIndustryAdapter.test.ts: ok');
