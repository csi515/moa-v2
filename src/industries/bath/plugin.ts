import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { withNoticesTabs } from '@/core/industry/pluginTypes';

/** 사우나·찜질방(Bath) 플러그인 매니페스트 — 골격만. 업무 로직 없음 */
export const bathPluginManifest: IndustryPluginManifest = {
  id: 'sauna_jjimjilbang',
  option: {
    value: 'sauna_jjimjilbang',
    label: '사우나·찜질방',
    description: '사우나·찜질',
  },
  aliases: ['sauna_jjimjbang'],
  theme: 'orange',
  accent: {
    btn: 'bg-orange-600',
    btnHover: 'hover:bg-orange-700',
    icon: 'text-orange-600',
    hoverBg: 'hover:bg-orange-50',
    ring: 'focus:ring-orange-500 focus:border-orange-300',
  },
  attendanceDefault: false,
  usesClassBasedSchedule: false,
  customerListTab: 'members',
  showSchoolFields: false,
  showPickupFields: false,
  levelLabel: '이용 등급',
  adminTabs: withNoticesTabs(['dashboard', 'members', 'bookings', 'settings']),
  staffTabs: withNoticesTabs(['dashboard', 'members', 'bookings']),
};
