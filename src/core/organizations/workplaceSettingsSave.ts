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

/**
 * 저장 페이로드에서 금지된 키(Skin 카탈로그/마이그레이션 등)가 포함되지 않도록 검증합니다.
 */
export function validateWorkplaceSettingsPayload(
  payload: Partial<AcademySettings>
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const key of SKIN_ONLY_ORGANIZATION_SETTINGS_KEYS) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      violations.push(`Forbidden skin-only key detected in settings payload: ${key}`);
    }
  }
  return {
    valid: violations.length === 0,
    violations,
  };
}

/** WorkplaceSettingsView → updateOrganization settings. Skin 전용 키는 포함하지 않는다. */
export function buildWorkplaceSettingsSavePayload(
  settings: AcademySettings,
  options: { displayAddress: string; rooms: AcademyRoom[] }
): Partial<AcademySettings> {
  const payload: Partial<AcademySettings> = {
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

  const validation = validateWorkplaceSettingsPayload(payload);
  if (!validation.valid) {
    throw new Error(validation.violations.join(', '));
  }

  return payload;
}

/** OrganizationSettingsView 처럼 settings 를 펼친 공통 저장에서 skin 키만 제거한다. */
export function buildCommonOrganizationSettingsSavePayload(
  settings: AcademySettings,
  displayAddress: string
): Partial<AcademySettings> {
  const sanitized = omitSkinOnlyOrganizationSettings({
    ...settings,
    name: settings.name,
    directorName: settings.directorName,
    phone: settings.phone,
    businessNumber: settings.businessNumber,
    address: displayAddress,
  });

  const validation = validateWorkplaceSettingsPayload(sanitized);
  if (!validation.valid) {
    throw new Error(validation.violations.join(', '));
  }

  return sanitized;
}
