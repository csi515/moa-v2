/** Industry 공개 API — 앱/모듈은 가능하면 이 barrel을 사용 */
export type {
  IndustryType,
  ModuleIndustryId,
  IndustryDefinition,
  IndustryCatalogMetadata,
  IndustryCategory,
  IndustryCategoryOption,
  IndustryOption,
} from './types';

export {
  INDUSTRY_IDS,
  INDUSTRY_DEFINITIONS,
  INDUSTRY_ALIASES,
  INDUSTRY_OPTIONS,
  INDUSTRY_CATEGORY_OPTIONS,
  MODULE_INDUSTRY_IDS,
  PUBLIC_SELECTABLE_INDUSTRY_IDS,
  normalizeIndustryType,
  parseIndustryType,
  isBlankIndustryInput,
  DEFAULT_CREATE_INDUSTRY_TYPE,
  getIndustryLabel,
  getIndustryCategoryLabel,
  getIndustryCategoryForType,
  isIndustryCategory,
  resolveIndustryCategoryForCreate,
  getIndustryDefinition,
  isIndustryType,
  isModuleIndustryId,
  listIndustryDefinitions,
  listIndustriesByCategory,
  hasIndustryModule,
  shouldUseGenericShell,
  filterIndustryNavTabs,
  assertCatalogIntegrity,
} from './types';

export {
  getIndustryPlugin,
  listIndustryOptions,
  listIndustryIds,
  listIndustryPlugins,
  hasModulePlugin,
} from './registry';

export { IndustryPicker } from './IndustryPicker';
export { resolveIndustryAppKind } from './industryAppResolve';
export { defineIndustry } from './definitions';
export {
  IndustryAdapter,
  DefaultFallbackPluginAdapter,
  StandardIndustryPluginAdapter,
  getIndustryPluginAdapter,
  type IndustryPluginAdapter,
  type IndustryFeatureKey,
  type IndustryLabelKey,
} from './IndustryAdapter';
