/**
 * 업종 id 비교 → 매니페스트 필드 이전 회귀 테스트(ParentIndustryAdapter·LoyaltyStampView).
 * 스냅샷(fixtures/industryIdMigration.snapshot.json)은 이전 전(id 비교) 코드로 만든 값이다.
 * core 테스트는 capabilities를 import할 수 없어(check-architecture core-out) 여기 둔다.
 *
 * 실행: npm run test:industry-id-migration
 * 스냅샷 갱신(의도된 변경일 때만): UPDATE_SNAPSHOT=1 npm run test:industry-id-migration
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installIndustryPlugins } from '@/core/industry/pluginHost';
import { INDUSTRY_DEFINITIONS } from '@/core/industry/definitions';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { ParentIndustryAdapter } from '@/capabilities/parent/ParentIndustryAdapter';
import { resolveLoyaltyStampTemplate } from '@/capabilities/loyalty_stamp/domain/loyaltyStampTemplate';
import { pianoPluginManifest } from '@/industries/piano/plugin';
import { pilatesPluginManifest } from '@/industries/pilates/plugin';
import { gymPluginManifest } from '@/industries/gym/plugin';
import { daycarePluginManifest } from '@/industries/daycare/plugin';
import { skinPluginManifest } from '@/industries/skin/plugin';
import { retailPluginManifest } from '@/industries/retail/plugin';
import { bathPluginManifest } from '@/industries/bath/plugin';

const manifests: IndustryPluginManifest[] = [
  pianoPluginManifest,
  pilatesPluginManifest,
  gymPluginManifest,
  daycarePluginManifest,
  skinPluginManifest,
  retailPluginManifest,
  bathPluginManifest,
];
installIndustryPlugins(manifests);

const inputs: Array<string | null> = Array.from(
  new Set<string>([
    ...manifests.flatMap((m) => [m.id, ...(m.aliases ?? [])]),
    ...Object.keys(INDUSTRY_DEFINITIONS),
    '',
    '   ',
    'unknown_industry_xyz',
  ])
);
inputs.push(null);

function iconName(node: unknown): string {
  const type = (node as { type?: { displayName?: string; name?: string; render?: { displayName?: string } } })?.type;
  return type?.displayName ?? type?.render?.displayName ?? type?.name ?? '?';
}

function resolveAll(input: string | null) {
  return {
    parentBookingVariant: ParentIndustryAdapter.getPolicy(input).bookingVariant,
    parentNav: ParentIndustryAdapter.getNav(input).map((n) => `${n.id}:${n.label}:${iconName(n.icon)}`),
    parentRoleLabel: ParentIndustryAdapter.getRoleLabel(input),
    parentSecondaryTabs: ParentIndustryAdapter.getSecondaryTabs(input),
    parentFeeTitle: ParentIndustryAdapter.getFeeTitle(input),
    loyaltyStampTemplate: resolveLoyaltyStampTemplate(input),
  };
}

const actual = Object.fromEntries(inputs.map((i) => [i === null ? '<null>' : JSON.stringify(i), resolveAll(i)]));
const snapshotPath = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/industryIdMigration.snapshot.json');

if (process.env.UPDATE_SNAPSHOT === '1') {
  writeFileSync(snapshotPath, JSON.stringify(actual, null, 2) + '\n');
  console.log('industryIdMigration.snapshot.test.ts: snapshot written');
} else {
  assert.deepEqual(actual, JSON.parse(readFileSync(snapshotPath, 'utf8')));
  // 같은 업종은 같은 네비 배열을 돌려준다(렌더 안정성).
  assert.equal(ParentIndustryAdapter.getNav('piano'), ParentIndustryAdapter.getNav('piano'));
  console.log('industryIdMigration.snapshot.test.ts: ok');
}
