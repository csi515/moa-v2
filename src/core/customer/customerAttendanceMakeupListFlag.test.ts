/**
 * 고객 출결의 보강 목록은 업종 id 비교가 아니라 showsMakeupList 플래그가 결정한다.
 * 실행: npx tsx src/core/customer/customerAttendanceMakeupListFlag.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { showsMakeupList } from '@/core/industry/industryUi';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../..');

function readSrc(rel: string): string {
  return readFileSync(join(srcRoot, rel), 'utf8');
}

function readFlag(rel: string): boolean {
  const source = readSrc(rel);
  const match = source.match(/showsMakeupList:\s*(true|false)/);
  assert.ok(match, `${rel} must declare showsMakeupList`);
  return match[1] === 'true';
}

const viewSource = readSrc('core/customer/CustomerAttendanceView.tsx');
assert.match(viewSource, /showsMakeupList\(industry\)/);
assert.doesNotMatch(viewSource, /industry\s*===\s*['"]piano['"]/);
assert.match(viewSource, /StorageService\.getMakeupItems\(\)/);

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
  assert.equal(flag, id === 'piano', `${id} manifest showsMakeupList`);
  installIndustryPlugin({
    id,
    showsMakeupList: flag,
  } as IndustryPluginManifest);
  assert.equal(showsMakeupList(id), flag, id);
}

assert.equal(readFlag('core/industry/genericPlugin.ts'), false);
assert.equal(showsMakeupList(null), false);
assert.equal(showsMakeupList(undefined), false);
assert.equal(showsMakeupList(''), false);

console.log('customerAttendanceMakeupListFlag.test.ts OK');
