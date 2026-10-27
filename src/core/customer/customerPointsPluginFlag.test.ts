/**
 * 고객 포털 포인트는 업종 id 비교가 아니라 showsCustomerPoints 플래그가 결정한다.
 * 오늘 동작(normalizeIndustryType === 'retail')과 같아야 한다.
 * 빈 값은 piano로 해석되고 piano는 false다. retail로 풀리는 별칭은 없다.
 * 실행: npx tsx src/core/customer/customerPointsPluginFlag.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { showsCustomerPoints } from '@/core/industry/industryUi';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import {
  INDUSTRY_ALIASES,
  INDUSTRY_IDS,
  normalizeIndustryType,
} from '@/core/industry/types';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../..');

function readSrc(rel: string): string {
  return readFileSync(join(srcRoot, rel), 'utf8');
}

function readFlag(rel: string): boolean {
  const source = readSrc(rel);
  const match = source.match(/showsCustomerPoints:\s*(true|false)/);
  assert.ok(match, `${rel} must declare showsCustomerPoints`);
  return match[1] === 'true';
}

const viewSource = readSrc('core/customer/CustomerMyOrgsView.tsx');
const serviceSource = readSrc('core/customer/services/myCustomerPointsService.ts');
assert.match(viewSource, /showsCustomerPoints\(org\.industryType\)/);
assert.match(serviceSource, /showsCustomerPoints\(params\.industryType\)/);
assert.doesNotMatch(viewSource, /normalizeIndustryType/);
assert.doesNotMatch(serviceSource, /normalizeIndustryType/);
assert.doesNotMatch(viewSource, /===\s*['"]retail['"]/);
assert.doesNotMatch(serviceSource, /===\s*['"]retail['"]/);

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
  assert.equal(flag, id === 'retail', `${id} manifest showsCustomerPoints`);
  installIndustryPlugin({
    id,
    showsCustomerPoints: flag,
  } as IndustryPluginManifest);
  assert.equal(showsCustomerPoints(id), flag, id);
}

assert.equal(readFlag('core/industry/genericPlugin.ts'), false);

function legacyEnabled(value: string | null | undefined): boolean {
  return normalizeIndustryType(value) === 'retail';
}

const samples: Array<string | null | undefined> = [
  ...INDUSTRY_IDS,
  ...Object.keys(INDUSTRY_ALIASES),
  '',
  '   ',
  null,
  undefined,
  'not_a_real_type',
  'RETAIL',
  'Retail',
];

const gained: string[] = [];
for (const sample of samples) {
  const next = showsCustomerPoints(sample);
  const prev = legacyEnabled(sample);
  assert.equal(next, prev, `points boundary changed for ${JSON.stringify(sample)}`);
  if (next && normalizeIndustryType(sample) !== 'retail') {
    gained.push(JSON.stringify(sample));
  }
}
assert.deepEqual(gained, [], `non-retail would gain points: ${gained.join(', ')}`);

assert.equal(normalizeIndustryType(''), 'piano');
assert.equal(normalizeIndustryType(null), 'piano');
assert.equal(normalizeIndustryType(undefined), 'piano');
assert.equal(showsCustomerPoints(''), false);
assert.equal(showsCustomerPoints(null), false);
assert.equal(showsCustomerPoints(undefined), false);
assert.equal(showsCustomerPoints('   '), false);
assert.equal(showsCustomerPoints('piano'), false);
assert.equal(showsCustomerPoints(''), showsCustomerPoints('piano'));
assert.equal(showsCustomerPoints('retail'), true);

for (const [alias, target] of Object.entries(INDUSTRY_ALIASES)) {
  assert.notEqual(target, 'retail', `unexpected retail alias ${alias}`);
  assert.equal(showsCustomerPoints(alias), false, alias);
}

const retailAlias = Object.entries(INDUSTRY_ALIASES).filter(([, target]) => target === 'retail');
assert.deepEqual(retailAlias, []);

console.log('customerPointsPluginFlag.test.ts OK');
