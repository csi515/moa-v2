import type { ReactNode } from 'react';
import type { ModuleLabels } from './labels';
import type { NavMenuItem, NavMenuSection } from '@/core/auth/navUtils';
import { defineMobileMainNav } from '@/core/auth/mobileNavPolicy';
import { buildNavSection } from '@/core/auth/navBuilders';
import { CalendarDays, LayoutDashboard, Lock, Settings, Ticket, Users } from 'lucide-react';

const icon = (node: ReactNode) => node;

export function getBathSidebarSections(labels: ModuleLabels): NavMenuSection[] {
  return [
    buildNavSection('업무', [
      { tab: 'dashboard', label: '홈', icon: icon(<LayoutDashboard className="w-4 h-4" />) },
      {
        tab: 'members',
        label: labels.customer.plural,
        icon: icon(<Users className="w-4 h-4" />),
      },
      { tab: 'lockers', label: '사물함·락커', icon: icon(<Lock className="w-4 h-4" />) },
      { tab: 'passes', label: '이용권·회원권', icon: icon(<Ticket className="w-4 h-4" />) },
      { tab: 'bookings', label: '예약', icon: icon(<CalendarDays className="w-4 h-4" />) },
    ]),
    buildNavSection('설정', [
      { tab: 'settings', label: '설정', icon: icon(<Settings className="w-4 h-4" />) },
    ]),
  ];
}

/** 목욕탕 핵심 4탭(홈, 고객, 락커, 이용권) */
export const BATH_MOBILE_MAIN = defineMobileMainNav({
  tabs: ['dashboard', 'members', 'lockers', 'passes'],
});

export function getBathMainTabs(labels: ModuleLabels): NavMenuItem[] {
  return [
    { tab: 'dashboard', label: '홈', icon: icon(<LayoutDashboard className="w-5 h-5" />) },
    { tab: 'members', label: labels.customer.singular, icon: icon(<Users className="w-5 h-5" />) },
    { tab: 'lockers', label: '락커', icon: icon(<Lock className="w-5 h-5" />) },
    { tab: 'passes', label: '이용권', icon: icon(<Ticket className="w-5 h-5" />) },
  ];
}

export function getBathMoreTabs(): NavMenuItem[] {
  return [{ tab: 'settings', label: '설정', icon: icon(<Settings className="w-5 h-5" />) }];
}
