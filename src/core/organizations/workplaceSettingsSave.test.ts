/**
 * 사업장/공통 설정 저장 페이로드에 Skin 카탈로그·이관 마커가 없어야 한다.
 * 실행: npx tsx src/core/organizations/workplaceSettingsSave.test.ts
 */
import assert from 'node:assert/strict';
import type { AcademySettings } from './settingsTypes';
import {
  SKIN_ONLY_ORGANIZATION_SETTINGS_KEYS,
  buildCommonOrganizationSettingsSavePayload,
  buildWorkplaceSettingsSavePayload,
} from './workplaceSettingsSave';

const settings: AcademySettings = {
  name: '테스트 샵',
  directorName: '원장',
  address: '옛 주소',
  phone: '010-0000-0000',
  businessNumber: '123-45-67890',
  defaultTuitionFee: 120000,
  defaultPaymentDay: 5,
  defaultBillingMode: 'monthly',
  includeExtrasInMonthlyInvoice: true,
  bankAccount: '국민 123',
  depositEnabled: true,
  depositAmount: 30000,
  rooms: [{ id: 'room-1', name: '케어 1', kind: 'treatment' }],
  features: {
    attendance: { enabled: true },
    points: { enabled: true, earnEnabled: false, earnRatePercent: 1 },
  },
  retailCatalog: [{ id: 'sku-1', name: '크림', price: 10000, stock: 3 }],
  skinRetailCoreMigratedAt: '2024-01-01T00:00:00.000Z',
  skinRetailCoreMigratedAtByOrg: { 'org-1': '2024-01-01T00:00:00.000Z' },
  skinRetailMigratedProductIdsByOrg: { 'org-1': ['sku-1'] },
};

function assertSkinKeysAbsent(payload: object) {
  for (const key of SKIN_ONLY_ORGANIZATION_SETTINGS_KEYS) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(payload, key),
      false,
      `${key} must be omitted, not null`
    );
    assert.equal((payload as Record<string, unknown>)[key], undefined);
  }
  const json = JSON.stringify(payload);
  for (const key of SKIN_ONLY_ORGANIZATION_SETTINGS_KEYS) {
    assert.equal(json.includes(`"${key}"`), false);
  }
}

const workplace = buildWorkplaceSettingsSavePayload(settings, {
  displayAddress: '서울시 강남구',
  rooms: settings.rooms ?? [],
});

assertSkinKeysAbsent(workplace);
assert.equal(workplace.depositEnabled, true);
assert.equal(workplace.defaultTuitionFee, 120000);
assert.deepEqual(workplace.rooms, settings.rooms);
assert.deepEqual(workplace.features, settings.features);
assert.equal(workplace.address, '서울시 강남구');
assert.equal(workplace.name, '테스트 샵');

const common = buildCommonOrganizationSettingsSavePayload(settings, '서울시 강남구');
assertSkinKeysAbsent(common);
assert.equal(common.depositEnabled, true);
assert.equal(common.depositAmount, 30000);
assert.equal(common.defaultTuitionFee, 120000);
assert.deepEqual(common.rooms, settings.rooms);
assert.deepEqual(common.features, settings.features);
assert.equal(common.defaultPaymentDay, 5);

console.log('workplaceSettingsSave.test.ts: ok');
