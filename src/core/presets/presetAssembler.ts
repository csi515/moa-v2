/**
 * Multi-vertical Preset Dynamic Assembly Engine
 *
 * 주어진 업종 프리셋 선언에 따라, 포함된 모든 원자적 Capability들의
 * 온보딩 설정 스키마(setupSchema)와 프레임워크 리소스(resources)를
 * 동적으로 결합(Merge)하여 반환한다.
 */

import {
  CAPABILITY_BUNDLES,
  getIndustryPreset,
  type CapabilityModuleBundle,
} from './presetRegistry';
import type {
  AssembledPresetResult,
  CapabilityResourceItem,
  CapabilitySetupSchema,
  IndustryPresetDefinition,
  PresetCapabilityId,
  SetupFieldDefinition,
} from './types';

/**
 * 특정 업종 프리셋 ID를 기반으로 setupSchema와 resources를 동적 병합
 */
export function assemblePreset(presetId: string): AssembledPresetResult {
  const preset = getIndustryPreset(presetId);
  if (!preset) {
    throw new Error(`미등록된 업종 프리셋 ID입니다: ${presetId}`);
  }

  return assembleCapabilitiesForPreset(preset);
}

/**
 * 프리셋 정의 객체로부터 setupSchema와 resources 병합
 */
export function assembleCapabilitiesForPreset(
  preset: IndustryPresetDefinition
): AssembledPresetResult {
  const setupSchemas: CapabilitySetupSchema[] = [];
  const resources: CapabilityResourceItem[] = [];
  const seenResourceNames = new Set<string>();
  const seenFieldIds = new Set<string>();
  const allFields: SetupFieldDefinition[] = [];

  for (const capId of preset.capabilities) {
    const bundle: CapabilityModuleBundle | undefined = CAPABILITY_BUNDLES[capId];
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
          id: uniqueFieldKey, // 고유화
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
 * 임의의 Capability 목록을 직접 조합할 수 있는 범용 조립기
 */
export function assembleAdHocCapabilities(
  capabilities: readonly PresetCapabilityId[]
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

  const result = assembleCapabilitiesForPreset(virtualPreset);
  return {
    setupSchemas: result.setupSchemas,
    resources: result.resources,
    allFields: result.allFields,
  };
}
