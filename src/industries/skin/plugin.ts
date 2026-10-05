import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { withNoticesTabs } from '@/core/industry/pluginTypes';
import { registerSkinStudentDetailExtension } from './studentDetailExtension';
import './registerStaffSettings';
import { skinExpenseCategories } from './expenseCategories';
import { skinPayrollExpenseCategory } from './payrollExpenseCategory';
import { skinBookingAdapter } from './bookingAdapter';
import { skinAttendanceCopy } from './attendanceCopy';

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
  attendanceSummaryMetric: 'rose',
  attendanceDefault: false,
  usesClassBasedSchedule: false,
  customerListTab: 'members',
  showSchoolFields: false,
  showPickupFields: false,
  levelLabel: '관리 단계',
  placeLabel: '샵',
  ownerLabel: '대표',
  placeNamePlaceholder: '예: 하루 피부관리',
  customerLabel: '고객',
  isAppointment: true,
  publicLandingAdultFirst: true,
  feeLabel: '이용료',
  bankAccountPlaceholder: '예: 국민은행 123456-04-123456 (예금주: 샵 이름)',
  supportsDeposit: true,
  showsTextbooksLink: false,
  attendanceCopy: skinAttendanceCopy,
  runsPinCheckInSideEffects: false,
  showsMakeupList: false,
  usesWithdrawalExitLabel: false,
  savesAttendanceWithPass: false,
  showsPracticeRoomTab: false,
  showsCustomerPoints: false,
  rosterList: {
    withdrawnLabel: '종료',
    filterEmptyUsesSearchHint: true,
  },
  roomConfig: {
    sectionTitle: '관리실',
    sectionDescription: '예약 시 배정할 관리실 이름을 등록해 주세요.',
    defaultPrefix: '관리실',
    defaultKind: 'treatment',
    placeholder: '예: 1번 관리실',
    allowedKinds: ['treatment'],
  },
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
  getExpenseCategories: skinExpenseCategories,
  getPayrollExpenseCategory: skinPayrollExpenseCategory,
  bookingAdapter: skinBookingAdapter,
};
