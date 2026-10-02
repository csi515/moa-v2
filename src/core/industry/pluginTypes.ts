import type { NavTab } from '@/shared/navigation/navigationTypes';
import type { ModuleTheme } from '@/shared/components/layout/moduleTheme';
import type { IndustryOption, IndustryType } from './types';

export interface IndustryAccent {
  btn: string;
  btnHover: string;
  icon: string;
  hoverBg: string;
  ring: string;
}

/**
 * 업종 플러그인 메타데이터.
 * AppContent/Labels는 src/app/industry/industryModules.tsx에서 등록하고,
 * 탭·테마·출결 기본값 등은 이 매니페스트로 통일한다.
 */
export interface IndustryPluginManifest {
  id: IndustryType;
  option: IndustryOption;
  /** 구 industry_type 값 호환 */
  aliases?: string[];
  theme: ModuleTheme;
  accent: IndustryAccent;
  attendanceDefault: boolean;
  usesClassBasedSchedule: boolean;
  customerListTab: NavTab;
  showSchoolFields: boolean;
  /** 픽업·하원 셔틀 주소 관리 UI */
  showPickupFields: boolean;
  levelLabel: string;
  /** 원생 level 선택지. 값 집합은 Industry 소유. 없으면 빈 목록 */
  levelOptions?: readonly string[];
  adminTabs: NavTab[];
  staffTabs: NavTab[];
  /**
   * 이 업종이 사용하는 hydrate/persist capability id 선언.
   * Adapter는 이 목록만 조회한다. 업종 이름을 Adapter에서 직접 분기하지 않는다.
   * 실제 구현 등록은 Industry `sync/register*Sync.ts`가 `registerIndustrySyncCapability`로 한다.
   * registry는 구현의 소유자가 아니다.
   */
  syncCapabilities?: string[];
  /** 장소 명칭 (예: '학원', '스튜디오', '체육관', '원', '샵') */
  placeLabel?: string;
  /** 사업주 호칭 (예: '원장', '대표') */
  ownerLabel?: string;
  /** 사업장 이름 입력 예시 */
  placeNamePlaceholder?: string;
  /** 고객 명칭 (예: '원생', '회원', '원아', '고객') */
  customerLabel?: string;
  /** 예약·서비스 중심 업종 여부 */
  isAppointment?: boolean;
}

export type IndustryPlugin = IndustryPluginManifest;

const OWNER_FINANCE_TABS: NavTab[] = ['finance', 'income', 'expenses', 'payroll'];

/** 반·시간표·출결·고객 중심 코어 메뉴 (체육관·어린이집 등) — 수납·재무는 허브 딥링크 유지 */
export const CLASS_BASED_CORE_ADMIN_TABS: NavTab[] = [
  'dashboard',
  'students',
  'parents',
  'enrollment-requests',
  'classes',
  'timetable',
  'attendance',
  'notices',
  'tuition',
  'unpaid',
  'teachers',
  'calendar',
  'settings',
];

export const CLASS_BASED_CORE_STAFF_TABS: NavTab[] = [
  'dashboard',
  'students',
  'classes',
  'timetable',
  'attendance',
  'notices',
];

/** 탭 목록에 안내장(notices) 포함 */
export function withNoticesTabs(tabs: NavTab[]): NavTab[] {
  if (tabs.includes('notices')) return tabs;
  return [...tabs, 'notices'];
}

export function withOwnerFinanceTabs(tabs: NavTab[]): NavTab[] {
  const merged = [...tabs];
  for (const tab of OWNER_FINANCE_TABS) {
    if (!merged.includes(tab)) merged.push(tab);
  }
  return merged;
}
