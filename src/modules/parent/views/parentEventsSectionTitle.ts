import { getPlaceLabel } from '@/core/industry/industryUi';
import { normalizeIndustryType, type IndustryType } from '@/core/industry/types';

/**
 * 보호자 행사 섹션 제목.
 * 체육관·어린이집은 장소명 + 「일정」이 아닌 기존 고정 문구를 유지한다.
 * 그 외(피아노 포함)는 getPlaceLabel + 「일정·행사」.
 * 피아노 placeLabel이 학원이면 「학원 일정·행사」.
 */
export function parentEventsSectionTitle(
  industryType: IndustryType | string | null | undefined,
): string {
  const industry = normalizeIndustryType(industryType);
  if (industry === 'gym') return '체육관 일정';
  if (industry === 'daycare') return '원 일정';
  return `${getPlaceLabel(industry)} 일정·행사`;
}
