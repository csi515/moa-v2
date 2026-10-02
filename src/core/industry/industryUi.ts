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
  if (!industry) return false;
  return getIndustryPlugin(industry).id === 'pilates';
}

export function isSkinClinicIndustry(industry: IndustryType | string | null | undefined): boolean {
  if (!industry) return false;
  return getIndustryPlugin(industry).id === 'skin_clinic';
}

/** 예약·서비스·이용권 중심 (필라테스·피부관리) */
export function isAppointmentIndustry(industry: IndustryType | string | null | undefined): boolean {
  if (!industry) return false;
  return Boolean(getIndustryPlugin(industry).isAppointment);
}

export function isGymIndustry(industry: IndustryType | string | null | undefined): boolean {
  if (!industry) return false;
  return getIndustryPlugin(industry).id === 'gym';
}

export function isDaycareIndustry(industry: IndustryType | string | null | undefined): boolean {
  if (!industry) return false;
  return getIndustryPlugin(industry).id === 'daycare';
}

/** 회원이 보는 장소 명칭. 피아노 전용 메뉴는 호출하지 않는다. */
export function getPlaceLabel(industry: IndustryType | string | null | undefined): string {
  if (!industry) return '학원';
  return getIndustryPlugin(industry).placeLabel ?? '학원';
}

/** 사업주(owner) 호칭. 교육·돌봄은 원장, 그 외는 대표. */
export function getOwnerLabel(industry: IndustryType | string | null | undefined): string {
  if (!industry) return '대표';
  return getIndustryPlugin(industry).ownerLabel ?? '대표';
}

/** 사업장 이름 입력 예시 (생성·가입 폼용) */
export function getPlaceNamePlaceholder(industry: IndustryType | string | null | undefined): string {
  if (!industry) return '예: 행복 학원';
  return getIndustryPlugin(industry).placeNamePlaceholder ?? '예: 행복 학원';
}

/** 보호자 화면용 고객 명칭. 앱 안에서는 useModuleLabels를 우선한다. */
export function getCustomerLabel(industry: IndustryType | string | null | undefined): string {
  if (!industry) return '원생';
  return getIndustryPlugin(industry).customerLabel ?? '원생';
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
