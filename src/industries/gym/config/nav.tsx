import type { ReactNode } from 'react';
import type { ModuleLabels } from './labels';
import type { NavMenuItem, NavMenuSection } from '@/core/auth/navUtils';
import { MORE_NAV_SECTION } from '@/core/auth/navUtils';
import { defineMobileMainNav } from '@/core/auth/mobileNavPolicy';
import { buildFinanceNavItem, buildNavSection } from '@/core/auth/navBuilders';
import {
  Bus,
  CalendarDays,
  CheckSquare,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';

const icon = (node: ReactNode) => node;

/** Core + 출결·차량 오버레이 */
export function getGymSidebarSections(labels: ModuleLabels): NavMenuSection[] {
  return [
    buildNavSection('업무', [
      { tab: 'dashboard', label: '홈', icon: icon(<LayoutDashboard className="w-4 h-4" />) },
      {
        tab: 'students',
        label: labels.customer.singular,
        icon: icon(<Users className="w-4 h-4" />),
      },
      {
        tab: 'timetable',
        label: '일정',
        icon: icon(<CalendarDays className="w-4 h-4" />),
      },
      { tab: 'attendance', label: '출결', icon: icon(<CheckSquare className="w-4 h-4" />) },
      buildFinanceNavItem('sm'),
    ]),
    buildNavSection('설정', [
      { tab: 'settings', label: '설정', icon: icon(<Settings className="w-4 h-4" />) },
    ]),
  ];
}

/**
 * 헬스 하단 핵심: 홈·고객·일정·출결.
 * 출결이 일일 업무이므로 재무는 더보기로 둔다.
 */
export const GYM_MOBILE_MAIN = defineMobileMainNav({
  tabs: ['dashboard', 'students', 'timetable', 'attendance'],
});

export function getGymMainTabs(labels: ModuleLabels): NavMenuItem[] {
  return [
    { tab: 'dashboard', label: '홈', icon: icon(<LayoutDashboard className="w-5 h-5" />) },
    { tab: 'students', label: labels.customer.singular, icon: icon(<Users className="w-5 h-5" />) },
    { tab: 'timetable', label: '일정', icon: icon(<CalendarDays className="w-5 h-5" />) },
    { tab: 'attendance', label: '출결', icon: icon(<CheckSquare className="w-5 h-5" />) },
  ];
}

export function getGymMoreTabs(labels: ModuleLabels): NavMenuItem[] {
  return [
    { ...buildFinanceNavItem('md'), section: MORE_NAV_SECTION.work },
    {
      tab: 'shuttle',
      label: '차량',
      icon: icon(<Bus className="w-5 h-5" />),
      section: MORE_NAV_SECTION.work,
    },
    {
      tab: 'classes',
      label: labels.service.singular,
      icon: icon(<GraduationCap className="w-5 h-5" />),
      section: MORE_NAV_SECTION.manage,
    },
    {
      tab: 'settings',
      label: '설정',
      icon: icon(<Settings className="w-5 h-5" />),
      section: MORE_NAV_SECTION.settings,
    },
  ];
}
