/**
 * Industry capability → 탭/뷰 조합. Composition 책임.
 * Core는 이 규칙을 import하지 않는다.
 * 플래그 값은 `industryCapabilityMap.getIndustryCapabilities`.
 */
import type { CapabilityId } from '@/capabilities';
import { getIndustryCapabilities } from './industryCapabilityMap';
import { installCapabilityNavFilter } from '@/core/industry/capabilityNavHost';
import { isIndustryCapabilityEnabled, type IndustryCapabilityFlagMap } from '@/core/industry/industryCapabilities';

/** 탭이 이 capability에 묶이면, capability가 꺼진 업종에서는 숨긴다. */
export const NAV_TAB_REQUIRED_CAPABILITY: Readonly<Partial<Record<string, CapabilityId>>> = {
  attendance: 'attendance',
  'check-in': 'attendance',
  tuition: 'billing',
  unpaid: 'billing',
  finance: 'billing',
  expenses: 'billing',
  payroll: 'billing',
  shuttle: 'transport',
  'enrollment-requests': 'enrollment',
  consultations: 'consultation',
  'practice-rooms': 'resources',
  parents: 'parent',
  sales: 'commerce',
  retail: 'commerce',
  inventory: 'commerce',
};

/**
 * income은 billing(수납) 또는 commerce(판매내역) 중 하나가 있으면 유지한다.
 * 그 외 탭은 NAV_TAB_REQUIRED_CAPABILITY 만 본다.
 */
export function isNavTabAllowedForCapabilities(
  tab: string,
  capabilities: IndustryCapabilityFlagMap | undefined
): boolean {
  if (tab === 'income') {
    return (
      isIndustryCapabilityEnabled(capabilities, 'billing') ||
      isIndustryCapabilityEnabled(capabilities, 'commerce')
    );
  }
  const required = NAV_TAB_REQUIRED_CAPABILITY[tab];
  if (!required) return true;
  return isIndustryCapabilityEnabled(capabilities, required);
}

export function filterTabsByIndustryCapabilities<T extends string>(
  tabs: readonly T[],
  capabilities: IndustryCapabilityFlagMap | undefined
): T[] {
  return tabs.filter((tab) => isNavTabAllowedForCapabilities(tab, capabilities));
}

export function filterIndustryNavTabs<T extends string>(
  tabs: readonly T[],
  industry: string | null | undefined
): T[] {
  return filterTabsByIndustryCapabilities(tabs, getIndustryCapabilities(industry));
}

/** enabled capability가 갖춰야 할 네비/뷰 단서 */
export const CAPABILITY_IMPLEMENTATION_TABS: Readonly<Record<CapabilityId, readonly string[]>> = {
  roster: ['students', 'members'],
  scheduling: ['timetable', 'calendar', 'classes', 'bookings'],
  booking: ['bookings', 'services'],
  billing: ['tuition', 'unpaid', 'finance', 'income', 'expenses', 'payroll'],
  attendance: ['attendance', 'check-in'],
  parent: ['parents'],
  enrollment: ['enrollment-requests'],
  consultation: ['consultations'],
  resources: ['practice-rooms', 'resources'],
  transport: ['shuttle'],
  commerce: ['sales', 'retail', 'inventory', 'textbooks'],
};

installCapabilityNavFilter(filterIndustryNavTabs);
