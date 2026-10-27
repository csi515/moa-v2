/**
 * PIN 출결 플래그 계산 = 온보딩 초기값.
 * 실행: npm run test:attendance-features
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AcademySettings } from '@/types';
import {
  resolveAttendanceEnabledForBackfill,
  resolveAttendanceFeatureEnabled,
  withAttendanceModuleEnabled,
} from './attendanceFeatureFlag';

function settings(enabled?: boolean): AcademySettings {
  const base: AcademySettings = {
    name: '테스트',
    address: '',
    phone: '',
    defaultTuitionFee: 180000,
  };
  if (typeof enabled !== 'boolean') {
    return base;
  }
  return {
    ...base,
    features: { attendance: { enabled } },
  };
}

const INDUSTRY_DEFAULTS = {
  piano: false,
  pilates: false,
  gym: true,
  daycare: true,
  skin_clinic: false,
  retail: false,
  sauna_jjimjilbang: false,
} as const;

function run() {
  for (const [industry, industryDefault] of Object.entries(INDUSTRY_DEFAULTS)) {
    assert.equal(
      resolveAttendanceFeatureEnabled(undefined, industryDefault),
      industryDefault,
      `${industry} unset`
    );
    assert.equal(resolveAttendanceFeatureEnabled(true, industryDefault), true, `${industry} explicit true`);
    assert.equal(resolveAttendanceFeatureEnabled(false, industryDefault), false, `${industry} explicit false`);
  }

  const daycareUnset = settings();
  const daycareInitial = resolveAttendanceFeatureEnabled(undefined, INDUSTRY_DEFAULTS.daycare);
  assert.equal(daycareInitial, true);
  assert.notEqual(daycareUnset.features?.attendance?.enabled === true, daycareInitial);
  const afterNext = withAttendanceModuleEnabled(daycareUnset, daycareInitial);
  assert.equal(afterNext.features?.attendance?.enabled, true);
  assert.equal(
    resolveAttendanceFeatureEnabled(afterNext.features?.attendance?.enabled, INDUSTRY_DEFAULTS.daycare),
    true
  );

  const pianoUnset = settings();
  const pianoInitial = resolveAttendanceFeatureEnabled(undefined, INDUSTRY_DEFAULTS.piano);
  assert.equal(pianoInitial, false);
  assert.equal(
    withAttendanceModuleEnabled(pianoUnset, pianoInitial).features?.attendance?.enabled,
    false
  );

  const gymExplicitFalse = settings(false);
  assert.equal(
    withAttendanceModuleEnabled(
      gymExplicitFalse,
      resolveAttendanceFeatureEnabled(gymExplicitFalse.features?.attendance?.enabled, INDUSTRY_DEFAULTS.gym)
    ).features?.attendance?.enabled,
    false
  );

  const pianoExplicitTrue = settings(true);
  assert.equal(
    resolveAttendanceFeatureEnabled(
      pianoExplicitTrue.features?.attendance?.enabled,
      INDUSTRY_DEFAULTS.piano
    ),
    true
  );

  const backfillUnsetNoData = resolveAttendanceEnabledForBackfill({
    settings: settings(),
    hasPinOrSessionData: false,
  });
  assert.equal(backfillUnsetNoData.changed, true);
  assert.equal(backfillUnsetNoData.enabled, false);

  const backfillUnsetWithData = resolveAttendanceEnabledForBackfill({
    settings: settings(),
    hasPinOrSessionData: true,
  });
  assert.equal(backfillUnsetWithData.enabled, true);

  const backfillExplicit = resolveAttendanceEnabledForBackfill({
    settings: settings(true),
    hasPinOrSessionData: false,
  });
  assert.equal(backfillExplicit.changed, false);
  assert.equal(backfillExplicit.enabled, true);

  const here = dirname(fileURLToPath(import.meta.url));
  const featuresSrc = readFileSync(join(here, 'features.ts'), 'utf8');
  assert.match(featuresSrc, /resolveAttendanceFeatureEnabled/);
  assert.match(featuresSrc, /getIndustryPlugin\(industry\)\.attendanceDefault/);

  const wizard = readFileSync(join(here, '../../../shared/components/OnboardingWizard.tsx'), 'utf8');
  assert.match(wizard, /isAttendanceModuleEnabled/);
  assert.equal(wizard.includes('saved.features?.attendance?.enabled === true'), false);

  const pluginFiles: Record<keyof typeof INDUSTRY_DEFAULTS, string> = {
    piano: '../../../industries/piano/plugin.ts',
    pilates: '../../../industries/pilates/plugin.ts',
    gym: '../../../industries/gym/plugin.ts',
    daycare: '../../../industries/daycare/plugin.ts',
    skin_clinic: '../../../industries/skin/plugin.ts',
    retail: '../../../industries/retail/plugin.ts',
    sauna_jjimjilbang: '../../../industries/bath/plugin.ts',
  };
  for (const [industry, relative] of Object.entries(pluginFiles)) {
    const src = readFileSync(join(here, relative), 'utf8');
    const expected = INDUSTRY_DEFAULTS[industry as keyof typeof INDUSTRY_DEFAULTS];
    assert.match(src, new RegExp(`attendanceDefault:\\s*${expected}`));
  }

  console.log('features.test.ts: ok');
}

run();
