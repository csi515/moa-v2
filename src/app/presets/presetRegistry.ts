/**
 * Multi-vertical Industry Preset Registry & Capability Registry (Composition Layer)
 *
 * 3계층 엄격 분리 원칙:
 * 1. Core: 인증, 테넌트 격리, 확장 인터페이스 (개별 Capability를 모름)
 * 2. Capability: 독립 업무 영역, 업종 중립적 재사용 도메인 로직
 * 3. Preset (Composition): 필요한 Capability와 설정을 조합해 업종별 사업장 프로그램 구성
 *
 * 슬림 레지스트리 허브: 8개 카테고리 프리셋 모듈과 61개 원자적 번들을 통합 제공합니다.
 */

import type {
  BundledPresetCapabilityId,
  CapabilityModuleBundle,
  IndustryPresetDefinition,
  PresetCapabilityId,
} from '@/core/presets/types';
import { registerCapabilityBundles } from '@/core/presets/presetAssembler';
import { registerPresetResolver } from '@/core/presets/presetResolver';

// 61개 원자적 번들 재수출
export { CAPABILITY_BUNDLES } from './capabilityBundles';
import { CAPABILITY_BUNDLES } from './capabilityBundles';

// 7대 산업군 카테고리 프리셋 임포트
import { educationPresets } from './categories/educationPresets';
import { fitnessPresets } from './categories/fitnessPresets';
import { beautyPresets } from './categories/beautyPresets';
import { spacePresets } from './categories/spacePresets';
import { carePresets } from './categories/carePresets';
import { retailPresets } from './categories/retailPresets';
import { enterprisePresets } from './categories/enterprisePresets';

/**
 * 52개 전체 업종 프리셋 선언적 통합 레지스트리
 */
export const INDUSTRY_PRESETS: Record<string, IndustryPresetDefinition> = {
  ...educationPresets,
  ...fitnessPresets,
  ...beautyPresets,
  ...spacePresets,
  ...carePresets,
  ...retailPresets,
  ...enterprisePresets,
};

export const PRESET_ALIASES: Record<string, string> = {
  corporate_general_affairs: 'general_enterprise',
  general_affairs: 'general_enterprise',
  rnd_lab: 'rnd_lab_management',
  rnd: 'rnd_lab_management',
  gym: 'gym_fitness',
  academy: 'general_academy',
  private_tutoring: 'exam_tutoring',
  personal_training: 'pt_fitness',
  golf_lesson: 'indoor_golf',
  climbing_gym: 'climbing_activity',
  hotel_pension: 'guesthouse',
  craft_workshop: 'craft_repair',
  car_wash: 'self_carwash',
  sauna: 'sauna_jjimjilbang',
  sauna_jjimjbang: 'sauna_jjimjilbang',
  preschool: 'daycare',
  kindergarten: 'daycare',
  party_venue: 'first_birthday_party',
  first_birthday: 'first_birthday_party',
  first_birthday_venue: 'first_birthday_party',
};

export function getIndustryPreset(presetId: string): IndustryPresetDefinition | undefined {
  if (!presetId) return undefined;
  const direct = INDUSTRY_PRESETS[presetId];
  if (direct) return direct;
  const aliasedKey = PRESET_ALIASES[presetId];
  if (aliasedKey) return INDUSTRY_PRESETS[aliasedKey];
  return undefined;
}

// Core 계층에 리졸버 자동 주입 (Capability ➔ Core 단방향 의존성 보장)
registerPresetResolver(getIndustryPreset);

export function listIndustryPresets(): IndustryPresetDefinition[] {
  return Object.values(INDUSTRY_PRESETS);
}

/**
 * moa 앱(일반 매장·사업장 온보딩 및 카탈로그)에서 표시 및 선택 가능한 프리셋 목록 조회.
 * hiddenInMoa 플래그가 설정된 프리셋은 제외됩니다.
 */
export function listMoaVisiblePresets(): IndustryPresetDefinition[] {
  return Object.values(INDUSTRY_PRESETS).filter((p) => !p.hiddenInMoa);
}

/**
 * 특정 프리셋이 moa 앱에서 노출 및 선택 가능한지 여부 판정
 */
export function isPresetVisibleInMoa(presetId: string): boolean {
  const preset = getIndustryPreset(presetId);
  if (!preset) return false;
  return !preset.hiddenInMoa;
}

/**
 * 런타임에 동적으로 신규 Capability 번들을 등록하는 확장 함수.
 * 향후 신규 Capability 추가 시 presetRegistry 파일을 직접 대규모 수정하지 않고도 동적 주입 가능.
 */
export function registerCapabilityBundle(bundle: CapabilityModuleBundle): void {
  (CAPABILITY_BUNDLES as Record<string, CapabilityModuleBundle>)[bundle.capabilityId] = bundle;
}

/**
 * 런타임에 동적으로 신규 업종 프리셋 정의를 등록하는 확장 함수.
 */
export function registerIndustryPreset(preset: IndustryPresetDefinition): void {
  INDUSTRY_PRESETS[preset.id] = preset;
}


