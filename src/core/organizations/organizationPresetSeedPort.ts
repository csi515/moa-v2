/**
 * Core ← App 프리셋 시드 포트 (IoC).
 * App의 organizationPresetSeed가 구현을 등록하고, Wizard는 본 포트만 호출한다.
 */

import type { OrganizationAddressValue } from '@/core/address';

export interface OrganizationPresetSeedInput {
  orgName: string;
  industry: string;
  formValues?: Record<string, unknown>;
  settingsExtras?: Record<string, unknown>;
  directorName?: string;
  addressParts?: OrganizationAddressValue;
  addressDisplay?: string;
  seedFields?: boolean;
  seedCategories?: boolean;
}

export interface OrganizationPresetSeedResult {
  organizationId: string;
  name: string;
}

export type OrganizationPresetSeedFn = (
  input: OrganizationPresetSeedInput
) => Promise<OrganizationPresetSeedResult>;

let seedImpl: OrganizationPresetSeedFn | null = null;

export function registerOrganizationPresetSeed(fn: OrganizationPresetSeedFn): void {
  seedImpl = fn;
}

export async function createOrganizationWithPresetSeed(
  input: OrganizationPresetSeedInput
): Promise<OrganizationPresetSeedResult> {
  if (!seedImpl) {
    throw new Error(
      '프리셋 시드가 준비되지 않았습니다. 앱 부트스트랩(organizationPresetSeed)을 확인하세요.'
    );
  }
  return seedImpl(input);
}
