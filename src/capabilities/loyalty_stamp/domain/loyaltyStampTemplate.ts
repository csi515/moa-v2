import { getInstalledIndustryPluginFlag } from '@/core/industry/industryUi';

import type { LoyaltyStampTemplateId } from '@/core/industry/industryUi';

export type LoyaltyStampTemplateType = LoyaltyStampTemplateId;

/**
 * 조직 업종(raw industry_type)에 맞는 기본 스탬프 템플릿.
 * 별칭을 정규화하지 않고, 설치된 업종 플러그인 id와 정확히 같을 때만 플러그인 값을 쓴다.
 */
export function resolveLoyaltyStampTemplate(industryType: string | null | undefined): LoyaltyStampTemplateType {
  return getInstalledIndustryPluginFlag(industryType, 'loyaltyStampTemplate') as LoyaltyStampTemplateType;
}
