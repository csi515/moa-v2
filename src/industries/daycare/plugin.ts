import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { CLASS_BASED_CORE_ADMIN_TABS, CLASS_BASED_CORE_STAFF_TABS } from '@/core/industry/pluginTypes';
import './sync/registerDaycareSync';
import './care/bindCareStorage';
import { DAYCARE_AGE_CLASSES } from './types/ageClass';

/** 어린이집 플러그인 매니페스트 — 코어 + 상담 + 알림장·투약·가정통신문 */
export const daycarePluginManifest: IndustryPluginManifest = {
  id: 'daycare',
  option: {
    value: 'daycare',
    label: '어린이집',
    description: '원아·보호자·반·등하원·보육료·알림장·가정통신문 중심 운영',
  },
  theme: 'sky',
  accent: {
    btn: 'bg-sky-600',
    btnHover: 'hover:bg-sky-700',
    icon: 'text-sky-600',
    hoverBg: 'hover:bg-sky-50',
    ring: 'focus:ring-sky-500 focus:border-sky-300',
  },
  attendanceDefault: true,
  usesClassBasedSchedule: true,
  customerListTab: 'students',
  showSchoolFields: false,
  showPickupFields: true,
  syncCapabilities: ['daycare'],
  levelLabel: '연령반',
  levelOptions: DAYCARE_AGE_CLASSES,
  adminTabs: [
    ...CLASS_BASED_CORE_ADMIN_TABS,
    'consultations',
    'journals',
    'medications',
  ],
  staffTabs: [
    ...CLASS_BASED_CORE_STAFF_TABS,
    'consultations',
    'journals',
    'medications',
  ],
};
