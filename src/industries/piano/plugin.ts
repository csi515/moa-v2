import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { withNoticesTabs } from '@/core/industry/pluginTypes';
import { registerPinCheckInSideEffect } from '@/capabilities/attendance';
import './sync/registerPianoSync';
import './sync/registerEducationSync';
import { syncDayAttendanceFromPinCheckIn } from './services/pinDayAttendanceSync';
import { registerPianoStudentDetailExtension } from './studentDetailExtension';
import { PIANO_STUDENT_LEVELS } from './types/studentLevel';
import { pianoExpenseCategories } from './expenseCategories';
import { pianoPayrollExpenseCategory } from './payrollExpenseCategory';
import { pianoFinanceHubNav } from './financeHubNav';
import { studentAttendanceCopy } from '@/core/industry/attendanceStudentCopy';

/** 피아노 PIN 체크인 → 당일 등원(DAY_ATTENDANCE) 동기화 (Core 키오스크는 Module을 import하지 않음) */
registerPinCheckInSideEffect(syncDayAttendanceFromPinCheckIn);
/** 학생 상세 — 교재·완곡·회차권 등 (Core는 Module을 import하지 않음) */
registerPianoStudentDetailExtension();

/** 피아노학원 플러그인 매니페스트 (풀 기능) */
export const pianoPluginManifest: IndustryPluginManifest = {
  id: 'piano',
  option: {
    value: 'piano',
    label: '피아노학원',
    description: '학생·출결·수강료·교재 중심 운영',
  },
  theme: 'indigo',
  accent: {
    btn: 'bg-indigo-600',
    btnHover: 'hover:bg-indigo-700',
    icon: 'text-indigo-600',
    hoverBg: 'hover:bg-indigo-50',
    ring: 'focus:ring-indigo-500 focus:border-indigo-300',
  },
  attendanceDefault: false,
  usesClassBasedSchedule: true,
  customerListTab: 'students',
  showSchoolFields: true,
  showPickupFields: false,
  syncCapabilities: ['piano', 'education'],
  levelLabel: '레벨',
  levelOptions: PIANO_STUDENT_LEVELS,
  placeLabel: '학원',
  ownerLabel: '원장',
  placeNamePlaceholder: '예: 행복 피아노 학원',
  customerLabel: '원생',
  isAppointment: false,
  feeLabel: '수강료',
  bankAccountPlaceholder: '예: 국민은행 123456-04-123456 (예금주: 선율음악학원)',
  supportsDeposit: false,
  showsTextbooksLink: true,
  attendanceCopy: studentAttendanceCopy,
  runsPinCheckInSideEffects: true,
  showsMakeupList: true,
  usesWithdrawalExitLabel: true,
  savesAttendanceWithPass: true,
  rosterList: {
    searchPlaceholder: '학생·학부모 이름 또는 전화번호',
    filterButtonAriaLabel: '추가 필터 (담당 선생님, 반, 요일, 정렬)',
    showFilterFieldLabels: true,
    staffFilterLabel: '담당 선생님',
    controlMinHeight: 44,
    fitAdvancedFilterGrid: true,
    showSessionColumns: true,
  },
  roomConfig: {
    sectionTitle: '강의실 · 연습실',
    sectionDescription: '반 개설·보강 예약 시 선택할 공간입니다. 학원에서 쓰는 실 이름을 등록해 주세요.',
    defaultPrefix: '강의실',
    defaultKind: 'classroom',
    placeholder: '예: 피아노 1실',
    allowedKinds: ['classroom', 'practice'],
  },
  adminTabs: withNoticesTabs([
    'dashboard',
    'students',
    'parents',
    'enrollment-requests',
    'classes',
    'timetable',
    'attendance',
    'check-in',
    'makeups',
    'practice-rooms',
    'lessons',
    'practice',
    'consultations',
    /** 상담 가능시간 설정 (설정 → 부가) */
    'bookings',
    // resources: UI 숨김(nav) — VIEW_MAP·ResourceManagementView·SONGS 데이터는 유지
    'finance',
    'income',
    'expenses',
    'tuition',
    'unpaid',
    'payroll',
    'passes',
    'textbooks',
    'teachers',
    'calendar',
    'recitals',
    'settings',
    'curriculum',
    'assignments',
    'achievements',
    'song-stamps',
    'reports',
  ]),
  staffTabs: withNoticesTabs([
    'dashboard',
    'students',
    'timetable',
    'attendance',
    'makeups',
    'lessons',
    'practice',
    'consultations',
    'bookings',
    'calendar',
    'recitals',
    'curriculum',
    'assignments',
    'achievements',
    'song-stamps',
    'reports',
  ]),
  getExpenseCategories: pianoExpenseCategories,
  getPayrollExpenseCategory: pianoPayrollExpenseCategory,
  financeHubNav: pianoFinanceHubNav,
};
