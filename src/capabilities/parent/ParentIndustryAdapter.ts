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
} from 'lucide-react';
import { normalizeIndustryType, type IndustryType } from '@/core/industry/types';
import {
  getCustomerLabel,
  getFeeLabel,
  getPlaceLabel,
  isAppointmentIndustry,
  getIndustryPlugin,
} from '@/core/industry/industryUi';
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

const PIANO_PARENT_NAV: ParentPortalNavItem[] = [
  { id: 'home', label: '홈', icon: icon(React.createElement(Home, { className: 'w-5 h-5' })) },
  { id: 'schedule', label: '일정', icon: icon(React.createElement(CalendarDays, { className: 'w-5 h-5' })) },
  { id: 'attendance', label: '출결', icon: icon(React.createElement(CheckSquare, { className: 'w-5 h-5' })) },
  { id: 'tuition', label: '수납', icon: icon(React.createElement(CreditCard, { className: 'w-5 h-5' })) },
  { id: 'more', label: '더보기', icon: icon(React.createElement(Menu, { className: 'w-5 h-5' })) },
];

const DAYCARE_PARENT_NAV: ParentPortalNavItem[] = [
  { id: 'home', label: '홈', icon: icon(React.createElement(Home, { className: 'w-5 h-5' })) },
  { id: 'journals', label: '알림장', icon: icon(React.createElement(BookOpen, { className: 'w-5 h-5' })) },
  { id: 'medications', label: '투약', icon: icon(React.createElement(Pill, { className: 'w-5 h-5' })) },
  { id: 'attendance', label: '등하원', icon: icon(React.createElement(CheckSquare, { className: 'w-5 h-5' })) },
  { id: 'tuition', label: '보육료', icon: icon(React.createElement(CreditCard, { className: 'w-5 h-5' })) },
  { id: 'more', label: '더보기', icon: icon(React.createElement(Menu, { className: 'w-5 h-5' })) },
];

const GYM_PARENT_NAV: ParentPortalNavItem[] = [
  { id: 'home', label: '홈', icon: icon(React.createElement(Home, { className: 'w-5 h-5' })) },
  { id: 'schedule', label: '수업', icon: icon(React.createElement(CalendarDays, { className: 'w-5 h-5' })) },
  { id: 'shuttle', label: '차량', icon: icon(React.createElement(Bus, { className: 'w-5 h-5' })) },
  { id: 'attendance', label: '출결', icon: icon(React.createElement(CheckSquare, { className: 'w-5 h-5' })) },
  { id: 'tuition', label: '수강료', icon: icon(React.createElement(CreditCard, { className: 'w-5 h-5' })) },
  { id: 'more', label: '더보기', icon: icon(React.createElement(Menu, { className: 'w-5 h-5' })) },
];

const PILATES_PARENT_NAV: ParentPortalNavItem[] = [
  { id: 'home', label: '홈', icon: icon(React.createElement(Home, { className: 'w-5 h-5' })) },
  { id: 'bookings', label: '예약', icon: icon(React.createElement(CalendarClock, { className: 'w-5 h-5' })) },
  { id: 'tuition', label: '수강료', icon: icon(React.createElement(CreditCard, { className: 'w-5 h-5' })) },
  { id: 'attendance', label: '출입', icon: icon(React.createElement(CheckSquare, { className: 'w-5 h-5' })) },
  { id: 'more', label: '더보기', icon: icon(React.createElement(Menu, { className: 'w-5 h-5' })) },
];

const SKIN_PARENT_NAV: ParentPortalNavItem[] = [
  { id: 'home', label: '홈', icon: icon(React.createElement(Home, { className: 'w-5 h-5' })) },
  { id: 'bookings', label: '예약', icon: icon(React.createElement(CalendarClock, { className: 'w-5 h-5' })) },
  { id: 'tuition', label: '이용료', icon: icon(React.createElement(CreditCard, { className: 'w-5 h-5' })) },
  { id: 'attendance', label: '출입', icon: icon(React.createElement(CheckSquare, { className: 'w-5 h-5' })) },
  { id: 'more', label: '더보기', icon: icon(React.createElement(Menu, { className: 'w-5 h-5' })) },
];

export class ParentIndustryAdapter {
  static getPolicy(industryType?: IndustryType | string | null): ParentPortalPolicy {
    const norm = normalizeIndustryType(industryType);
    const plugin = norm ? getIndustryPlugin(norm) : getIndustryPlugin('piano');

    let bookingVariant: 'skin' | 'pilates' | 'standard' = 'standard';
    if (norm === 'skin_clinic') bookingVariant = 'skin';
    else if (norm === 'pilates') bookingVariant = 'pilates';

    return {
      showPickupFields: Boolean(plugin.showPickupFields),
      showsPracticeRoomTab: Boolean(plugin.showsPracticeRoomTab),
      showsCustomerPoints: Boolean(plugin.showsCustomerPoints),
      showsMakeupList: Boolean(plugin.showsMakeupList),
      bookingVariant,
    };
  }

  static getNav(industryType?: IndustryType | string | null): ParentPortalNavItem[] {
    const resolved = normalizeIndustryType(industryType);
    if (resolved === 'daycare') return DAYCARE_PARENT_NAV;
    if (resolved === 'gym') return GYM_PARENT_NAV;
    if (resolved === 'skin_clinic') return SKIN_PARENT_NAV;
    if (resolved === 'pilates') return PILATES_PARENT_NAV;
    if (resolved === 'piano') return PIANO_PARENT_NAV;

    const place = getPlaceLabel(resolved);
    const customer = getCustomerLabel(resolved);
    const fee = getFeeLabel(resolved);
    const attendanceLabel = isAppointmentIndustry(resolved) ? '출입' : '출결';

    return [
      { id: 'home', label: '홈', icon: icon(React.createElement(Home, { className: 'w-5 h-5' })) },
      { id: 'attendance', label: attendanceLabel, icon: icon(React.createElement(CheckSquare, { className: 'w-5 h-5' })) },
      { id: 'tuition', label: fee, icon: icon(React.createElement(CreditCard, { className: 'w-5 h-5' })) },
      { id: 'more', label: '더보기', icon: icon(React.createElement(Menu, { className: 'w-5 h-5' })) },
    ];
  }

  static getRoleLabel(industryType?: IndustryType | string | null): string {
    const type = normalizeIndustryType(industryType);
    if (type === 'daycare') return '보호자 포털';
    if (type === 'skin_clinic') return '고객 포털';
    return '학부모 포털';
  }

  static getSecondaryTabs(industryType?: IndustryType | string | null): ParentPortalTab[] {
    const type = normalizeIndustryType(industryType);
    if (type === 'piano') {
      return ['notices', 'assignments', 'progress', 'stamps', 'reports', 'events', 'more'];
    }
    if (type === 'gym') return ['notices', 'events', 'more'];
    if (type === 'daycare') return ['notices', 'incidents', 'pickups', 'more'];
    if (type === 'pilates' || type === 'skin_clinic') return ['notices', 'more'];
    return ['notices', 'more'];
  }

  static getFeeTitle(industryType?: IndustryType | string | null): string {
    const type = normalizeIndustryType(industryType);
    if (type === 'daycare') return '보호자 결제/보육료';
    return getFeeLabel(type) || '수납';
  }
}
