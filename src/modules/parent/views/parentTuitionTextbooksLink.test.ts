/**
 * 학부모 수강료 화면의 교재 링크는 업종 id가 아니라 showsTextbooksLink 플래그를 따른다.
 * 실행: npx tsx src/modules/parent/views/parentTuitionTextbooksLink.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { showsTextbooksLink } from '@/core/industry/industryUi';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../../..');

function readSrc(rel: string): string {
  return readFileSync(join(srcRoot, rel), 'utf8');
}

function readFlag(rel: string): boolean {
  const source = readSrc(rel);
  const match = source.match(/showsTextbooksLink:\s*(true|false)/);
  assert.ok(match, `${rel} must declare showsTextbooksLink`);
  return match[1] === 'true';
}

const viewSource = readSrc('modules/parent/views/ParentTuitionView.tsx');
assert.match(viewSource, /const showTextbooks = showsTextbooksLink\(industry\);/);
assert.doesNotMatch(viewSource, /showTextbooks\s*=\s*industry\s*===\s*'piano'/);

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
  assert.equal(flag, id === 'piano', `${id} manifest showsTextbooksLink`);
  installIndustryPlugin({
    id,
    showsTextbooksLink: flag,
  } as IndustryPluginManifest);
  assert.equal(showsTextbooksLink(id), flag, id);
}

assert.equal(readFlag('core/industry/genericPlugin.ts'), false);
assert.equal(showsTextbooksLink(null), false);
assert.equal(showsTextbooksLink(undefined), false);

console.log('parentTuitionTextbooksLink.test.ts OK');
