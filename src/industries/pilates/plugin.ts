import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { withNoticesTabs } from '@/core/industry/pluginTypes';
import { pilatesExpenseCategories } from './expenseCategories';
import { pilatesPayrollExpenseCategory } from './payrollExpenseCategory';
import { pilatesBookingAdapter } from './bookingAdapter';
import { studentAttendanceCopy } from '@/core/industry/attendanceStudentCopy';

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
  attendanceSummaryMetric: 'teal',
  attendanceDefault: false,
  usesClassBasedSchedule: false,
  customerListTab: 'members',
  showSchoolFields: false,
  showPickupFields: true,
  levelLabel: '레벨',
  placeLabel: '스튜디오',
  ownerLabel: '대표',
  placeNamePlaceholder: '예: 밸런스 필라테스',
  customerLabel: '회원',
  isAppointment: true,
  publicLandingAdultFirst: true,
  feeLabel: '수강료',
  bankAccountPlaceholder: '예: 국민은행 123456-04-123456 (예금주: 스튜디오)',
  supportsDeposit: true,
  showsTextbooksLink: false,
  attendanceCopy: studentAttendanceCopy,
  runsPinCheckInSideEffects: false,
  showsMakeupList: false,
  usesWithdrawalExitLabel: false,
  savesAttendanceWithPass: false,
  showsPracticeRoomTab: false,
  showsCustomerPoints: false,
  showsAdultPracticeGuide: false,
  showsStaffPracticeGuide: false,
  roomConfig: {
    sectionTitle: '강의실 · 연습실',
    sectionDescription: '반 개설·보강 예약 시 선택할 공간입니다. 스튜디오에서 쓰는 실 이름을 등록해 주세요.',
    defaultPrefix: '강의실',
    defaultKind: 'classroom',
    placeholder: '예: 1번 룸',
    allowedKinds: ['classroom', 'practice'],
  },
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
  getExpenseCategories: pilatesExpenseCategories,
  getPayrollExpenseCategory: pilatesPayrollExpenseCategory,
  bookingAdapter: pilatesBookingAdapter,
};
