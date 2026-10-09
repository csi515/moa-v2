/**
 * Generic Preset Dynamic Assembly Engine (Core)
 *
 * Core 조립기는 특정 업종이나 Capability의 구현을 직접 알지 않으며,
 * 주입된 CapabilityModuleBundle과 IndustryPresetDefinition을 기반으로
 * setupSchema와 resources를 순수하게 병합(Merge)한다.
 */

import type {
  AssembledPresetResult,
  CapabilityModuleBundle,
  CapabilityResourceItem,
  CapabilitySetupSchema,
  IndustryPresetDefinition,
  PresetCapabilityId,
  SetupFieldDefinition,
} from './types';

// Core 차원의 동적 번들 레지스트리 (선택적 런타임 주입용)
const dynamicBundleRegistry = new Map<PresetCapabilityId, CapabilityModuleBundle>();

export function registerCapabilityBundle(bundle: CapabilityModuleBundle): void {
  dynamicBundleRegistry.set(bundle.capabilityId, bundle);
}

export function registerCapabilityBundles(
  bundles: Record<string, CapabilityModuleBundle> | CapabilityModuleBundle[]
): void {
  if (Array.isArray(bundles)) {
    for (const b of bundles) {
      dynamicBundleRegistry.set(b.capabilityId, b);
    }
  } else {
    for (const b of Object.values(bundles)) {
      dynamicBundleRegistry.set(b.capabilityId, b);
    }
  }
}

export function getRegisteredCapabilityBundle(
  id: PresetCapabilityId
): CapabilityModuleBundle | undefined {
  return dynamicBundleRegistry.get(id);
}

export function clearRegisteredBundles(): void {
  dynamicBundleRegistry.clear();
}

/**
 * 프리셋 정의 객체와 Capability 번들들을 전달받아 setupSchema와 resources를 병합
 */
export function assembleCapabilities(
  preset: IndustryPresetDefinition,
  bundleRegistry:
    | Record<string, CapabilityModuleBundle>
    | Map<string, CapabilityModuleBundle> = dynamicBundleRegistry
): AssembledPresetResult {
  const setupSchemas: CapabilitySetupSchema[] = [];
  const resources: CapabilityResourceItem[] = [];
  const seenResourceNames = new Set<string>();
  const seenFieldIds = new Set<string>();
  const allFields: SetupFieldDefinition[] = [];

  const getBundle = (id: string): CapabilityModuleBundle | undefined => {
    if (bundleRegistry instanceof Map) {
      return bundleRegistry.get(id as PresetCapabilityId);
    }
    return bundleRegistry[id as PresetCapabilityId];
  };

  for (const capId of preset.capabilities) {
    const bundle = getBundle(capId);
    if (!bundle) {
      throw new Error(`프리셋 [${preset.id}]에 정의된 Capability [${capId}]의 번들이 존재하지 않습니다.`);
    }

    // 1. setupSchema 병합
    setupSchemas.push(bundle.setupSchema);

    // 2. allFields 수집 (필드 ID 중복 방어)
    for (const field of bundle.setupSchema.fields) {
      const uniqueFieldKey = `${capId}_${field.id}`;
      if (!seenFieldIds.has(uniqueFieldKey)) {
        seenFieldIds.add(uniqueFieldKey);
        allFields.push({
          ...field,
          id: uniqueFieldKey,
        });
      }
    }

    // 3. resources 병합 (동일 리소스명 중복 방어)
    for (const res of bundle.resources.resources) {
      if (!seenResourceNames.has(res.name)) {
        seenResourceNames.add(res.name);
        resources.push(res);
      }
    }
  }

  return {
    preset,
    capabilities: preset.capabilities,
    setupSchemas,
    resources,
    allFields,
  };
}

/**
 * 기존 인터페이스 호환: 프리셋 정의로부터 번들 병합 (주입 레지스트리 우선, 미제공 시 동적 레지스트리)
 */
export function assembleCapabilitiesForPreset(
  preset: IndustryPresetDefinition,
  bundles?: Record<string, CapabilityModuleBundle>
): AssembledPresetResult {
  return assembleCapabilities(preset, bundles ?? dynamicBundleRegistry);
}

/**
 * 임의의 Capability 목록과 번들을 직접 조합할 수 있는 범용 조립기
 */
export function assembleAdHocBundles(
  capabilities: readonly PresetCapabilityId[],
  bundleRegistry:
    | Record<string, CapabilityModuleBundle>
    | Map<string, CapabilityModuleBundle> = dynamicBundleRegistry
): {
  setupSchemas: CapabilitySetupSchema[];
  resources: CapabilityResourceItem[];
  allFields: SetupFieldDefinition[];
} {
  const virtualPreset: IndustryPresetDefinition = {
    id: 'ad_hoc',
    name: '사용자 맞춤 조합',
    description: '임의의 Capability 레고 블록 조합',
    category: 'custom',
    capabilities,
  };

  const result = assembleCapabilities(virtualPreset, bundleRegistry);
  return {
    setupSchemas: result.setupSchemas,
    resources: result.resources,
    allFields: result.allFields,
  };
}

