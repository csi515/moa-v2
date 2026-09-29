import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { withNoticesTabs } from '@/core/industry/pluginTypes';

/**
 * 소매업 플러그인 매니페스트.
 * 권한은 OrganizationMembership.role + 기존 getAllowedTabs 재사용.
 *
 * Owner/Admin(manager): 상품·재고(변경)·판매·고객·매출·판매내역·직원·설정
 * Staff: 판매·고객·판매내역·재고(조회만) — 상품·매출·직원·설정 제외
 */
export const retailPluginManifest: IndustryPluginManifest = {
  id: 'retail',
  option: {
    value: 'retail',
    label: '소매업',
    description: '상품·재고·판매·고객·포인트 중심 운영',
  },
  theme: 'teal',
  accent: {
    btn: 'bg-teal-600',
    btnHover: 'hover:bg-teal-700',
    icon: 'text-teal-600',
    hoverBg: 'hover:bg-teal-50',
    ring: 'focus:ring-teal-500 focus:border-teal-300',
  },
  attendanceDefault: false,
  usesClassBasedSchedule: false,
  customerListTab: 'members',
  showSchoolFields: false,
  showPickupFields: false,
  levelLabel: '회원 등급',
  adminTabs: withNoticesTabs([
    'dashboard',
    'sales',
    'retail',
    'inventory',
    'members',
    'reports',
    'income',
    'instructors',
    'settings',
  ]),
  staffTabs: withNoticesTabs([
    'dashboard',
    'sales',
    'inventory',
    'members',
    'income',
  ]),
};
