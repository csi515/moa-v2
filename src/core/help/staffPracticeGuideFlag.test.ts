/**
 * 스태프 기능 안내의 연습실 예약 항목은 업종 id 비교가 아니라
 * showsStaffPracticeGuide 플래그가 결정한다.
 * 빈 업종은 피아노 플러그인으로 떨어져 항목이 남고, 다른 업종은 항목이 생기지 않는다.
 * 성인 수강생 이용 안내는 main과 같이 빈 값(null/undefined/'')에서 연습실 섹션을 숨긴다.
 * 실행: npx tsx src/core/help/staffPracticeGuideFlag.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAdultStudentPortalGuide, getIndustryFeatureGuide } from '@/core/help/featureGuides';
import { showsStaffPracticeGuide } from '@/core/industry/industryUi';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { INDUSTRY_ALIASES, INDUSTRY_IDS } from '@/core/industry/types';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../..');

function readSrc(rel: string): string {
  return readFileSync(join(srcRoot, rel), 'utf8');
}

function readFlag(rel: string): boolean {
  const source = readSrc(rel);
  const match = source.match(/showsStaffPracticeGuide:\s*(true|false)/);
  assert.ok(match, `${rel} must declare showsStaffPracticeGuide`);
  return match[1] === 'true';
}

function hasStaffPracticeItem(industry: string | null | undefined): boolean {
  return getIndustryFeatureGuide(industry).sections.some((section) =>
    section.items.some((item) => item.id === 'practice-rooms')
  );
}

function hasAdultPracticeSection(industry: string | null | undefined): boolean {
  return getAdultStudentPortalGuide(industry).sections.some((section) => section.id === 'adult-practice');
}

const guides = readSrc('core/help/featureGuides.ts');
const pianoGuideSlice = guides.slice(
  guides.indexOf('const PIANO_GUIDE'),
  guides.indexOf('const PILATES_GUIDE')
);
assert.doesNotMatch(pianoGuideSlice, /id:\s*'practice-rooms'/);
assert.match(guides, /showsStaffPracticeGuide\(/);
assert.doesNotMatch(guides, /showsPracticeRoomTab/);
assert.doesNotMatch(guides, /showsAdultPracticeGuide/);

const staffFn = guides.slice(
  guides.indexOf('export function getIndustryFeatureGuide'),
  guides.indexOf('/** 성인 수강생(본인) 포털 이용 안내 */')
);
assert.match(staffFn, /showsStaffPracticeGuide\(industry\)/);
assert.doesNotMatch(staffFn, /===\s*['"]piano['"]/);

const adultFn = guides.slice(guides.indexOf('export function getAdultStudentPortalGuide'));
assert.match(adultFn, /industry \? normalizeIndustryType\(industry\) : null/);
assert.match(adultFn, /type === 'piano'/);
assert.doesNotMatch(adultFn, /showsStaffPracticeGuide/);
assert.doesNotMatch(adultFn, /showsAdultPracticeGuide/);

const ui = readSrc('core/industry/industryUi.ts');
const fn = ui.slice(
  ui.indexOf('export function showsStaffPracticeGuide'),
  ui.indexOf('/** 실(강의실·관리실 등) UI 설정 */')
);
assert.match(fn, /return Boolean\(getIndustryPlugin\(industry\)\.showsStaffPracticeGuide\)/);
assert.doesNotMatch(fn, /===\s*['"]piano['"]/);
assert.doesNotMatch(fn, /if \(!industry\) return false/);
assert.doesNotMatch(fn, /isBlankIndustryInput/);

const manifests: { id: string; rel: string }[] = [
  { id: 'piano', rel: 'industries/piano/plugin.ts' },
  { id: 'skin_clinic', rel: 'industries/skin/plugin.ts' },
  { id: 'gym', rel: 'industries/gym/plugin.ts' },
  { id: 'retail', rel: 'industries/retail/plugin.ts' },
  { id: 'sauna_jjimjilbang', rel: 'industries/bath/plugin.ts' },
  { id: 'daycare', rel: 'industries/daycare/plugin.ts' },
  { id: 'pilates', rel: 'industries/pilates/plugin.ts' },
];

for (const { id, rel } of manifests) {
  const flag = readFlag(rel);
  assert.equal(flag, id === 'piano', `${id} manifest showsStaffPracticeGuide`);
  installIndustryPlugin({
    id,
    showsStaffPracticeGuide: flag,
  } as IndustryPluginManifest);
  assert.equal(showsStaffPracticeGuide(id), flag, id);
  assert.equal(hasStaffPracticeItem(id), flag, `staff guide ${id}`);
}

assert.equal(readFlag('core/industry/genericPlugin.ts'), false);

const enabled = INDUSTRY_IDS.filter((id) => showsStaffPracticeGuide(id));
assert.deepEqual(enabled, ['piano'], `staff guide must stay piano-only, got ${enabled.join(',')}`);
const guided = INDUSTRY_IDS.filter((id) => hasStaffPracticeItem(id));
assert.deepEqual(guided, ['piano'], `staff item must stay piano-only, got ${guided.join(',')}`);

for (const [alias, target] of Object.entries(INDUSTRY_ALIASES)) {
  assert.equal(showsStaffPracticeGuide(alias), target === 'piano', `${alias} -> ${target}`);
  assert.equal(hasStaffPracticeItem(alias), target === 'piano', `staff guide alias ${alias}`);
}

for (const blank of [null, undefined, '', '   ']) {
  assert.equal(showsStaffPracticeGuide(blank), true, `blank flag ${JSON.stringify(blank)}`);
  assert.equal(hasStaffPracticeItem(blank), true, `blank staff guide ${JSON.stringify(blank)}`);
}

assert.equal(showsStaffPracticeGuide('rehearsal_room'), false);
assert.equal(showsStaffPracticeGuide('not-an-industry'), false);
assert.equal(hasStaffPracticeItem('rehearsal_room'), false);
assert.equal(hasStaffPracticeItem('not-an-industry'), false);
assert.equal(hasStaffPracticeItem('academy'), false);
assert.equal(hasStaffPracticeItem('hair_salon'), false);

for (const industry of ['piano', null, undefined, '', '   '] as const) {
  const attendance = getIndustryFeatureGuide(industry).sections.find((section) => section.id === 'attendance');
  assert.ok(attendance, `attendance section ${JSON.stringify(industry)}`);
  const ids = attendance.items.map((item) => item.id);
  assert.equal(ids[ids.indexOf('makeups') + 1], 'practice-rooms');
}

for (const hidden of [null, undefined, '']) {
  assert.equal(hasAdultPracticeSection(hidden), false, `adult blank ${JSON.stringify(hidden)}`);
}
assert.equal(hasAdultPracticeSection('   '), true);
assert.equal(hasAdultPracticeSection('piano'), true);
assert.equal(hasAdultPracticeSection('pilates'), false);
assert.equal(hasAdultPracticeSection('gym'), false);
assert.equal(hasAdultPracticeSection('not-an-industry'), false);

console.log('staffPracticeGuideFlag.test.ts OK');
