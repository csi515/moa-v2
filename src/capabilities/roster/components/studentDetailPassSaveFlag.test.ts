/**
 * 학생 상세 출결 저장은 업종 id 비교가 아니라 savesAttendanceWithPass 플래그가 결정한다.
 * 실행: npx tsx src/capabilities/roster/components/studentDetailPassSaveFlag.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INDUSTRY_ALIASES, INDUSTRY_DEFINITIONS, INDUSTRY_IDS } from '@/core/industry/definitions';
import { buildGenericPluginManifest } from '@/core/industry/genericPlugin';
import { getIndustryPlugin, installIndustryPlugin } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../../..');

function readSrc(rel: string): string {
  return readFileSync(join(srcRoot, rel), 'utf8');
}

function readLiteralFlag(rel: string): boolean {
  const source = readSrc(rel);
  const match = source.match(/savesAttendanceWithPass:\s*(true|false)/);
  assert.ok(match, `${rel} must declare savesAttendanceWithPass as true or false`);
  return match[1] === 'true';
}

const modalSource = readSrc('capabilities/roster/components/useStudentDetailModal.ts');
assert.match(modalSource, /if \(industryPlugin\.savesAttendanceWithPass\)/);
assert.match(modalSource, /saveAttendanceWithPass\(/);
assert.match(modalSource, /runStudentDetailAttendanceSideEffect\(industryPlugin\.id/);
assert.match(modalSource, /StorageService\.saveAttendanceRecord\(/);
assert.doesNotMatch(modalSource, /===\s*['"]piano['"]/);

const manifests: { id: string; rel: string }[] = [
  { id: 'piano', rel: 'industries/piano/plugin.ts' },
  { id: 'skin_clinic', rel: 'industries/skin/plugin.ts' },
  { id: 'gym', rel: 'industries/gym/plugin.ts' },
  { id: 'retail', rel: 'industries/retail/plugin.ts' },
  { id: 'sauna_jjimjilbang', rel: 'industries/bath/plugin.ts' },
  { id: 'daycare', rel: 'industries/daycare/plugin.ts' },
  { id: 'pilates', rel: 'industries/pilates/plugin.ts' },
];

const industryDir = join(srcRoot, 'industries');
const pluginFiles = readdirSync(industryDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `industries/${entry.name}/plugin.ts`)
  .sort();
assert.deepEqual(
  pluginFiles,
  manifests.map((item) => item.rel).sort(),
  'every industry plugin must be covered'
);

for (const { id, rel } of manifests) {
  const flag = readLiteralFlag(rel);
  assert.equal(flag, id === 'piano', `${id} manifest savesAttendanceWithPass`);
  installIndustryPlugin({
    id,
    savesAttendanceWithPass: flag,
  } as IndustryPluginManifest);
  assert.equal(Boolean(getIndustryPlugin(id).savesAttendanceWithPass), flag, id);
}

const genericSource = readSrc('core/industry/genericPlugin.ts');
assert.match(genericSource, /savesAttendanceWithPass:\s*definition\.id === 'piano'/);

for (const id of INDUSTRY_IDS) {
  const generic = buildGenericPluginManifest(INDUSTRY_DEFINITIONS[id]);
  assert.equal(
    generic.savesAttendanceWithPass,
    id === 'piano',
    `${id} generic fallback savesAttendanceWithPass`
  );
}

assert.equal(Boolean(getIndustryPlugin('piano').savesAttendanceWithPass), true);
assert.equal(Boolean(getIndustryPlugin(null).savesAttendanceWithPass), true);
assert.equal(Boolean(getIndustryPlugin(undefined).savesAttendanceWithPass), true);
assert.equal(Boolean(getIndustryPlugin('').savesAttendanceWithPass), true);
assert.equal(Boolean(getIndustryPlugin('   ').savesAttendanceWithPass), true);

for (const [alias, target] of Object.entries(INDUSTRY_ALIASES)) {
  assert.notEqual(target, 'piano', `${alias} must not alias to piano`);
  assert.equal(Boolean(getIndustryPlugin(alias).savesAttendanceWithPass), false, alias);
}

const unknown = getIndustryPlugin('future_industry');
assert.equal(unknown.id, 'academy');
assert.equal(Boolean(unknown.savesAttendanceWithPass), false);

console.log('studentDetailPassSaveFlag.test.ts OK');
