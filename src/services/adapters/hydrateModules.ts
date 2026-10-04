import { getIndustryPlugin } from '@/core/industry/pluginHost';

/**
 * hydrate 모듈 플래그 (테스트·호환용).
 * 업종 id를 비교하지 않는다. 설치된 plugin.syncCapabilities 선언만 본다.
 * 실제 Adapter hydrate는 같은 선언에 등록된 sync(register*Sync)를 실행한다.
 */
export function resolveHydrateModules(industryType?: string | null): {
  piano: boolean;
  education: boolean;
  daycare: boolean;
} {
  const declared = getIndustryPlugin(industryType).syncCapabilities ?? [];
  return {
    piano: declared.includes('piano'),
    education: declared.includes('education'),
    daycare: declared.includes('daycare'),
  };
}
