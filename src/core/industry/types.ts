import {
  INDUSTRY_ALIASES,
  INDUSTRY_DEFINITIONS,
  INDUSTRY_IDS,
  MODULE_INDUSTRY_IDS,
  getIndustryDefinition,
  isIndustryType,
  listIndustryDefinitions,
  hasIndustryModule,
  shouldUseGenericShell,
  filterIndustryNavTabs,
  type IndustryType,
} from './catalog';
import { INDUSTRY_CATEGORY_OPTIONS, type IndustryCategory } from './categories';

export type { IndustryType, ModuleIndustryId, IndustryDefinition, IndustryCatalogMetadata } from './catalog';
export {
  INDUSTRY_IDS,
  INDUSTRY_DEFINITIONS,
  INDUSTRY_ALIASES,
  MODULE_INDUSTRY_IDS,
  PUBLIC_SELECTABLE_INDUSTRY_IDS,
  getIndustryDefinition,
  isIndustryType,
  isModuleIndustryId,
  listIndustryDefinitions,
  listIndustriesByCategory,
  hasIndustryModule,
  shouldUseGenericShell,
  filterIndustryNavTabs,
  defineIndustry,
} from './catalog';
export type { IndustryCategory, IndustryCategoryOption } from './categories';
export {
  INDUSTRY_CATEGORY_OPTIONS,
  getIndustryCategoryLabel,
} from './categories';

export interface IndustryOption {
  value: IndustryType;
  label: string;
  description: string;
}

/** UI 선택용 — 카탈로그 정의와 동기화 */
export const INDUSTRY_OPTIONS: IndustryOption[] = listIndustryDefinitions({
  selectableOnly: true,
}).map((d) => ({
  value: d.id,
  label: d.label,
  description: d.description,
}));

/** 신규 생성 시 사용자가 업종을 고르지 않았을 때만. DB 값을 덮어쓰지 않는다. */
export const DEFAULT_CREATE_INDUSTRY_TYPE: IndustryType = 'piano';

export function isBlankIndustryInput(value?: string | null): boolean {
  return value == null || String(value).trim() === '';
}

/**
 * 카탈로그 id 또는 alias만 인정. 공백·unknown은 null.
 * 결과를 industry_type으로 저장하지 않는다.
 */
export function parseIndustryType(value?: string | null): IndustryType | null {
  if (isBlankIndustryInput(value)) return null;
  const trimmed = String(value).trim();
  const aliased = INDUSTRY_ALIASES[trimmed] ?? trimmed;
  return isIndustryType(aliased) ? aliased : null;
}

/**
 * 런타임 해석. 저장·영속화에 쓰지 않는다.
 * - 카탈로그 id / alias → 해당 Type
 * - null·빈 문자열 → piano (레거시 미설정)
 * - 카탈로그에 없는 비어 있지 않은 값 → null (piano로 위장하지 않음)
 */
export function normalizeIndustryType(value?: string | null): IndustryType | null {
  const parsed = parseIndustryType(value);
  if (parsed) return parsed;
  return isBlankIndustryInput(value) ? DEFAULT_CREATE_INDUSTRY_TYPE : null;
}

export function getIndustryLabel(value?: string | null): string {
  const def = getIndustryDefinition(value);
  if (def) return def.label;
  const parsed = parseIndustryType(value);
  if (parsed) return INDUSTRY_DEFINITIONS[parsed].label;
  if (isBlankIndustryInput(value)) return INDUSTRY_DEFINITIONS.piano.label;
  return '학원';
}

export function getIndustryCategoryForType(value?: string | null): IndustryCategory {
  return getIndustryDefinition(value)?.category ?? 'education';
}

export function isIndustryCategory(value?: string | null): value is IndustryCategory {
  return Boolean(value && INDUSTRY_CATEGORY_OPTIONS.some((item) => item.id === value));
}

/**
 * 생성 시 저장할 대분류.
 * 업종 ID(piano 등)를 industryCategory에 넣지 않는다.
 * 명시값이 대분류 id면 그대로, 업종 ID/alias면 대분류로 변환, 그 외 자유텍스트는 호환 유지.
 */
export function resolveIndustryCategoryForCreate(
  industryType?: string | null,
  explicitCategory?: string | null
): string {
  const trimmed = explicitCategory?.trim();
  if (trimmed) {
    if (isIndustryCategory(trimmed)) return trimmed;
    if (getIndustryDefinition(trimmed)) return getIndustryCategoryForType(trimmed);
    return trimmed;
  }
  return getIndustryCategoryForType(industryType);
}

/** 카탈로그 id ↔ definition·moduleId·alias 일치 검증 (테스트용, fs 없음) */
export function assertCatalogIntegrity(): void {
  for (const id of INDUSTRY_IDS) {
    const d = INDUSTRY_DEFINITIONS[id];
    if (!d || d.id !== id) {
      throw new Error(`catalog ↔ definition id 불일치: INDUSTRY_IDS "${id}" / definition.id "${d?.id}"`);
    }
    if (d.moduleId && d.moduleId !== id) {
      throw new Error(`catalog moduleId ↔ industry type 불일치: "${id}" moduleId="${d.moduleId}"`);
    }
    if (hasIndustryModule(id) !== Boolean(d.moduleId)) {
      throw new Error(`catalog ↔ module presence 불일치: "${id}" hasIndustryModule=${hasIndustryModule(id)}`);
    }
  }
  const fromDefs = INDUSTRY_IDS.filter((id) => INDUSTRY_DEFINITIONS[id].moduleId);
  for (const id of fromDefs) {
    if (!MODULE_INDUSTRY_IDS.includes(id as (typeof MODULE_INDUSTRY_IDS)[number])) {
      throw new Error(`catalog에는 moduleId가 있는데 MODULE_INDUSTRY_IDS에 없음: ${id}`);
    }
  }
  for (const id of MODULE_INDUSTRY_IDS) {
    if (!fromDefs.includes(id)) {
      throw new Error(`MODULE_INDUSTRY_IDS에는 있는데 catalog.moduleId가 없음: ${id}`);
    }
  }
  for (const [alias, target] of Object.entries(INDUSTRY_ALIASES)) {
    if (!isIndustryType(target)) {
      throw new Error(`alias ↔ canonical 불일치: "${alias}" → "${target}" (catalog에 없음)`);
    }
    if (isIndustryType(alias)) {
      throw new Error(`alias 키가 catalog id와 충돌: "${alias}"`);
    }
  }
  if (!shouldUseGenericShell('not_a_real_type')) {
    throw new Error('unknown industry must use generic shell');
  }
}
