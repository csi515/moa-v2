import { getIndustryDefinition } from '@/core/industry/catalog';
import { isSkinClinicIndustry } from '@/core/industry/industryUi';
import { normalizeIndustryType, type IndustryType } from '@/core/industry/types';

const ACADEMY_GUARDIAN_LABEL = '학부모';
const NON_ACADEMY_GUARDIAN_LABEL = '보호자';

/**
 * 플러그인 매니페스트에 guardian/parent/contact 라벨은 없다.
 * (customerLabel·placeLabel·feeLabel만 있음) 그래서 필드를 추가하지 않고
 * 모듈 contact.singular 중 이미 쓰는 호칭만 재사용한다.
 */
const REUSED_CONTACT_LABELS = new Set(['보호자', '회원 보호자', '고객']);

/**
 * 보호자 연결 안내의 호칭.
 * 피부관리는 모듈 contact 라벨을 그대로 둔다.
 * 피아노·어린이집·교육(학원) 카테고리는 학부모.
 * 그 외는 contact가 보호자/회원 보호자/고객이면 그 말을 쓰고, 아니면 보호자.
 */
export function guardianLinkContactLabel(
  industry: IndustryType | string | null | undefined,
  contactSingular: string,
): string {
  if (isSkinClinicIndustry(industry)) return contactSingular;

  const type = normalizeIndustryType(industry);
  if (type === 'piano' || type === 'daycare') return ACADEMY_GUARDIAN_LABEL;

  const category = type ? getIndustryDefinition(type)?.category : undefined;
  if (category === 'education') return ACADEMY_GUARDIAN_LABEL;

  if (REUSED_CONTACT_LABELS.has(contactSingular)) return contactSingular;
  return NON_ACADEMY_GUARDIAN_LABEL;
}
