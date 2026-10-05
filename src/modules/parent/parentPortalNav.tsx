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
import {
  getCustomerLabel,
  getFeeLabel,
  getPlaceLabel,
  isAppointmentIndustry,
  isDaycareIndustry,
  isGymIndustry,
  isPilatesIndustry,
  isSkinClinicIndustry,
  showsTextbooksLink,
} from '@/core/industry/industryUi';
import type { ParentPortalTab } from '@/types/education';
import { ParentIndustryAdapter } from '@/capabilities/parent/ParentIndustryAdapter';

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

const DAYCARE_PARENT_NAV: ParentPortalNavItem[] = [
  { id: 'home', label: '홈', icon: icon(<Home className="w-5 h-5" />) },
  { id: 'journals', label: '알림장', icon: icon(<BookOpen className="w-5 h-5" />) },
  { id: 'medications', label: '투약', icon: icon(<Pill className="w-5 h-5" />) },
  { id: 'attendance', label: '등하원', icon: icon(<CheckSquare className="w-5 h-5" />) },
  { id: 'tuition', label: '보육료', icon: icon(<CreditCard className="w-5 h-5" />) },
  { id: 'more', label: '더보기', icon: icon(<Menu className="w-5 h-5" />) },
];

const GYM_PARENT_NAV: ParentPortalNavItem[] = [
  { id: 'home', label: '홈', icon: icon(<Home className="w-5 h-5" />) },
  { id: 'schedule', label: '수업', icon: icon(<CalendarDays className="w-5 h-5" />) },
  { id: 'shuttle', label: '차량', icon: icon(<Bus className="w-5 h-5" />) },
  { id: 'attendance', label: '출결', icon: icon(<CheckSquare className="w-5 h-5" />) },
  { id: 'tuition', label: '수강료', icon: icon(<CreditCard className="w-5 h-5" />) },
  { id: 'more', label: '더보기', icon: icon(<Menu className="w-5 h-5" />) },
];

const PILATES_PARENT_NAV: ParentPortalNavItem[] = [
  { id: 'home', label: '홈', icon: icon(<Home className="w-5 h-5" />) },
  { id: 'bookings', label: '예약', icon: icon(<CalendarClock className="w-5 h-5" />) },
  { id: 'tuition', label: '수강료', icon: icon(<CreditCard className="w-5 h-5" />) },
  { id: 'attendance', label: '출입', icon: icon(<CheckSquare className="w-5 h-5" />) },
  { id: 'more', label: '더보기', icon: icon(<Menu className="w-5 h-5" />) },
];

const SKIN_PARENT_NAV: ParentPortalNavItem[] = [
  { id: 'home', label: '홈', icon: icon(<Home className="w-5 h-5" />) },
  { id: 'bookings', label: '예약', icon: icon(<CalendarClock className="w-5 h-5" />) },
  { id: 'tuition', label: '이용료', icon: icon(<CreditCard className="w-5 h-5" />) },
  { id: 'attendance', label: '출입', icon: icon(<CheckSquare className="w-5 h-5" />) },
  { id: 'more', label: '더보기', icon: icon(<Menu className="w-5 h-5" />) },
];

/**
 * 학원·원생은 place/customer/fee 라벨에 있을 때만 탭 문구에 남긴다.
 * 비용 탭은 feeLabel 그대로다. 하드코드된 학원 단어를 매니페스트 장소·고객 이름으로 바꾼다.
 */
function labelFromManifest(
  label: string,
  place: string,
  customer: string,
  fee: string,
): string {
  const manifest = `${place}\n${customer}\n${fee}`;
  let next = label;
  if (next.includes('학원') && !manifest.includes('학원')) next = next.replaceAll('학원', place);
  if (next.includes('원생') && !manifest.includes('원생')) next = next.replaceAll('원생', customer);
  return next;
}

/**
 * 전용 메뉴가 없는 업종. 탭은 홈·출결·비용·더보기만.
 * 과제·진도·교재는 showsTextbooksLink가 켜져 있어도 하단 네비에 넣지 않는다.
 */
function genericParentNav(industry: IndustryType | null): ParentPortalNavItem[] {
  const place = getPlaceLabel(industry);
  const customer = getCustomerLabel(industry);
  const fee = getFeeLabel(industry);
  const attendanceLabel = isAppointmentIndustry(industry) ? '출입' : '출결';
  const items: ParentPortalNavItem[] = [
    { id: 'home', label: labelFromManifest('홈', place, customer, fee), icon: icon(<Home className="w-5 h-5" />) },
    {
      id: 'attendance',
      label: labelFromManifest(attendanceLabel, place, customer, fee),
      icon: icon(<CheckSquare className="w-5 h-5" />),
    },
    {
      id: 'tuition',
      label: labelFromManifest(fee, place, customer, fee),
      icon: icon(<CreditCard className="w-5 h-5" />),
    },
    { id: 'more', label: labelFromManifest('더보기', place, customer, fee), icon: icon(<Menu className="w-5 h-5" />) },
  ];
  // 교재 플래그가 켜져 있어도 과제·진도·교재 탭은 붙이지 않는다.
  if (showsTextbooksLink(industry)) return items;
  return items;
}

export function getParentPortalNav(industry: IndustryType | string | null | undefined): ParentPortalNavItem[] {
  return ParentIndustryAdapter.getNav(industry);
}

export function getParentPortalRoleLabel(industry: IndustryType | string | null | undefined): string {
  return ParentIndustryAdapter.getRoleLabel(industry);
}

/** 하단 네비에는 없지만 홈·더보기에서 이동 가능한 탭 */
export function getParentPortalSecondaryTabs(
  industry: IndustryType | string | null | undefined
): ParentPortalTab[] {
  return ParentIndustryAdapter.getSecondaryTabs(industry);
}

/** @deprecated 레거시 import 호환 */
export const DEFAULT_PARENT_NAV = PIANO_PARENT_NAV;
