/**
 * Multi-vertical Preset Dynamic Assembly Engine (Composition Layer)
 *
 * 주어진 업종 프리셋 선언에 따라, 포함된 모든 원자적 Capability들의
 * 온보딩 설정 스키마(setupSchema)와 프레임워크 리소스(resources)를
 * 동적으로 결합(Merge)하여 반환한다.
 */

import {
  assembleCapabilities,
  assembleAdHocBundles,
} from '@/core/presets/presetAssembler';
import type {
  AssembledPresetResult,
  CapabilityResourceItem,
  CapabilitySetupSchema,
  IndustryPresetDefinition,
  PresetCapabilityId,
  SetupFieldDefinition,
} from '@/core/presets/types';
import {
  CAPABILITY_BUNDLES,
  getIndustryPreset,
} from './presetRegistry';

export { assembleCapabilities };

/**
 * 특정 업종 프리셋 ID를 기반으로 setupSchema와 resources를 동적 병합
 */
export function assemblePreset(presetId: string): AssembledPresetResult {
  const preset = getIndustryPreset(presetId);
  if (!preset) {
    throw new Error(`미등록된 업종 프리셋 ID입니다: ${presetId}`);
  }

  return assembleCapabilities(preset, CAPABILITY_BUNDLES);
}

/**
 * 프리셋 정의 객체로부터 setupSchema와 resources 병합
 */
export function assembleCapabilitiesForPreset(
  preset: IndustryPresetDefinition
): AssembledPresetResult {
  return assembleCapabilities(preset, CAPABILITY_BUNDLES);
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
  return assembleAdHocBundles(capabilities, CAPABILITY_BUNDLES);
}
