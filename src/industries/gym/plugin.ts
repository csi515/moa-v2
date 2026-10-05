import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { CLASS_BASED_CORE_ADMIN_TABS, CLASS_BASED_CORE_STAFF_TABS } from '@/core/industry/pluginTypes';
import { GYM_CLASS_LEVELS } from './types/classLevel';
import { gymExpenseCategories } from './expenseCategories';
import { gymPayrollExpenseCategory } from './payrollExpenseCategory';
import { studentAttendanceCopy } from '@/core/industry/attendanceStudentCopy';

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
  placeLabel: '체육관',
  ownerLabel: '대표',
  placeNamePlaceholder: '예: 강남 체육관',
  customerLabel: '회원',
  isAppointment: false,
  feeLabel: '수강료',
  bankAccountPlaceholder: '예: 국민은행 123456-04-123456 (예금주: 체육관)',
  supportsDeposit: false,
  showsTextbooksLink: false,
  attendanceCopy: studentAttendanceCopy,
  runsPinCheckInSideEffects: false,
  roomConfig: {
    sectionTitle: '강의실 · 연습실',
    sectionDescription: '반 개설·보강 예약 시 선택할 공간입니다. 체육관에서 쓰는 실 이름을 등록해 주세요.',
    defaultPrefix: '강의실',
    defaultKind: 'classroom',
    placeholder: '예: 1실',
    allowedKinds: ['classroom', 'practice'],
  },
  adminTabs: [...CLASS_BASED_CORE_ADMIN_TABS, 'shuttle'],
  staffTabs: [...CLASS_BASED_CORE_STAFF_TABS, 'shuttle'],
  getExpenseCategories: gymExpenseCategories,
  getPayrollExpenseCategory: gymPayrollExpenseCategory,
};
