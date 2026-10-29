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
  CreditCard,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  Users,
} from 'lucide-react';

const icon = (node: ReactNode) => node;

/** 모바일 하단 고정 탭 (더보기 제외). 일일 핵심: 학생·일정·출결 */
export const PIANO_MOBILE_MAIN = defineMobileMainNav({
  tabs: ['dashboard', 'students', 'timetable', 'attendance'],
});

export const PIANO_MOBILE_MAIN_TABS: readonly NavTab[] = PIANO_MOBILE_MAIN.tabs;

/** 모바일 더보기 — 하단 미노출 핵심 + 설정 (수납과 재무 관리 분리) */
export const PIANO_MOBILE_MORE_TABS: readonly NavTab[] = [
  'consultations',
  'tuition',
  'finance',
  'settings',
] as const;

export {
  PIANO_SETTINGS_EXTRAS,
  PIANO_CORE_SETTINGS_EXTRAS,
  getPianoSettingsExtras,
} from './pianoSettingsExtras';

/** 사이드바·하단 공통 — 홈/학생/일정/출결/상담/수납/재무 관리 */
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
    { tab: 'tuition', label: '수납', icon: icon(<CreditCard className={cls} />) },
    { tab: 'finance', label: '재무 관리', icon: icon(<BarChart3 className={cls} />) },
  ];
}

function settingsNavItem(size: 'sm' | 'md'): NavMenuItem {
  const cls = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  return { tab: 'settings', label: '설정', icon: icon(<Settings className={cls} />) };
}

/**
 * 데스크탑 사이드바 — 사업주 핵심
 * 홈 / 학생 / 일정 / 출결 / 상담 / 수납 / 재무 관리 · 설정
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

/** 더보기 — 상담 · 수납 · 재무 관리 · 설정 */
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
