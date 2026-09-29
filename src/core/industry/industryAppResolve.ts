import { hasIndustryModule, parseIndustryType, isBlankIndustryInput } from './types';

export type IndustryAppKind = 'module' | 'generic';

/**
 * 셸 선택. org 선택은 하지 않는다.
 * 미설정 → piano 모듈. unknown·모듈 없는 카탈로그 → Generic.
 */
export function resolveIndustryAppKind(
  industryType?: string | null
): IndustryAppKind {
  const parsed = parseIndustryType(industryType);
  if (!parsed) {
    return isBlankIndustryInput(industryType) ? 'module' : 'generic';
  }
  return hasIndustryModule(parsed) ? 'module' : 'generic';
}
