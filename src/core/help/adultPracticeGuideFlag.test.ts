/**
 * 성인 수강생 이용 안내의 연습실 섹션은 업종 id 비교가 아니라
 * showsAdultPracticeGuide 플래그가 결정한다.
 * 빈·공백 업종은 숨기고, 피아노만 켠다. showsPracticeRoomTab을 재사용하지 않는다.
 * 실행: npx tsx src/core/help/adultPracticeGuideFlag.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAdultStudentPortalGuide } from '@/core/help/featureGuides';
import { showsAdultPracticeGuide } from '@/core/industry/industryUi';
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
  const match = source.match(/showsAdultPracticeGuide:\s*(true|false)/);
  assert.ok(match, `${rel} must declare showsAdultPracticeGuide`);
  return match[1] === 'true';
}

function hasPracticeSection(industry: string | null | undefined): boolean {
  return getAdultStudentPortalGuide(industry).sections.some((s) => s.id === 'adult-practice');
}

const guides = readSrc('core/help/featureGuides.ts');
assert.match(guides, /showsAdultPracticeGuide\(/);
assert.doesNotMatch(guides, /showsPracticeRoomTab/);
assert.doesNotMatch(
  guides.slice(guides.indexOf('export function getAdultStudentPortalGuide')),
  /===\s*['"]piano['"]/
);
assert.doesNotMatch(
  guides.slice(guides.indexOf('export function getAdultStudentPortalGuide')),
  /normalizeIndustryType/
);

const ui = readSrc('core/industry/industryUi.ts');
const fnStart = ui.indexOf('export function showsAdultPracticeGuide');
const fnEnd = ui.indexOf('/** 실(강의실·관리실 등) UI 설정 */', fnStart);
assert.ok(fnStart >= 0 && fnEnd > fnStart, 'showsAdultPracticeGuide helper missing');
const fn = ui.slice(fnStart, fnEnd);
assert.match(fn, /isBlankIndustryInput\(industry\)/);
assert.match(fn, /return Boolean\(getIndustryPlugin\(industry\)\.showsAdultPracticeGuide\)/);
assert.doesNotMatch(fn, /showsPracticeRoomTab/);
assert.doesNotMatch(fn, /===\s*['"]piano['"]/);

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
  assert.equal(flag, id === 'piano', `${id} manifest showsAdultPracticeGuide`);
  installIndustryPlugin({
    id,
    showsAdultPracticeGuide: flag,
  } as IndustryPluginManifest);
  assert.equal(showsAdultPracticeGuide(id), flag, id);
  assert.equal(hasPracticeSection(id), flag, `guide section ${id}`);
}

assert.equal(readFlag('core/industry/genericPlugin.ts'), false);

const enabled = INDUSTRY_IDS.filter((id) => showsAdultPracticeGuide(id));
assert.deepEqual(enabled, ['piano'], `guide must stay piano-only, got ${enabled.join(',')}`);

for (const [alias, target] of Object.entries(INDUSTRY_ALIASES)) {
  assert.equal(
    showsAdultPracticeGuide(alias),
    target === 'piano',
    `${alias} -> ${target}`
  );
  assert.equal(hasPracticeSection(alias), target === 'piano', `guide alias ${alias}`);
}

for (const blank of [null, undefined, '', '   ']) {
  assert.equal(showsAdultPracticeGuide(blank), false, `blank flag ${JSON.stringify(blank)}`);
  assert.equal(hasPracticeSection(blank), false, `blank guide ${JSON.stringify(blank)}`);
}

assert.equal(showsAdultPracticeGuide('rehearsal_room'), false);
assert.equal(showsAdultPracticeGuide('not-an-industry'), false);
assert.equal(hasPracticeSection('pilates'), false);
assert.equal(hasPracticeSection('gym'), false);
assert.equal(hasPracticeSection('piano'), true);

// 스태프 practice-rooms 안내는 PIANO_GUIDE에 고정. 성인 안내와 조건이 달라 옮기지 않는다.
assert.match(guides, /id:\s*'practice-rooms'/);
assert.doesNotMatch(guides, /showsAdultPracticeGuide\(.*practice-rooms/);
const pianoGuideSlice = guides.slice(
  guides.indexOf('const PIANO_GUIDE'),
  guides.indexOf('const PILATES_GUIDE')
);
assert.match(pianoGuideSlice, /id:\s*'practice-rooms'/);

console.log('adultPracticeGuideFlag.test.ts OK');
