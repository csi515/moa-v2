import { normalizeIndustryType } from '@/core/industry/types';

/**
 * hydrate 모듈 플래그 (테스트·호환용).
 * 실제 Adapter hydrate는 plugin.syncCapabilities + industrySyncRegistry를 따른다.
 */
export function resolveHydrateModules(industryType?: string | null): {
  piano: boolean;
  education: boolean;
  daycare: boolean;
} {
  const industry = normalizeIndustryType(industryType);
  const piano = industry === 'piano';
  return {
    piano,
    education: piano,
    daycare: industry === 'daycare',
  };
}
