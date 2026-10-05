import type { NavTab } from '@/shared/navigation/navigationTypes';
import type { ModuleTheme } from '@/shared/components/layout/moduleTheme';
import { isBlankIndustryInput, normalizeIndustryType, type IndustryType } from './types';
import { getIndustryPlugin, getInstalledIndustryPlugin } from './registry';
import type { IndustryAccent, IndustryAttendanceCopy } from './pluginTypes';

export type { IndustryAccent } from './pluginTypes';

export function resolveIndustry(
  industry: IndustryType | string | null | undefined
): IndustryType | null {
  return normalizeIndustryType(industry);
}

export function isPianoIndustry(industry: IndustryType | string | null | undefined): boolean {
  if (!industry) return false;
  return getIndustryPlugin(industry).id === 'piano';
}

export function isPilatesIndustry(industry: IndustryType | string | null | undefined): boolean {
  if (!industry) return false;
  return getIndustryPlugin(industry).id === 'pilates';
}

export function isSkinClinicIndustry(industry: IndustryType | string | null | undefined): boolean {
  if (!industry) return false;
  return getIndustryPlugin(industry).id === 'skin_clinic';
}

/** 조직 삭제 확인 문구의 기록 명사. supportsDeposit와 무관하다. */
export function getDangerZoneSessionLabel(
  industry: IndustryType | string | null | undefined
): string {
  return isSkinClinicIndustry(industry) ? '시술' : '수업';
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


/**
 * 출결 문구 훅. 없으면 호출부가 customerLabel·placeLabel·isAppointment로 만든다.
 * 빈 업종은 설치된 피아노 플러그인을 따른다.
 */
export function getAttendanceCopy(
  industry: IndustryType | string | null | undefined,
): IndustryAttendanceCopy | undefined {
  return getIndustryPlugin(industry).attendanceCopy;
}

/** 설정 화면의 교재 관리 바로가기 표시 여부 */
export function showsTextbooksLink(industry: IndustryType | string | null | undefined): boolean {
  if (!industry) return false;
  return Boolean(getIndustryPlugin(industry).showsTextbooksLink);
}

/**
 * PIN 체크인 성공 후 등록된 부가 동기화를 돌릴지.
 * 설치된 플러그인 id만 본다. 별칭(preschool 등)은 풀지 않아
 * 예전 키오스크의 piano/daycare 정확 비교와 같은 업종만 실행한다.
 */
export function runsPinCheckInSideEffects(
  industry: IndustryType | string | null | undefined
): boolean {
  if (!industry) return false;
  return Boolean(getInstalledIndustryPlugin(industry)?.runsPinCheckInSideEffects);
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

export interface RosterListPresentation {
  searchPlaceholder: string | null;
  filterButtonAriaLabel: string;
  showFilterFieldLabels: boolean;
  staffFilterLabel: string | null;
  controlMinHeight: 36 | 44;
  fitAdvancedFilterGrid: boolean;
  showSessionColumns: boolean;
  withdrawnLabel: string;
  filterEmptyUsesSearchHint: boolean;
}

const DEFAULT_ROSTER_LIST: RosterListPresentation = {
  searchPlaceholder: null,
  filterButtonAriaLabel: '추가 필터',
  showFilterFieldLabels: false,
  staffFilterLabel: null,
  controlMinHeight: 36,
  fitAdvancedFilterGrid: false,
  showSessionColumns: false,
  withdrawnLabel: '퇴원',
  filterEmptyUsesSearchHint: false,
};

/**
 * 공유 명단 차이. 빈 업종은 플러그인이 피아노로 떨어져도 피아노 목록을 켜지 않는다.
 * 지금 목록은 industry === 'piano' 일 때만 회차권 열을 보여 준다.
 */
export function getRosterListPresentation(
  industry: IndustryType | string | null | undefined,
): RosterListPresentation {
  if (isBlankIndustryInput(industry)) return DEFAULT_ROSTER_LIST;
  const raw = getIndustryPlugin(industry).rosterList;
  if (!raw) return DEFAULT_ROSTER_LIST;
  return {
    searchPlaceholder: raw.searchPlaceholder ?? null,
    filterButtonAriaLabel: raw.filterButtonAriaLabel ?? DEFAULT_ROSTER_LIST.filterButtonAriaLabel,
    showFilterFieldLabels: Boolean(raw.showFilterFieldLabels),
    staffFilterLabel: raw.staffFilterLabel ?? null,
    controlMinHeight: raw.controlMinHeight === 44 ? 44 : 36,
    fitAdvancedFilterGrid: Boolean(raw.fitAdvancedFilterGrid),
    showSessionColumns: Boolean(raw.showSessionColumns),
    withdrawnLabel: raw.withdrawnLabel ?? DEFAULT_ROSTER_LIST.withdrawnLabel,
    filterEmptyUsesSearchHint: Boolean(raw.filterEmptyUsesSearchHint),
  };
}

export function rosterSearchPlaceholder(
  presentation: RosterListPresentation,
  contactSingular: string,
): string {
  return presentation.searchPlaceholder ?? `이름 · ${contactSingular} · ${contactSingular} 전화`;
}

export function rosterFilterEmptyDescription(
  presentation: RosterListPresentation,
  customerSingular: string,
): string {
  const ended = presentation.withdrawnLabel;
  if (presentation.filterEmptyUsesSearchHint) {
    return `검색어나 필터를 바꿔보세요. ${ended} ${customerSingular}은 ‘${ended}’ 또는 ‘전체’에서 볼 수 있습니다.`;
  }
  return `${ended} 상태의 ${customerSingular}은 ‘${ended}’ 또는 ‘전체’ 필터에서 볼 수 있습니다.`;
}

