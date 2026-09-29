import type { ReactNode } from 'react';
import type { NavTab } from '@/context/AppContext';
import type { ModuleLabels } from './labels';
import type { NavMenuItem, NavMenuSection } from '@/core/auth/navUtils';
import { MORE_NAV_SECTION } from '@/core/auth/navUtils';
import { defineMobileMainNav } from '@/core/auth/mobileNavPolicy';
import { buildNavSection } from '@/core/auth/navBuilders';
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  Users,
} from 'lucide-react';

const icon = (node: ReactNode) => node;

const FINANCE_LABEL = '수납·재무';

/** 모바일 하단 고정 탭 (더보기 제외). 일일 핵심: 학생·일정·출결 */
export const PIANO_MOBILE_MAIN = defineMobileMainNav({
  tabs: ['dashboard', 'students', 'timetable', 'attendance'],
});

export const PIANO_MOBILE_MAIN_TABS: readonly NavTab[] = PIANO_MOBILE_MAIN.tabs;

/** 모바일 더보기 — 하단 미노출 핵심 + 설정 */
export const PIANO_MOBILE_MORE_TABS: readonly NavTab[] = [
  'consultations',
  'finance',
  'settings',
] as const;

/** 설정 허브「부가」— 저빈도 기능 (더보기와 중복하지 않음) */
export const PIANO_SETTINGS_EXTRAS: { tab: NavTab; label: string }[] = [
  { tab: 'bookings', label: '상담 가능시간' },
  { tab: 'classes', label: '반 관리' },
  { tab: 'check-in', label: 'PIN 출석' },
  { tab: 'assignments', label: '주간 과제' },
  { tab: 'practice', label: '연습 기록' },
  { tab: 'practice-rooms', label: '연습실 예약' },
  { tab: 'textbooks', label: '교재 관리' },
  { tab: 'passes', label: '회차권 관리' },
  // resources: UI 숨김 — VIEW_MAP·데이터 유지
  { tab: 'recitals', label: '연주회·콩쿠르' },
  { tab: 'curriculum', label: '커리큘럼·진도' },
  { tab: 'achievements', label: '시험·등급' },
  { tab: 'song-stamps', label: '완곡 스탬프' },
  { tab: 'reports', label: '학습 리포트' },
];

/** 사이드바·하단 공통 — 홈/학생/일정/출결/상담/수납·재무 */
function getPianoCoreNavItems(labels: ModuleLabels, size: 'sm' | 'md'): NavMenuItem[] {
  const cls = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  return [
    { tab: 'dashboard', label: '홈', icon: icon(<LayoutDashboard className={cls} />) },
    {
      tab: 'students',
      label: labels.customer.singular,
      icon: icon(<Users className={cls} />),
    },
    {
      tab: 'timetable',
      label: '일정',
      icon: icon(<CalendarDays className={cls} />),
    },
    { tab: 'attendance', label: '출결', icon: icon(<CheckSquare className={cls} />) },
    {
      tab: 'consultations',
      label: '상담',
      icon: icon(<MessageSquareText className={cls} />),
    },
    { tab: 'finance', label: FINANCE_LABEL, icon: icon(<BarChart3 className={cls} />) },
  ];
}

function settingsNavItem(size: 'sm' | 'md'): NavMenuItem {
  const cls = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  return { tab: 'settings', label: '설정', icon: icon(<Settings className={cls} />) };
}

/**
 * 데스크탑 사이드바 — 사업주 핵심
 * 홈 / 학생 / 일정 / 출결 / 상담 / 수납·재무 · 설정
 */
export function getPianoSidebarSections(labels: ModuleLabels): NavMenuSection[] {
  return [
    buildNavSection('업무', getPianoCoreNavItems(labels, 'sm')),
    buildNavSection('설정', [settingsNavItem('sm')]),
  ];
}

/** 모바일 하단 — 홈 · 학생 · 일정 · 출결 (+ 더보기) */
export function getPianoMainTabs(labels: ModuleLabels): NavMenuItem[] {
  const byTab = new Map(getPianoCoreNavItems(labels, 'md').map((item) => [item.tab, item]));
  return PIANO_MOBILE_MAIN_TABS.map((tab) => byTab.get(tab)!).filter(Boolean);
}

/** 더보기 — 상담 · 수납·재무 · 설정 */
export function getPianoMoreTabs(labels: ModuleLabels): NavMenuItem[] {
  const byTab = new Map(getPianoCoreNavItems(labels, 'md').map((item) => [item.tab, item]));
  return PIANO_MOBILE_MORE_TABS.map((tab) => {
    const item = tab === 'settings' ? settingsNavItem('md') : byTab.get(tab)!;
    if (!item) return item;
    return {
      ...item,
      section: tab === 'settings' ? MORE_NAV_SECTION.settings : MORE_NAV_SECTION.work,
    };
  }).filter(Boolean);
}
