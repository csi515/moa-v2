import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { CLASS_BASED_CORE_ADMIN_TABS, CLASS_BASED_CORE_STAFF_TABS } from '@/core/industry/pluginTypes';
import { GYM_CLASS_LEVELS } from './types/classLevel';

/** 체육관 플러그인 매니페스트 */
export const gymPluginManifest: IndustryPluginManifest = {
  id: 'gym',
  option: {
    value: 'gym',
    label: '체육관',
    description: '태권도·체육 회원, 수업반, 차량 운행, 출결·수강료',
  },
  aliases: ['taekwondo'],
  theme: 'orange',
  accent: {
    btn: 'bg-orange-600',
    btnHover: 'hover:bg-orange-700',
    icon: 'text-orange-600',
    hoverBg: 'hover:bg-orange-50',
    ring: 'focus:ring-orange-500 focus:border-orange-300',
  },
  attendanceDefault: true,
  usesClassBasedSchedule: true,
  customerListTab: 'students',
  showSchoolFields: false,
  showPickupFields: true,
  levelLabel: '수업 레벨',
  levelOptions: GYM_CLASS_LEVELS,
  adminTabs: [...CLASS_BASED_CORE_ADMIN_TABS, 'shuttle'],
  staffTabs: [...CLASS_BASED_CORE_STAFF_TABS, 'shuttle'],
};
