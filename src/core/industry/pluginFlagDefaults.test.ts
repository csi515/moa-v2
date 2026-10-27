/**
 * 플러그인 플래그 중앙 기본값 회귀 테스트.
 * 설치된 업종·별칭·빈 값·미등록 값마다 해석된 플래그와 공개 헬퍼 결과가
 * 중앙 기본값 도입 전 스냅샷(__fixtures__/pluginFlagDefaults.snapshot.json)과 같아야 한다.
 *
 * 실행: npm run test:plugin-flag-defaults
 * 스냅샷 갱신(의도된 변경일 때만): UPDATE_SNAPSHOT=1 npm run test:plugin-flag-defaults
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installIndustryPlugins } from './pluginHost';
import { getIndustryPlugin } from './registry';
import { INDUSTRY_DEFINITIONS } from './definitions';
import * as ui from './industryUi';
import { resolveIndustryContext } from './contextResolver';
import { DefaultFallbackPluginAdapter, type IndustryFeatureKey } from './IndustryAdapter';
import type { IndustryPluginManifest } from './pluginTypes';
import { PLUGIN_FLAG_DEFAULTS, getPluginFlag, type PluginFlagName } from './pluginFlagDefaults';
import { getTerminologyDictionary } from '@/core/terminology/dictionaries';
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

const FEATURE_KEYS: IndustryFeatureKey[] = [
  'class_based_schedule', 'deposit', 'textbooks_link', 'pin_side_effects', 'makeup_list',
  'withdrawal_exit_label', 'attendance_with_pass', 'practice_room_tab', 'customer_points',
  'adult_practice_guide', 'staff_practice_guide', 'linked_billing_income', 'performance_videos',
  'song_stamps', 'public_landing_adult_first', 'school_fields', 'pickup_fields',
];

const FLAG_NAMES = Object.keys(PLUGIN_FLAG_DEFAULTS) as PluginFlagName[];

function resolveAll(input: string | null) {
  const plugin = getIndustryPlugin(input);
  const adapter = ui.getIndustryPluginAdapter(input);
  const ctx = resolveIndustryContext(input);
  return {
    pluginId: plugin.id,
    flags: Object.fromEntries(FLAG_NAMES.map((f) => [f, getPluginFlag(plugin, f)])),
    features: Object.fromEntries(FEATURE_KEYS.map((k) => [k, adapter.hasFeature(k)])),
    labels: {
      place: adapter.getLabel('place'),
      customer: adapter.getLabel('customer'),
      owner: adapter.getLabel('owner'),
      fee: adapter.getLabel('fee'),
    },
    context: ctx.labels,
    // 업종 id 비교를 매니페스트 필드로 옮긴 core 호출부(IndustryAdapter·dictionaries).
    // ParentIndustryAdapter·LoyaltyStampView는 scripts/industryIdMigration.snapshot.test.ts
    migrated: {
      attendanceRecordNoun: adapter.getAttendanceConfig().recordNoun,
      portalRoleLabel: adapter.getPortalConfig().portalRoleLabel,
      terminology: JSON.stringify(getTerminologyDictionary(input)),
    },
    helpers: {
      isAppointmentIndustry: ui.isAppointmentIndustry(input),
      publicLandingAdultFirst: ui.publicLandingAdultFirst(input),
      getPlaceLabel: ui.getPlaceLabel(input),
      getOwnerLabel: ui.getOwnerLabel(input),
      getPlaceNamePlaceholder: ui.getPlaceNamePlaceholder(input),
      getCustomerLabel: ui.getCustomerLabel(input),
      getAttendanceSummaryMetric: ui.getAttendanceSummaryMetric(input),
      getFeeLabel: ui.getFeeLabel(input),
      getBankAccountPlaceholder: ui.getBankAccountPlaceholder(input),
      supportsDeposit: ui.supportsDeposit(input),
      showsTextbooksLink: ui.showsTextbooksLink(input),
      runsPinCheckInSideEffects: ui.runsPinCheckInSideEffects(input),
      showsMakeupList: ui.showsMakeupList(input),
      showsPracticeRoomTab: ui.showsPracticeRoomTab(input),
      showsCustomerPoints: ui.showsCustomerPoints(input),
      showsAdultPracticeGuide: ui.showsAdultPracticeGuide(input),
      showsStaffPracticeGuide: ui.showsStaffPracticeGuide(input),
      includesLinkedBillingIncome: ui.includesLinkedBillingIncome(input),
    },
  };
}

const actual = Object.fromEntries(inputs.map((i) => [i === null ? '<null>' : JSON.stringify(i), resolveAll(i)]));

const here = dirname(fileURLToPath(import.meta.url));
const snapshotPath = join(here, '__fixtures__/pluginFlagDefaults.snapshot.json');

if (process.env.UPDATE_SNAPSHOT === '1') {
  writeFileSync(snapshotPath, JSON.stringify(actual, null, 2) + '\n');
  console.log('pluginFlagDefaults.test.ts: snapshot written');
} else {
  const expected = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  assert.deepEqual(actual, expected);

  // 중앙 기본값: 플러그인이 비어 있으면 표의 값을 그대로 돌려준다.
  for (const f of FLAG_NAMES) {
    assert.equal(getPluginFlag(null, f), PLUGIN_FLAG_DEFAULTS[f]);
    assert.equal(getPluginFlag({}, f), PLUGIN_FLAG_DEFAULTS[f]);
  }
  // 장소 명칭 기본값은 호출부와 무관하게 '사업장'(플러그인이 명시한 값은 유지).
  assert.equal(PLUGIN_FLAG_DEFAULTS.placeLabel, '사업장');
  const noPlace = { ...pianoPluginManifest, placeLabel: undefined };
  assert.equal(getPluginFlag(noPlace, 'placeLabel'), '사업장');
  assert.equal(new DefaultFallbackPluginAdapter('piano', noPlace).getLabel('place'), '사업장');
  assert.equal(new DefaultFallbackPluginAdapter('piano', pianoPluginManifest).getLabel('place'), '학원');
  console.log('pluginFlagDefaults.test.ts: ok');
}
