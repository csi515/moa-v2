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
  if (!industry) return '사업장';
  return getIndustryPlugin(industry).placeLabel ?? '사업장';
}

/** 사업주(owner) 호칭. 교육·돌봄은 원장, 그 외는 대표. */
export function getOwnerLabel(industry: IndustryType | string | null | undefined): string {
  if (!industry) return '대표';
  return getIndustryPlugin(industry).ownerLabel ?? '대표';
}

/** 사업장 이름 입력 예시 (생성·가입 폼용) */
export function getPlaceNamePlaceholder(industry: IndustryType | string | null | undefined): string {
  if (!industry) return '예: 행복 사업장';
  return getIndustryPlugin(industry).placeNamePlaceholder ?? '예: 행복 사업장';
}

/** 보호자 화면용 고객 명칭. 앱 안에서는 useModuleLabels를 우선한다. */
export function getCustomerLabel(industry: IndustryType | string | null | undefined): string {
  if (!industry) return '고객';
  return getIndustryPlugin(industry).customerLabel ?? '고객';
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

/** 비용 명칭 (수강료·이용료·보육료 등) */
export function getFeeLabel(industry: IndustryType | string | null | undefined): string {
  if (!industry) return '이용료';
  return getIndustryPlugin(industry).feeLabel ?? '이용료';
}

/** 수납 계좌 입력 placeholder */
export function getBankAccountPlaceholder(industry: IndustryType | string | null | undefined): string {
  if (!industry) return '예: 국민은행 000000-00-000000 (예금주: 홍길동)';
  return getIndustryPlugin(industry).bankAccountPlaceholder ?? '예: 국민은행 000000-00-000000 (예금주: 홍길동)';
}

/** 예약금 UI 표시 여부 */
export function supportsDeposit(industry: IndustryType | string | null | undefined): boolean {
  if (!industry) return false;
  return Boolean(getIndustryPlugin(industry).supportsDeposit);
}

/** 설정 화면의 교재 관리 바로가기 표시 여부 */
export function showsTextbooksLink(industry: IndustryType | string | null | undefined): boolean {
  if (!industry) return false;
  return Boolean(getIndustryPlugin(industry).showsTextbooksLink);
}

/** 실(강의실·관리실 등) UI 설정 */
export function getRoomConfig(industry: IndustryType | string | null | undefined) {
  return getIndustryPlugin(industry).roomConfig ?? {
    sectionTitle: '공간',
    sectionDescription: '사업장에서 쓰는 공간 이름을 등록해 주세요.',
    defaultPrefix: '공간',
    defaultKind: 'classroom' as const,
    placeholder: '예: 1실',
    allowedKinds: ['classroom', 'practice'] as const,
  };
}
