import type { AcademyRoom, AcademySettings } from './settingsTypes';

/**
 * Skin 카탈로그·이관 마커. organizations.settings 에 남기되,
 * 사업장/공통 설정 저장 페이로드에는 넣지 않는다.
 * 기록은 skinRetailCatalogMigrate.syncMigrateProgress 만 한다.
 * updateOrganization 은 기존 JSON 에 caller 키를 덮어쓰므로, 키를 빼면 유지되고 null 을 넣으면 지워진다.
 */
export const SKIN_ONLY_ORGANIZATION_SETTINGS_KEYS = [
  'retailCatalog',
  'skinRetailCoreMigratedAt',
  'skinRetailCoreMigratedAtByOrg',
  'skinRetailMigratedProductIdsByOrg',
] as const;

export type SkinOnlyOrganizationSettingsKey =
  (typeof SKIN_ONLY_ORGANIZATION_SETTINGS_KEYS)[number];

export function omitSkinOnlyOrganizationSettings<T extends object>(
  settings: T
): Omit<T, SkinOnlyOrganizationSettingsKey> {
  const next = { ...settings } as T & Record<string, unknown>;
  for (const key of SKIN_ONLY_ORGANIZATION_SETTINGS_KEYS) {
    delete next[key];
  }
  return next;
}

/** WorkplaceSettingsView → updateOrganization settings. Skin 전용 키는 포함하지 않는다. */
export function buildWorkplaceSettingsSavePayload(
  settings: AcademySettings,
  options: { displayAddress: string; rooms: AcademyRoom[] }
): Partial<AcademySettings> {
  return {
    name: settings.name,
    directorName: settings.directorName,
    phone: settings.phone,
    businessNumber: settings.businessNumber,
    address: options.displayAddress,
    defaultTuitionFee: settings.defaultTuitionFee,
    defaultPaymentDay: settings.defaultPaymentDay,
    defaultBillingMode: settings.defaultBillingMode,
    includeExtrasInMonthlyInvoice: settings.includeExtrasInMonthlyInvoice,
    bankAccount: settings.bankAccount,
    depositEnabled: settings.depositEnabled,
    depositAmount: settings.depositAmount,
    staffHours: settings.staffHours,
    features: settings.features,
    rooms: options.rooms,
  };
}

/** OrganizationSettingsView 처럼 settings 를 펼친 공통 저장에서 skin 키만 제거한다. */
export function buildCommonOrganizationSettingsSavePayload(
  settings: AcademySettings,
  displayAddress: string
): Partial<AcademySettings> {
  return omitSkinOnlyOrganizationSettings({
    ...settings,
    name: settings.name,
    directorName: settings.directorName,
    phone: settings.phone,
    businessNumber: settings.businessNumber,
    address: displayAddress,
  });
}
