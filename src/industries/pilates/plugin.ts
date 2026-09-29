import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { withNoticesTabs } from '@/core/industry/pluginTypes';

/** 필라테스 플러그인 매니페스트 (예약·수업 종류 중심) */
export const pilatesPluginManifest: IndustryPluginManifest = {
  id: 'pilates',
  option: {
    value: 'pilates',
    label: '필라테스학원',
    description: '회원·예약·수업 종류·강사 스케줄 중심 운영',
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
  showSchoolFields: true,
  showPickupFields: true,
  levelLabel: '레벨',
  adminTabs: withNoticesTabs([
    'dashboard',
    'bookings',
    'services',
    'members',
    'passes',
    'instructors',
    'attendance',
    'settings',
  ]),
  staffTabs: withNoticesTabs(['dashboard', 'bookings', 'members', 'passes', 'attendance']),
};
