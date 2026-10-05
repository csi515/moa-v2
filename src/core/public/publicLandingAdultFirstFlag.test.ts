/**
 * 공개 랜딩의 성인 우선은 업종 id 비교가 아니라 publicLandingAdultFirst 플래그가 결정한다.
 * 오늘 성인 우선인 업종만 true: 체육관(별칭 taekwondo)과 예약 업종(필라테스·피부).
 * 빈 업종은 false.
 * 실행: npx tsx src/core/public/publicLandingAdultFirstFlag.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicLandingAdultFirst } from '@/core/industry/industryUi';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { INDUSTRY_ALIASES, INDUSTRY_IDS, normalizeIndustryType } from '@/core/industry/types';
import { getIndustryPlugin } from '@/core/industry/pluginHost';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../..');

function readSrc(rel: string): string {
  return readFileSync(join(srcRoot, rel), 'utf8');
}

function readBool(rel: string, field: string): boolean {
  const source = readSrc(rel);
  const match = source.match(new RegExp(`${field}:\\s*(true|false)`));
  assert.ok(match, `${rel} must declare ${field}`);
  return match[1] === 'true';
}

const hookSource = readSrc('core/public/usePublicOrganization.ts');
assert.match(hookSource, /publicLandingAdultFirst\(org\.industry_type\)/);
assert.doesNotMatch(hookSource, /normalizeIndustryType/);
assert.doesNotMatch(hookSource, /isAppointmentIndustry/);
assert.doesNotMatch(hookSource, /===\s*['"]gym['"]/);

const manifests: { rel: string }[] = [
  { rel: 'industries/piano/plugin.ts' },
  { rel: 'industries/skin/plugin.ts' },
  { rel: 'industries/gym/plugin.ts' },
  { rel: 'industries/retail/plugin.ts' },
  { rel: 'industries/bath/plugin.ts' },
  { rel: 'industries/daycare/plugin.ts' },
  { rel: 'industries/pilates/plugin.ts' },
];

for (const { rel } of manifests) {
  const source = readSrc(rel);
  const idMatch = source.match(/id:\s*'([^']+)'/);
  assert.ok(idMatch, `${rel} id`);
  const id = idMatch[1];
  const appointment = readBool(rel, 'isAppointment');
  const flag = readBool(rel, 'publicLandingAdultFirst');
  const legacyTrue = appointment || id === 'gym';
  assert.equal(flag, legacyTrue, `${id} manifest publicLandingAdultFirst`);
  installIndustryPlugin({
    id,
    isAppointment: appointment,
    publicLandingAdultFirst: flag,
  } as IndustryPluginManifest);
}

assert.equal(readBool('core/industry/genericPlugin.ts', 'publicLandingAdultFirst'), false);

/** 조직이 있을 때 기존 훅 조건. 플래그 이전과 같아야 한다. */
function legacyAdultFirst(industry: string | null | undefined): boolean {
  const appointment = Boolean(industry) && Boolean(getIndustryPlugin(industry).isAppointment);
  return appointment || normalizeIndustryType(industry) === 'gym';
}

const samples: (string | null | undefined)[] = [
  ...INDUSTRY_IDS,
  ...Object.keys(INDUSTRY_ALIASES),
  null,
  undefined,
  '',
  '   ',
  'not_a_real_type',
  ' gym ',
  ' taekwondo ',
];

const trueIds = new Set<string>();
for (const sample of samples) {
  const next = publicLandingAdultFirst(sample);
  const prev = legacyAdultFirst(sample);
  assert.equal(next, prev, `adultFirst changed for ${JSON.stringify(sample)}`);
  if (typeof sample === 'string' && sample.trim() && next) {
    trueIds.add(normalizeIndustryType(sample) ?? sample.trim());
  }
}

assert.deepEqual([...trueIds].sort(), ['gym', 'pilates', 'skin_clinic']);
assert.equal(publicLandingAdultFirst('taekwondo'), true);
assert.equal(publicLandingAdultFirst('gym'), true);
assert.equal(publicLandingAdultFirst('pilates'), true);
assert.equal(publicLandingAdultFirst('skin_clinic'), true);
assert.equal(publicLandingAdultFirst('preschool'), false);
assert.equal(publicLandingAdultFirst('kindergarten'), false);
assert.equal(publicLandingAdultFirst('sauna_jjimjbang'), false);
assert.equal(publicLandingAdultFirst(''), false);
assert.equal(publicLandingAdultFirst('   '), false);
assert.equal(publicLandingAdultFirst(null), false);
assert.equal(publicLandingAdultFirst(undefined), false);
assert.equal(publicLandingAdultFirst('piano'), false);
assert.equal(publicLandingAdultFirst('not_a_real_type'), false);

console.log('publicLandingAdultFirstFlag.test.ts OK');
console.log('true canonical ids:', [...trueIds].sort().join(', '));
