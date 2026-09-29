/**
 * Industry definition의 capability 플래그 조회.
 * 허용 ID와 runtime 값은 Composition(`src/app/industry/industryCapabilityMap.ts`)이 소유한다.
 * Core는 @/capabilities 를 import하지 않는다.
 */
export interface IndustryCapabilityIds {}

export type IndustryCapabilityId = Extract<keyof IndustryCapabilityIds, string>;

export type IndustryCapabilityFlagMap = Partial<Record<IndustryCapabilityId, boolean>>;

export function enabledIndustryCapabilities(
  capabilities: IndustryCapabilityFlagMap | undefined
): IndustryCapabilityId[] {
  if (!capabilities) return [];
  return Object.entries(capabilities)
    .filter((entry): entry is [IndustryCapabilityId, true] => entry[1] === true)
    .map(([id]) => id)
    .sort();
}

export function isIndustryCapabilityEnabled(
  capabilities: IndustryCapabilityFlagMap | undefined,
  capabilityId: string
): boolean {
  if (!capabilities) return false;
  return Object.entries(capabilities).some(([id, on]) => id === capabilityId && on === true);
}

export function isIndustryCapabilityDefaultOn(
  defaults: IndustryCapabilityFlagMap | undefined,
  capabilityId: string
): boolean {
  if (!defaults) return false;
  return Object.entries(defaults).some(([id, on]) => id === capabilityId && on === true);
}
