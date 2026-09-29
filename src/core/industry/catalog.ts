import type { IndustryCategory } from './categories';
import {
  INDUSTRY_ALIASES,
  INDUSTRY_DEFINITIONS,
  INDUSTRY_IDS,
  MODULE_INDUSTRY_IDS,
  PUBLIC_SELECTABLE_INDUSTRY_IDS,
  type IndustryCatalogMetadata,
  type IndustryDefinition,
  type IndustryType,
  type ModuleIndustryId,
} from './definitions';
import { applyInstalledCapabilityNavFilter } from './capabilityNavHost';

export type { IndustryType, ModuleIndustryId, IndustryDefinition, IndustryCatalogMetadata };
export {
  INDUSTRY_IDS,
  INDUSTRY_DEFINITIONS,
  INDUSTRY_ALIASES,
  MODULE_INDUSTRY_IDS,
  PUBLIC_SELECTABLE_INDUSTRY_IDS,
  defineIndustry,
} from './definitions';

const ID_SET = new Set<string>(INDUSTRY_IDS);
const MODULE_ID_SET = new Set<string>(MODULE_INDUSTRY_IDS);

export function isIndustryType(value: string | null | undefined): value is IndustryType {
  return typeof value === 'string' && ID_SET.has(value);
}

export function isModuleIndustryId(value: string | null | undefined): value is ModuleIndustryId {
  return typeof value === 'string' && MODULE_ID_SET.has(value);
}

export function getIndustryDefinition(
  id: IndustryType | string | null | undefined
): IndustryDefinition | undefined {
  if (!id) return undefined;
  const resolved = INDUSTRY_ALIASES[id] ?? id;
  if (!isIndustryType(resolved)) return undefined;
  return INDUSTRY_DEFINITIONS[resolved];
}

export function listIndustryDefinitions(options?: {
  selectableOnly?: boolean;
  category?: IndustryCategory;
}): IndustryDefinition[] {
  let list = INDUSTRY_IDS.map((id) => INDUSTRY_DEFINITIONS[id]);
  if (options?.selectableOnly) {
    list = list.filter((d) => d.selectable === true);
  }
  if (options?.category) {
    list = list.filter((d) => d.category === options.category);
  }
  return list;
}

export function listIndustriesByCategory(category: IndustryCategory): IndustryDefinition[] {
  return listIndustryDefinitions({ selectableOnly: true, category });
}

/** 카탈로그 기준 — 전용 Module이 연결된 업종인지 */
export function hasIndustryModule(id: IndustryType | string | null | undefined): boolean {
  return Boolean(getIndustryDefinition(id)?.moduleId);
}

/** 모듈 없는 카탈로그 업종 + 카탈로그에 없는 값 → Generic 셸. 미설정(빈 값)은 piano 모듈. */
export function shouldUseGenericShell(industryType?: string | null): boolean {
  if (industryType == null || String(industryType).trim() === '') return false;
  const def = getIndustryDefinition(industryType);
  if (!def) return true;
  return !def.moduleId;
}

export function filterIndustryNavTabs<T extends string>(
  tabs: readonly T[],
  industry: IndustryType | string | null | undefined
): T[] {
  return applyInstalledCapabilityNavFilter(tabs, industry);
}
