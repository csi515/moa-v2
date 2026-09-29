import type { ReactNode } from 'react';
import type { ModuleLabels } from './labels';
import type { NavMenuItem, NavMenuSection } from '@/core/auth/navUtils';
import { MORE_NAV_SECTION } from '@/core/auth/navUtils';
import { defineMobileMainNav } from '@/core/auth/mobileNavPolicy';
import { buildFinanceNavItem, buildNavSection } from '@/core/auth/navBuilders';
import {
  Calendar,
  KeyRound,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';

const icon = (node: ReactNode) => node;

/** Core: 홈·고객·일정·재무 · 설정 (출결은 더보기) */
export function getPilatesSidebarSections(labels: ModuleLabels): NavMenuSection[] {
  return [
    buildNavSection('업무', [
      { tab: 'dashboard', label: '홈', icon: icon(<LayoutDashboard className="w-4 h-4" />) },
      {
        tab: 'members',
        label: labels.customer.singular,
        icon: icon(<Users className="w-4 h-4" />),
      },
      {
        tab: 'bookings',
        label: '일정',
        icon: icon(<Calendar className="w-4 h-4" />),
      },
      buildFinanceNavItem('sm'),
    ]),
    buildNavSection('설정', [
      { tab: 'settings', label: '설정', icon: icon(<Settings className="w-4 h-4" />) },
    ]),
  ];
}

/**
 * 필라테스 하단 핵심: 홈·고객·일정·재무.
 * 출결(PIN)은 보조 업무라 더보기. 예약·회차권 수납이 일일 핵심.
 */
export const PILATES_MOBILE_MAIN = defineMobileMainNav({
  tabs: ['dashboard', 'members', 'bookings', 'finance'],
});

export function getPilatesMainTabs(labels: ModuleLabels): NavMenuItem[] {
  return [
    { tab: 'dashboard', label: '홈', icon: icon(<LayoutDashboard className="w-5 h-5" />) },
    { tab: 'members', label: labels.customer.singular, icon: icon(<Users className="w-5 h-5" />) },
    { tab: 'bookings', label: '일정', icon: icon(<Calendar className="w-5 h-5" />) },
    buildFinanceNavItem('md'),
  ];
}

export function getPilatesMoreTabs(): NavMenuItem[] {
  return [
    {
      tab: 'attendance',
      label: '출결',
      icon: icon(<KeyRound className="w-5 h-5" />),
      section: MORE_NAV_SECTION.work,
    },
    {
      tab: 'settings',
      label: '설정',
      icon: icon(<Settings className="w-5 h-5" />),
      section: MORE_NAV_SECTION.settings,
    },
  ];
}
