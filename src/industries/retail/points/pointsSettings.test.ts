/**
 * Retail 포인트 설정 검증.
 * 실행: npx tsx src/industries/retail/points/pointsSettings.test.ts
 */
import assert from 'node:assert/strict';
import {
  clampEarnRate,
  exampleEarnPoints,
  normalizeRetailPointsSettings,
  validateRetailPointsSettings,
  computeEarnPoints,
} from './pointsSettings';

function run(): void {
  assert.equal(clampEarnRate(1.04), 1);
  assert.equal(clampEarnRate(1.05), 1.1);
  assert.equal(clampEarnRate(-1), 0);
  assert.equal(clampEarnRate(150), 100);

  assert.equal(exampleEarnPoints(10000, 1), 100);
  assert.equal(exampleEarnPoints(10000, 1.5), 150);
  assert.equal(computeEarnPoints(30000, 1), 300);
  assert.equal(computeEarnPoints(9999, 1), 99);

  assert.equal(validateRetailPointsSettings({ earnRatePercent: 1 }), null);
  assert.ok(validateRetailPointsSettings({ earnRatePercent: Number.NaN }));
  assert.ok(validateRetailPointsSettings({ earnRatePercent: -1 }));
  assert.ok(validateRetailPointsSettings({ earnRatePercent: 101 }));
  assert.ok(validateRetailPointsSettings({ earnRatePercent: 1.23 }));

  const normalized = normalizeRetailPointsSettings({
    enabled: false,
    earnEnabled: true,
    earnRatePercent: 2,
  });
  assert.equal(normalized.enabled, false);
  assert.equal(normalized.earnEnabled, false);
  assert.equal(normalized.earnRatePercent, 2);

  console.log('pointsSettings.test.ts OK');
}

run();
