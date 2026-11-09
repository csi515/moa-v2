/**
 * Core Preset Resolver Interface & Inversion-of-Control Registry
 *
 * 3계층 아키텍처 원칙 준수:
 * - Core 및 Capability는 상위 Composition(Preset) 계층을 직접 import하지 않는다.
 * - Composition 레이어(src/app/presets/presetRegistry.ts)가 부트스트랩 시 리졸버를 주입(registerPresetResolver)한다.
 * - Capability 및 Core 모듈은 본 인터페이스를 통해 안전하게 프리셋 메타데이터를 조회한다.
 */

import type { IndustryPresetDefinition } from './types';

export type PresetResolver = (presetId: string) => IndustryPresetDefinition | undefined;

let globalPresetResolver: PresetResolver | null = null;

export function registerPresetResolver(resolver: PresetResolver): void {
  globalPresetResolver = resolver;
}

export function getResolvedPreset(presetId: string): IndustryPresetDefinition | undefined {
  if (!presetId || !globalPresetResolver) return undefined;
  return globalPresetResolver(presetId);
}
