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

/**
 * 공개 랜딩에서 성인 가입을 학부모 연결보다 앞에 둘지.
 * 업종 id 비교 대신 플러그인 플래그만 본다.
 * 빈 값은 레거시 미설정(piano)으로 풀기 전에 false.
 */
export function publicLandingAdultFirst(
  industry: IndustryType | string | null | undefined
): boolean {
  if (isBlankIndustryInput(industry)) return false;
  return Boolean(getIndustryPlugin(industry).publicLandingAdultFirst);
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

export type AttendanceSummaryMetricVariant = 'rose' | 'teal' | 'amber' | 'indigo';

/**
 * 출결 현황 요약 카드 색.
 * 설치된 플러그인 id의 attendanceSummaryMetric만 본다.
 * 별칭(taekwondo 등)은 예전 industry === 'gym' 정확 비교와 같이 기본 indigo다.
 * 값이 없으면 indigo (어린이집·피아노·소매·사우나·generic).
 */
export function getAttendanceSummaryMetric(
  industry: IndustryType | string | null | undefined
): AttendanceSummaryMetricVariant {
  if (typeof industry !== 'string' || industry.length === 0) return 'indigo';
  const metric = getInstalledIndustryPlugin(industry)?.attendanceSummaryMetric;
  if (metric === 'rose' || metric === 'teal' || metric === 'amber') return metric;
  return 'indigo';
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

/**
 * 고객 출결 화면의 보강 목록 표시 여부.
 * 업종 id 비교 대신 플러그인 플래그만 본다. 지금은 피아노만 true.
 */
export function showsMakeupList(industry: IndustryType | string | null | undefined): boolean {
  if (!industry) return false;
  return Boolean(getIndustryPlugin(industry).showsMakeupList);
}

/**
 * 고객 포털 연습실 탭.
 * 업종 id 비교 대신 플러그인 플래그만 본다. 지금은 피아노만 true.
 * 빈 값은 레거시 미설정으로 피아노 플러그인을 쓴다(탭이 오늘 보이던 곳).
 * 비어 있지 않은 미등록 업종은 generic이라 탭이 생기지 않는다.
 */
export function showsPracticeRoomTab(
  industry: IndustryType | string | null | undefined
): boolean {
  return Boolean(getIndustryPlugin(industry).showsPracticeRoomTab);
}

/**
 * 고객 포털 포인트 조회 여부.
 * 업종 id 비교 대신 플러그인 플래그만 본다. 지금은 소매만 true.
 * 빈 값은 getIndustryPlugin과 같이 piano로 해석되고, piano는 false다.
 * 카탈로그에 없는 값은 generic이며 false다. retail로 풀리는 별칭은 없다.
 */
export function showsCustomerPoints(
  industry: IndustryType | string | null | undefined
): boolean {
  return Boolean(getIndustryPlugin(industry).showsCustomerPoints);
}

/**
 * 성인 수강생 이용 안내의 연습실 섹션.
 * 업종 id 비교 대신 플러그인 플래그만 본다. 지금은 피아노만 true.
 * 빈·null·undefined·공백만 있는 값은 숨긴다(오늘 featureGuides 조건과 같음).
 * showsPracticeRoomTab을 재사용하지 않는다 — 그 탭은 빈 업종에서 피아노로 떨어져 보인다.
 */
export function showsAdultPracticeGuide(
  industry: IndustryType | string | null | undefined
): boolean {
  if (isBlankIndustryInput(industry)) return false;
  return Boolean(getIndustryPlugin(industry).showsAdultPracticeGuide);
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

