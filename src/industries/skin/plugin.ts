import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { withNoticesTabs } from '@/core/industry/pluginTypes';
import { registerSkinStudentDetailExtension } from './studentDetailExtension';
import './registerAcademySettings';

/** 학생 상세 — 시술 기록 탭 (Core는 Module을 import하지 않음) */
registerSkinStudentDetailExtension();

/** 피부관리샵 플러그인 매니페스트 (예약·시술 중심) */
export const skinPluginManifest: IndustryPluginManifest = {
  id: 'skin_clinic',
  option: {
    value: 'skin_clinic',
    label: '피부관리',
    description: '고객·시술·예약·관리권 중심 운영',
  },
  theme: 'rose',
  accent: {
    btn: 'bg-rose-600',
    btnHover: 'hover:bg-rose-700',
    icon: 'text-rose-600',
    hoverBg: 'hover:bg-rose-50',
    ring: 'focus:ring-rose-500 focus:border-rose-300',
  },
  attendanceDefault: false,
  usesClassBasedSchedule: false,
  customerListTab: 'members',
  showSchoolFields: false,
  showPickupFields: false,
  levelLabel: '관리 단계',
  adminTabs: withNoticesTabs([
    'dashboard',
    'bookings',
    'services',
    'members',
    'passes',
    'retail',
    'instructors',
    'attendance',
    'settings',
  ]),
  staffTabs: withNoticesTabs(['dashboard', 'bookings', 'members', 'passes', 'retail', 'attendance']),
};
