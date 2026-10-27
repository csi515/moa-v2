import type { IndustryType } from '@/core/industry/types';
import { getFeeLabel, showsTextbooksLink } from '@/core/industry/industryUi';

/**
 * 수강 형태.
 * 피아노 feeLabel은 수강료라 `{feeLabel} 형태`면 `수강료 형태`가 된다.
 * 수강료에서 료만 빼면 필라테스도 수강 형태가 되므로,
 * 교재 링크 플래그가 켜진 업종만 기존 문구를 유지한다. 지금은 피아노만 true다.
 * 그 외는 feeLabel 그대로 붙인다 (피부·리테일 이용료 → 이용료 형태).
 */
export function enrollmentModeLabel(
  industry: IndustryType | string | null | undefined,
): string {
  if (showsTextbooksLink(industry)) return '수강 형태';
  return `${getFeeLabel(industry)} 형태`;
}

/**
 * 성인 본인 수강 안내.
 * 교재 링크 플래그가 켜진 업종은 기존 문장. 다른 업종은 수강 대신 이용하는 경우.
 */
export function selfAccountEnrollmentNote(
  industry: IndustryType | string | null | undefined,
  contactLabel: string,
): string {
  if (showsTextbooksLink(industry)) {
    return `본인 계정으로 수강하는 경우 ${contactLabel} 정보를 생략합니다.`;
  }
  return `본인 계정으로 이용하는 경우 ${contactLabel} 정보를 생략합니다.`;
}
