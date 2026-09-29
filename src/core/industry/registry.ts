import { INDUSTRY_OPTIONS, hasIndustryModule, type IndustryOption, type IndustryType } from './types';

export {
  getIndustryPlugin,
  listIndustryIds,
  listIndustryPlugins,
  installIndustryPlugin,
  installIndustryPlugins,
  getInstalledIndustryPlugin,
  listInstalledIndustryPluginIds,
} from './pluginHost';

/** 가입·생성 UI용 — INDUSTRY_OPTIONS와 동일 출처 */
export function listIndustryOptions(): IndustryOption[] {
  return INDUSTRY_OPTIONS;
}

/** 카탈로그 moduleId 기준 (alias 포함) */
export function hasModulePlugin(industry: IndustryType | string | null | undefined): boolean {
  return hasIndustryModule(industry);
}
