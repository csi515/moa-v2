/**
 * 고객 포털 연습실 탭은 업종 id 비교가 아니라 showsPracticeRoomTab 플래그가 결정한다.
 * 빈 업종은 피아노 플러그인으로 떨어져 탭이 남고, 다른 업종은 탭이 생기지 않는다.
 * 실행: npx tsx src/core/customer/customerPracticeRoomTabFlag.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { showsPracticeRoomTab } from '@/core/industry/industryUi';
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
  const match = source.match(/showsPracticeRoomTab:\s*(true|false)/);
  assert.ok(match, `${rel} must declare showsPracticeRoomTab`);
  return match[1] === 'true';
}

for (const rel of [
  'core/customer/CustomerPortalBody.tsx',
  'core/customer/CustomerShell.tsx',
]) {
  const source = readSrc(rel);
  assert.match(source, /showsPracticeRoomTab\(/);
  assert.doesNotMatch(source, /===\s*['"]piano['"]/);
  assert.doesNotMatch(source, /normalizeIndustryType/);
}

const ui = readSrc('core/industry/industryUi.ts');
const fn = ui.slice(
  ui.indexOf('export function showsPracticeRoomTab'),
  ui.indexOf('/** 실(강의실·관리실 등) UI 설정 */')
);
assert.match(fn, /return Boolean\(getIndustryPlugin\(industry\)\.showsPracticeRoomTab\)/);
assert.doesNotMatch(fn, /===\s*['"]piano['"]/);
assert.doesNotMatch(fn, /if \(!industry\) return false/);

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
  assert.equal(flag, id === 'piano', `${id} manifest showsPracticeRoomTab`);
  installIndustryPlugin({
    id,
    showsPracticeRoomTab: flag,
  } as IndustryPluginManifest);
  assert.equal(showsPracticeRoomTab(id), flag, id);
}

assert.equal(readFlag('core/industry/genericPlugin.ts'), false);

const enabled = INDUSTRY_IDS.filter((id) => showsPracticeRoomTab(id));
assert.deepEqual(enabled, ['piano'], `tab must stay piano-only, got ${enabled.join(',')}`);

for (const [alias, target] of Object.entries(INDUSTRY_ALIASES)) {
  assert.equal(
    showsPracticeRoomTab(alias),
    target === 'piano',
    `${alias} -> ${target}`
  );
}

for (const blank of [null, undefined, '', '   ']) {
  assert.equal(showsPracticeRoomTab(blank), true, `empty fallback ${JSON.stringify(blank)}`);
}

assert.equal(showsPracticeRoomTab('rehearsal_room'), false);
assert.equal(showsPracticeRoomTab('not-an-industry'), false);

console.log('customerPracticeRoomTabFlag.test.ts OK');
