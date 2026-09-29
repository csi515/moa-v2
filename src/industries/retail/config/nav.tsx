import type { ReactNode } from 'react';
import type { ModuleLabels } from './labels';
import type { NavMenuItem, NavMenuSection } from '@/core/auth/navUtils';
import { MORE_NAV_SECTION } from '@/core/auth/navUtils';
import { defineMobileMainNav } from '@/core/auth/mobileNavPolicy';
import { buildNavSection } from '@/core/auth/navBuilders';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  ShoppingCart,
  Users,
  BarChart3,
  Receipt,
  UserCog,
  Settings,
  Warehouse,
} from 'lucide-react';

const icon = (node: ReactNode) => node;

/** 홈 · 판매 · 상품 · 재고 · 고객 · (더보기: 매출·판매내역·직원·설정) */
export function getRetailSidebarSections(labels: ModuleLabels): NavMenuSection[] {
  return [
    buildNavSection('업무', [
      { tab: 'dashboard', label: '홈', icon: icon(<LayoutDashboard className="w-4 h-4" />) },
      { tab: 'sales', label: '판매', icon: icon(<ShoppingCart className="w-4 h-4" />) },
      { tab: 'retail', label: '상품', icon: icon(<Package className="w-4 h-4" />) },
      { tab: 'inventory', label: '재고', icon: icon(<Warehouse className="w-4 h-4" />) },
      {
        tab: 'members',
        label: labels.customer.singular,
        icon: icon(<Users className="w-4 h-4" />),
      },
    ]),
    buildNavSection('더보기', [
      { tab: 'reports', label: '매출', icon: icon(<BarChart3 className="w-4 h-4" />) },
      { tab: 'income', label: '판매내역', icon: icon(<Receipt className="w-4 h-4" />) },
      {
        tab: 'instructors',
        label: labels.staff.singular,
        icon: icon(<UserCog className="w-4 h-4" />),
      },
      { tab: 'settings', label: '설정', icon: icon(<Settings className="w-4 h-4" />) },
    ]),
  ];
}

/**
 * 유통 POS는 판매·상품·재고·고객이 모두 카운터 핵심이라
 * 권장 4개를 넘긴다.
 */
export const RETAIL_MOBILE_MAIN = defineMobileMainNav({
  tabs: ['dashboard', 'sales', 'retail', 'inventory', 'members'],
  reason: '판매·상품·재고·고객이 카운터 핵심이라 권장 4개를 넘긴다.',
});

export function getRetailMainTabs(labels: ModuleLabels): NavMenuItem[] {
  return [
    { tab: 'dashboard', label: '홈', icon: icon(<LayoutDashboard className="w-5 h-5" />) },
    { tab: 'sales', label: '판매', icon: icon(<ShoppingCart className="w-5 h-5" />) },
    { tab: 'retail', label: '상품', icon: icon(<ShoppingBag className="w-5 h-5" />) },
    { tab: 'inventory', label: '재고', icon: icon(<Warehouse className="w-5 h-5" />) },
    {
      tab: 'members',
      label: labels.customer.singular,
      icon: icon(<Users className="w-5 h-5" />),
    },
  ];
}

export function getRetailMoreTabs(labels: ModuleLabels): NavMenuItem[] {
  return [
    {
      tab: 'reports',
      label: '매출',
      icon: icon(<BarChart3 className="w-5 h-5" />),
      section: MORE_NAV_SECTION.manage,
    },
    {
      tab: 'income',
      label: '판매내역',
      icon: icon(<Receipt className="w-5 h-5" />),
      section: MORE_NAV_SECTION.manage,
    },
    {
      tab: 'instructors',
      label: labels.staff.singular,
      icon: icon(<UserCog className="w-5 h-5" />),
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
