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
import type { IndustryType } from '@/core/industry/types';
import { normalizeIndustryType } from '@/core/industry/types';
import type { ParentPortalTab } from '@/types/education';

export type ParentPortalNavItem = {
  id: ParentPortalTab;
  label: string;
  icon: React.ReactNode;
};

const icon = (node: React.ReactNode) => node;

/** 피아노: 홈·일정·출결·수납·더보기 */
const PIANO_PARENT_NAV: ParentPortalNavItem[] = [
  { id: 'home', label: '홈', icon: icon(<Home className="w-5 h-5" />) },
  { id: 'schedule', label: '일정', icon: icon(<CalendarDays className="w-5 h-5" />) },
  { id: 'attendance', label: '출결', icon: icon(<CheckSquare className="w-5 h-5" />) },
  { id: 'tuition', label: '수납', icon: icon(<CreditCard className="w-5 h-5" />) },
  { id: 'more', label: '더보기', icon: icon(<Menu className="w-5 h-5" />) },
];

/** 업종별 학부모/보호자 하단 네비 */
const GENERIC_PARENT_NAV: ParentPortalNavItem[] = [
  { id: 'home', label: '홈', icon: icon(<Home className="w-5 h-5" />) },
  { id: 'attendance', label: '출결', icon: icon(<CheckSquare className="w-5 h-5" />) },
  { id: 'tuition', label: '수납', icon: icon(<CreditCard className="w-5 h-5" />) },
  { id: 'more', label: '더보기', icon: icon(<Menu className="w-5 h-5" />) },
];

export function getParentPortalNav(industry: IndustryType | string | null | undefined): ParentPortalNavItem[] {
  switch (normalizeIndustryType(industry)) {
    case 'daycare':
      return [
        { id: 'home', label: '홈', icon: icon(<Home className="w-5 h-5" />) },
        { id: 'journals', label: '알림장', icon: icon(<BookOpen className="w-5 h-5" />) },
        { id: 'medications', label: '투약', icon: icon(<Pill className="w-5 h-5" />) },
        { id: 'attendance', label: '등하원', icon: icon(<CheckSquare className="w-5 h-5" />) },
        { id: 'tuition', label: '보육료', icon: icon(<CreditCard className="w-5 h-5" />) },
        { id: 'more', label: '더보기', icon: icon(<Menu className="w-5 h-5" />) },
      ];
    case 'gym':
      return [
        { id: 'home', label: '홈', icon: icon(<Home className="w-5 h-5" />) },
        { id: 'schedule', label: '수업', icon: icon(<CalendarDays className="w-5 h-5" />) },
        { id: 'shuttle', label: '차량', icon: icon(<Bus className="w-5 h-5" />) },
        { id: 'attendance', label: '출결', icon: icon(<CheckSquare className="w-5 h-5" />) },
        { id: 'tuition', label: '수강료', icon: icon(<CreditCard className="w-5 h-5" />) },
        { id: 'more', label: '더보기', icon: icon(<Menu className="w-5 h-5" />) },
      ];
    case 'pilates':
      return [
        { id: 'home', label: '홈', icon: icon(<Home className="w-5 h-5" />) },
        { id: 'bookings', label: '예약', icon: icon(<CalendarClock className="w-5 h-5" />) },
        { id: 'tuition', label: '수강료', icon: icon(<CreditCard className="w-5 h-5" />) },
        { id: 'attendance', label: '출입', icon: icon(<CheckSquare className="w-5 h-5" />) },
        { id: 'more', label: '더보기', icon: icon(<Menu className="w-5 h-5" />) },
      ];
    case 'skin_clinic':
      return [
        { id: 'home', label: '홈', icon: icon(<Home className="w-5 h-5" />) },
        { id: 'bookings', label: '예약', icon: icon(<CalendarClock className="w-5 h-5" />) },
        { id: 'tuition', label: '이용료', icon: icon(<CreditCard className="w-5 h-5" />) },
        { id: 'attendance', label: '출입', icon: icon(<CheckSquare className="w-5 h-5" />) },
        { id: 'more', label: '더보기', icon: icon(<Menu className="w-5 h-5" />) },
      ];
    case 'piano':
      return PIANO_PARENT_NAV;
    default:
      return GENERIC_PARENT_NAV;
  }
}

export function getParentPortalRoleLabel(industry: IndustryType | string | null | undefined): string {
  const type = normalizeIndustryType(industry);
  if (type === 'daycare') return '보호자 포털';
  if (type === 'skin_clinic') return '고객 포털';
  return '학부모 포털';
}

/** 하단 네비에는 없지만 홈·더보기에서 이동 가능한 탭 */
export function getParentPortalSecondaryTabs(
  industry: IndustryType | string | null | undefined
): ParentPortalTab[] {
  const type = normalizeIndustryType(industry);
  if (type === 'piano') {
    return ['notices', 'assignments', 'progress', 'stamps', 'reports', 'events', 'more'];
  }
  if (type === 'gym') return ['notices', 'events', 'more'];
  if (type === 'daycare') return ['notices', 'incidents', 'pickups', 'more'];
  if (type === 'pilates' || type === 'skin_clinic') return ['notices', 'more'];
  return ['notices', 'more'];
}

/** @deprecated 레거시 import 호환 */
export const DEFAULT_PARENT_NAV = PIANO_PARENT_NAV;
