import type { NavTab } from '@/shared/navigation/navigationTypes';
import type { ModuleTheme } from '@/shared/components/layout/moduleTheme';
import { normalizeIndustryType, type IndustryType } from './types';
import { getIndustryPlugin } from './registry';
import type { IndustryAccent } from './pluginTypes';

export type { IndustryAccent } from './pluginTypes';

export function resolveIndustry(
  industry: IndustryType | string | null | undefined
): IndustryType | null {
  return normalizeIndustryType(industry);
}

export function isPilatesIndustry(industry: IndustryType | string | null | undefined): boolean {
  return resolveIndustry(industry) === 'pilates';
}

export function isSkinClinicIndustry(industry: IndustryType | string | null | undefined): boolean {
  return resolveIndustry(industry) === 'skin_clinic';
}

/** 예약·서비스·이용권 중심 (필라테스·피부관리) */
export function isAppointmentIndustry(industry: IndustryType | string | null | undefined): boolean {
  const type = resolveIndustry(industry);
  return type === 'pilates' || type === 'skin_clinic';
}

export function isGymIndustry(industry: IndustryType | string | null | undefined): boolean {
  return resolveIndustry(industry) === 'gym';
}

export function isDaycareIndustry(industry: IndustryType | string | null | undefined): boolean {
  return resolveIndustry(industry) === 'daycare';
}

/** 회원이 보는 장소 명칭. 피아노 전용 메뉴는 호출하지 않는다. */
export function getPlaceLabel(industry: IndustryType | string | null | undefined): string {
  const type = resolveIndustry(industry);
  if (type === 'skin_clinic') return '샵';
  if (type === 'pilates') return '스튜디오';
  if (type === 'gym') return '체육관';
  if (type === 'daycare') return '원';
  return '학원';
}

/** 사업주(owner) 호칭. 교육·돌봄은 원장, 그 외는 대표. */
export function getOwnerLabel(industry: IndustryType | string | null | undefined): string {
  const type = resolveIndustry(industry);
  if (type === 'daycare' || type === 'piano' || type === 'academy') return '원장';
  return '대표';
}

/** 사업장 이름 입력 예시 (생성·가입 폼용) */
export function getPlaceNamePlaceholder(industry: IndustryType | string | null | undefined): string {
  const type = resolveIndustry(industry);
  if (type === 'skin_clinic') return '예: 하루 피부관리';
  if (type === 'pilates') return '예: 밸런스 필라테스';
  if (type === 'gym') return '예: 강남 체육관';
  if (type === 'daycare') return '예: 햇살 어린이집';
  if (type === 'piano') return '예: 행복 피아노 학원';
  return '예: 행복 학원';
}

/** 보호자 화면용 고객 명칭. 앱 안에서는 useModuleLabels를 우선한다. */
export function getCustomerLabel(industry: IndustryType | string | null | undefined): string {
  const type = resolveIndustry(industry);
  if (type === 'skin_clinic') return '고객';
  if (type === 'pilates' || type === 'gym') return '회원';
  if (type === 'daycare') return '원아';
  return '원생';
}

/** 클래스(반) 기반 수업 — 플러그인 매니페스트 기준 */
export function usesClassBasedSchedule(industry: IndustryType | string | null | undefined): boolean {
  return getIndustryPlugin(industry).usesClassBasedSchedule;
}

/** 원생/회원 목록 탭 */
export function getCustomerListTab(industry: IndustryType | string | null | undefined): NavTab {
  return getIndustryPlugin(industry).customerListTab;
}

export function getModuleTheme(industry: IndustryType | string | null | undefined): ModuleTheme {
  return getIndustryPlugin(industry).theme;
}

export function getIndustryAccent(industry: IndustryType | string | null | undefined): IndustryAccent {
  return getIndustryPlugin(industry).accent;
}
