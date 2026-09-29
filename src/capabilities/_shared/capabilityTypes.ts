/**
 * Capability 계약. 구현 이동 없이 타입·매니페스트만 둔다.
 *
 * Core: 업종 독립 공통 기반
 * Capability: 여러 업종이 선택적으로 쓰는 업무 기능
 * Industry: 특정 업종의 조합·전용 기능
 * Composition: 업종과 capability를 조립
 */

export const CAPABILITY_IDS = [
  'attendance',
  'scheduling',
  'booking',
  'billing',
  'commerce',
  'parent',
  'resources',
  'transport',
  'roster',
  'enrollment',
  'consultation',
] as const;

export type CapabilityId = (typeof CAPABILITY_IDS)[number];

export interface CapabilityDefinition {
  id: CapabilityId;
  displayName: string;
  dependencies: CapabilityId[];
  configurable: boolean;
  defaultEnabled: boolean;
  requiredPermissions: string[];
}

/** 장기 디렉터리 계약. 지금은 선언만 하고 기존 코드를 옮기지 않는다. */
export type CapabilityPackageLayout = {
  manifest: 'manifest.ts';
  domain: 'domain/';
  application: 'application/';
  ui: 'ui/';
  infrastructure: 'infrastructure/';
  barrel: 'index.ts';
};

export interface CapabilityManifest {
  definition: CapabilityDefinition;
}

export function defineCapability(definition: CapabilityDefinition): CapabilityManifest {
  return { definition };
}

export function assertCapabilityDefinition(definition: CapabilityDefinition): void {
  if (!CAPABILITY_IDS.includes(definition.id)) {
    throw new Error(`unknown capability id: ${definition.id}`);
  }
  if (!definition.displayName.trim()) {
    throw new Error(`capability ${definition.id}: displayName required`);
  }
  for (const dep of definition.dependencies) {
    if (!CAPABILITY_IDS.includes(dep)) {
      throw new Error(`capability ${definition.id}: unknown dependency ${dep}`);
    }
    if (dep === definition.id) {
      throw new Error(`capability ${definition.id}: cannot depend on itself`);
    }
  }
}
