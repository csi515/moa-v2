import React from 'react';
import {
  Home,
  CheckSquare,
  CreditCard,
  BookOpen,
  Pill,
  CalendarClock,
  CalendarDays,
  Bus,
  Menu,
  Coins,
  History,
} from 'lucide-react';
import { normalizeIndustryType, type IndustryType } from '@/core/industry/types';
import {
  getCustomerLabel,
  getFeeLabel,
  getPlaceLabel,
  isAppointmentIndustry,
  getIndustryPlugin,
  getIndustryPluginAdapter,
  getNormalizedIndustryPluginFlag,
} from '@/core/industry/industryUi';
import type { ParentBookingVariant, ParentPortalNavIcon, ParentPortalNavSpec } from '@/core/industry/industryUi';
import type { ParentPortalTab } from '@/types/education';

export type ParentPortalNavItem = {
  id: ParentPortalTab;
  label: string;
  icon: React.ReactNode;
};

export interface ParentPortalPolicy {
  showPickupFields: boolean;
  showsPracticeRoomTab: boolean;
  showsCustomerPoints: boolean;
  showsMakeupList: boolean;
  bookingVariant: 'skin' | 'pilates' | 'standard';
}

const icon = (node: React.ReactNode) => node;

const NAV_ICONS: Record<ParentPortalNavIcon, React.ComponentType<{ className?: string }>> = {
  home: Home,
  check: CheckSquare,
  card: CreditCard,
  book: BookOpen,
  pill: Pill,
  calendarClock: CalendarClock,
  calendar: CalendarDays,
  bus: Bus,
  menu: Menu,
  coins: Coins,
  history: History,
};

const navCache = new WeakMap<readonly ParentPortalNavSpec[], ParentPortalNavItem[]>();

/** 매니페스트의 네비 표(아이콘 키)를 React 네비 항목으로 바꾼다. 같은 표는 같은 배열을 돌려준다. */
function toNavItems(specs: readonly ParentPortalNavSpec[]): ParentPortalNavItem[] {
  const cached = navCache.get(specs);
  if (cached) return cached;
  const items = specs.map((spec) => ({
    id: spec.id as ParentPortalTab,
    label: spec.label,
    icon: icon(React.createElement(NAV_ICONS[spec.icon], { className: 'w-5 h-5' })),
  }));
  navCache.set(specs, items);
  return items;
}

export class ParentIndustryAdapter {
  static getPolicy(industryType?: IndustryType | string | null): ParentPortalPolicy {
    const adapter = getIndustryPluginAdapter(industryType);
    const portalConfig = adapter.getPortalConfig();
    const facilityConfig = adapter.getFacilityConfig();
    const bookingVariant = getNormalizedIndustryPluginFlag(industryType, 'parentBookingVariant') as ParentBookingVariant;

    return {
      showPickupFields: adapter.hasFeature('pickup_fields'),
      showsPracticeRoomTab: Boolean(
        portalConfig.features?.showsPracticeRoomTab ?? facilityConfig.features?.practiceRoomBooking
      ),
      showsCustomerPoints: Boolean(portalConfig.features?.showsCustomerPoints),
      showsMakeupList: Boolean(portalConfig.features?.showsMakeupList),
      bookingVariant,
    };
  }

  static getNav(industryType?: IndustryType | string | null): ParentPortalNavItem[] {
    const resolved = normalizeIndustryType(industryType);
    const fixedNav = getNormalizedIndustryPluginFlag(industryType, 'parentPortalNav');
    if (fixedNav) return toNavItems(fixedNav);

    const adapter = getIndustryPluginAdapter(industryType);
    const fee = adapter.getLabel('fee', '이용료');
    const attendanceLabel = isAppointmentIndustry(resolved) ? '출입' : '출결';

    const navItems: ParentPortalNavItem[] = [
      { id: 'home', label: '홈', icon: icon(React.createElement(Home, { className: 'w-5 h-5' })) },
    ];

    if (adapter.hasFeature('class_based_schedule')) {
      navItems.push({ id: 'schedule', label: '수업', icon: icon(React.createElement(CalendarDays, { className: 'w-5 h-5' })) });
    } else if (isAppointmentIndustry(resolved)) {
      navItems.push({ id: 'bookings', label: '예약', icon: icon(React.createElement(CalendarClock, { className: 'w-5 h-5' })) });
    }

    if (adapter.hasFeature('pickup_fields')) {
      navItems.push({ id: 'shuttle', label: '차량', icon: icon(React.createElement(Bus, { className: 'w-5 h-5' })) });
    }

    navItems.push(
      { id: 'attendance', label: attendanceLabel, icon: icon(React.createElement(CheckSquare, { className: 'w-5 h-5' })) },
      { id: 'tuition', label: fee, icon: icon(React.createElement(CreditCard, { className: 'w-5 h-5' })) },
      { id: 'more', label: '더보기', icon: icon(React.createElement(Menu, { className: 'w-5 h-5' })) }
    );

    return navItems;
  }

  static getRoleLabel(industryType?: IndustryType | string | null): string {
    return (
      getNormalizedIndustryPluginFlag(industryType, 'parentPortalRoleLabel') ??
      getNormalizedIndustryPluginFlag(industryType, 'portalRoleLabel')
    );
  }

  static getSecondaryTabs(industryType?: IndustryType | string | null): ParentPortalTab[] {
    return [...getNormalizedIndustryPluginFlag(industryType, 'parentPortalSecondaryTabs')] as ParentPortalTab[];
  }

  static getFeeTitle(industryType?: IndustryType | string | null): string {
    const fixedTitle = getNormalizedIndustryPluginFlag(industryType, 'parentPortalFeeTitle');
    if (fixedTitle) return fixedTitle;
    return getIndustryPluginAdapter(industryType).getLabel('fee', '수납');
  }
}
