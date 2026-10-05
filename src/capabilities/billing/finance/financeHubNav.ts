import { isBlankIndustryInput } from '@/core/industry/types';
import { getIndustryPlugin } from '@/core/industry/pluginHost';
import type {
  FinanceHubAreaId,
  FinanceHubSegmentId,
  IndustryFinanceHubNav,
} from '@/core/industry/pluginTypes';

/** 플러그인 financeHubNav가 없을 때의 한 줄 허브 */
export const DEFAULT_FINANCE_HUB_NAV: IndustryFinanceHubNav = {
  title: '재무',
  financeTabSegment: 'overview',
  areas: [],
  showLinkedBillingIncome: false,
};

/**
 * 재무 허브 제목·탭. 빈 값은 피아노로 넘기지 않는다.
 * 업종 id 비교는 하지 않고, 설치된 플러그인 설정만 읽는다.
 */
export function resolveFinanceHubNav(
  industry: string | null | undefined
): IndustryFinanceHubNav {
  if (isBlankIndustryInput(industry)) return DEFAULT_FINANCE_HUB_NAV;
  return getIndustryPlugin(industry).financeHubNav ?? DEFAULT_FINANCE_HUB_NAV;
}

/** 분할 허브에서 세그먼트가 속한 영역. 요약·수납·미납은 수납 영역. */
export function areaIdForFinanceSegment(segment: FinanceHubSegmentId): FinanceHubAreaId {
  if (segment === 'income' || segment === 'expenses' || segment === 'payroll') return 'books';
  return 'billing';
}

export function financeSegmentDescription(
  nav: IndustryFinanceHubNav,
  segment: FinanceHubSegmentId
): string {
  for (const area of nav.areas) {
    const found = area.segments.find((item) => item.value === segment);
    if (found) return found.description;
  }
  return '';
}
