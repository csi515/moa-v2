/**
 * Industry → Capability runtime composition. Composition SoT.
 * Core catalog와 독립이다. Core는 @/capabilities 구현을 import하지 않는다.
 */
import type { CapabilityId } from '@/capabilities';
import { getIndustryDefinition, type IndustryType } from '@/core/industry/catalog';
import {
  isIndustryCapabilityDefaultOn,
  isIndustryCapabilityEnabled,
  type IndustryCapabilityFlagMap,
  type IndustryCapabilityId,
} from '@/core/industry/industryCapabilities';

declare module '@/core/industry/industryCapabilities' {
  interface IndustryCapabilityIds extends Record<CapabilityId, true> {}
}

type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _capabilityIdsMatch: AssertEqual<IndustryCapabilityId, CapabilityId> = true;
void _capabilityIdsMatch;

/** Industry별 실행 시 켤 capability + 업종 기본 활성 플래그. */
export type IndustryRuntimeCapabilityComposition = {
  capabilities: IndustryCapabilityFlagMap;
  defaults: IndustryCapabilityFlagMap;
};

export const INDUSTRY_CAPABILITY_COMPOSITION = {
  piano: {
    capabilities: {
      roster: true,
      scheduling: true,
      billing: true,
      attendance: true,
      parent: true,
      enrollment: true,
      consultation: true,
      resources: true,
      booking: true,
    },
    defaults: { attendance: false },
  },
  pilates: {
    capabilities: {
      roster: true,
      booking: true,
      scheduling: true,
      attendance: true,
      billing: true,
    },
    defaults: { attendance: false },
  },
  gym: {
    capabilities: {
      roster: true,
      scheduling: true,
      attendance: true,
      billing: true,
      transport: true,
      parent: true,
      enrollment: true,
    },
    defaults: { attendance: true },
  },
  skin_clinic: {
    capabilities: {
      roster: true,
      booking: true,
      scheduling: true,
      attendance: true,
      billing: true,
      commerce: true,
    },
    defaults: { attendance: false },
  },
  sauna_jjimjilbang: {
    capabilities: {
      roster: true,
      booking: true,
      scheduling: true,
    },
    defaults: { attendance: false },
  },
  daycare: {
    capabilities: {
      roster: true,
      attendance: true,
      parent: true,
      scheduling: true,
      billing: true,
      enrollment: true,
      consultation: true,
    },
    defaults: { attendance: true },
  },
  retail: {
    capabilities: {
      roster: true,
      commerce: true,
    },
    defaults: { attendance: false },
  },
} as const satisfies Record<string, IndustryRuntimeCapabilityComposition>;

function resolveComposition(
  industry: IndustryType | string | null | undefined
): IndustryRuntimeCapabilityComposition | undefined {
  const id = getIndustryDefinition(industry)?.id;
  if (!id) return undefined;
  return INDUSTRY_CAPABILITY_COMPOSITION[id as keyof typeof INDUSTRY_CAPABILITY_COMPOSITION];
}

export function getIndustryCapabilities(
  industry: IndustryType | string | null | undefined
): IndustryCapabilityFlagMap {
  return { ...(resolveComposition(industry)?.capabilities ?? {}) };
}

export function hasIndustryCapability(
  industry: IndustryType | string | null | undefined,
  capabilityId: string
): boolean {
  return isIndustryCapabilityEnabled(resolveComposition(industry)?.capabilities, capabilityId);
}

export function hasIndustryCapabilityDefault(
  industry: IndustryType | string | null | undefined,
  capabilityId: string
): boolean {
  return isIndustryCapabilityDefaultOn(resolveComposition(industry)?.defaults, capabilityId);
}

export type { IndustryCapabilityFlagMap, IndustryCapabilityId } from '@/core/industry/industryCapabilities';
export type { CapabilityId };
export type { IndustryCatalogMetadata } from '@/core/industry/catalog';
