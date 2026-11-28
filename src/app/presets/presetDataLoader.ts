/**
 * Phase 2: 프리셋·퀘스트·시드 팩 JSON 로더.
 * TS 카테고리 프리셋과 병합하며, 동일 id는 JSON이 덮어쓴다.
 */

import type { IndustryPresetDefinition } from '@/core/presets/types';
import verticalQuestsJson from './data/verticalQuests.json';
import seedPacksJson from './data/seedPacks.json';
import craftWorkshopPreset from './data/presets/craft_workshop.json';

export type QuestTemplateItem = {
  id: string;
  title: string;
  description: string;
  targetTab: string;
  icon: string;
  actionText: string;
  helpTip?: string;
};

export type AllocationPolicyStub = {
  overbook_mode?: 'forbid' | 'warn' | 'allow';
  negative_stock_mode?: 'forbid' | 'warn' | 'allow';
  hold_ttl_seconds?: number;
};

export type TaxPolicyStub = {
  mode?: 'inclusive' | 'exclusive';
  rate?: number;
};

/** 온보딩 시 주입하는 시드 확장(필드/분류/정책 스텁) */
export type PresetSeedPack = {
  defaultCategories?: string[];
  allocationPolicyStub?: AllocationPolicyStub;
  taxPolicyStub?: TaxPolicyStub;
};

const JSON_PRESET_SOURCES: IndustryPresetDefinition[] = [
  craftWorkshopPreset as IndustryPresetDefinition,
];

/**
 * JSON으로 선언된 업종 프리셋 (빌드 시 정적 import).
 * 중기: platform.industry_presets 테이블로 이전.
 */
export function loadJsonPresetDefinitions(): Record<string, IndustryPresetDefinition> {
  const out: Record<string, IndustryPresetDefinition> = {};
  for (const preset of JSON_PRESET_SOURCES) {
    if (!preset?.id) continue;
    out[preset.id] = preset;
  }
  return out;
}

export function listJsonPresetIds(): string[] {
  return Object.keys(loadJsonPresetDefinitions());
}

/** TS 레지스트리에 JSON 프리셋을 병합 (JSON 우선) */
export function mergeJsonPresetsInto(
  target: Record<string, IndustryPresetDefinition>
): void {
  const jsonPresets = loadJsonPresetDefinitions();
  for (const [id, preset] of Object.entries(jsonPresets)) {
    target[id] = preset;
  }
}

export function getVerticalQuestTemplates(): Record<string, QuestTemplateItem[]> {
  return verticalQuestsJson as Record<string, QuestTemplateItem[]>;
}

export function getSeedPack(industry: string | null | undefined): PresetSeedPack | undefined {
  if (!industry) return undefined;
  const key = industry.trim().toLowerCase();
  const packs = seedPacksJson as Record<string, PresetSeedPack>;
  return packs[key];
}

export function listSeedPackIndustryKeys(): string[] {
  return Object.keys(seedPacksJson as Record<string, PresetSeedPack>);
}

/**
 * org settings에 시드 팩 정책 스텁을 병합 (Phase 3 테이블 이전 전 임시 SSOT).
 * 이미 값이 있으면 덮어쓰지 않음 (멱등).
 */
export function mergeSeedPackIntoSettings(
  settings: Record<string, unknown>,
  industry: string | null | undefined
): Record<string, unknown> {
  const pack = getSeedPack(industry);
  if (!pack) return settings;

  const next = { ...settings };
  if (pack.allocationPolicyStub && next.allocation_policy == null) {
    next.allocation_policy = { ...pack.allocationPolicyStub };
  }
  if (pack.taxPolicyStub && next.tax_policy == null) {
    next.tax_policy = { ...pack.taxPolicyStub };
  }
  if (
    pack.defaultCategories &&
    pack.defaultCategories.length > 0 &&
    next.default_product_categories == null
  ) {
    next.default_product_categories = [...pack.defaultCategories];
  }
  return next;
}
