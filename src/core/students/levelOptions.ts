import type { IndustryType } from '@/core/industry/types';
import { normalizeIndustryType } from '@/core/industry/types';
import { getIndustryPlugin } from '@/core/industry/registry';

/** 업종별 회원/원생 레벨 선택지. 값 집합은 Industry plugin.levelOptions */
export function getStudentLevelOptions(
  industry: IndustryType | string | null | undefined
): string[] {
  const type = normalizeIndustryType(industry);
  if (!type) return [];
  return [...(getIndustryPlugin(type).levelOptions ?? [])];
}

/** 업종별 레벨 필드 라벨 */
export function getStudentLevelLabel(
  industry: IndustryType | string | null | undefined
): string {
  return getIndustryPlugin(industry).levelLabel;
}

/** 학교/학년 필드 표시 여부 */
export function showSchoolFields(industry: IndustryType | string | null | undefined): boolean {
  return getIndustryPlugin(industry).showSchoolFields;
}
