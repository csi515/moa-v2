/**
 * 로스터 학생 폼의 학교·학년은 업종 id가 아니라 showSchoolFields 플래그를 따른다.
 * 실행: npx tsx src/core/students/showSchoolFields.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { showSchoolFields } from './levelOptions';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../..');

function readSrc(rel: string): string {
  return readFileSync(join(srcRoot, rel), 'utf8');
}

function readFlag(rel: string): boolean {
  const source = readSrc(rel);
  const match = source.match(/showSchoolFields:\s*(true|false)/);
  assert.ok(match, `${rel} must declare showSchoolFields`);
  return match[1] === 'true';
}

const formSource = readSrc('capabilities/roster/components/form/StudentBasicInfoSection.tsx');
assert.match(formSource, /const showSchool = showSchoolFields\(industry\);/);
assert.match(formSource, /\{showSchool && \(/);
assert.doesNotMatch(formSource, /industry\s*===\s*['"]piano['"]/);

const manifests: { id: string; rel: string }[] = [
  { id: 'piano', rel: 'industries/piano/plugin.ts' },
  { id: 'pilates', rel: 'industries/pilates/plugin.ts' },
  { id: 'gym', rel: 'industries/gym/plugin.ts' },
  { id: 'daycare', rel: 'industries/daycare/plugin.ts' },
  { id: 'skin_clinic', rel: 'industries/skin/plugin.ts' },
  { id: 'retail', rel: 'industries/retail/plugin.ts' },
  { id: 'sauna_jjimjilbang', rel: 'industries/bath/plugin.ts' },
];

for (const { id, rel } of manifests) {
  const flag = readFlag(rel);
  assert.equal(flag, id === 'piano', `${id} manifest showSchoolFields`);
  installIndustryPlugin({
    id,
    showSchoolFields: flag,
  } as IndustryPluginManifest);
  assert.equal(showSchoolFields(id), flag, id);
}

assert.equal(readFlag('core/industry/genericPlugin.ts'), false);
assert.equal(showSchoolFields('academy'), false);
assert.equal(showSchoolFields('future_industry'), false);

console.log('showSchoolFields.test.ts ok');
