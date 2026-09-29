import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { withNoticesTabs } from '@/core/industry/pluginTypes';
import { registerPinCheckInSideEffect } from '@/capabilities/attendance';
import './sync/registerPianoSync';
import './sync/registerEducationSync';
import { syncDayAttendanceFromPinCheckIn } from './services/pinDayAttendanceSync';
import { registerPianoStudentDetailExtension } from './studentDetailExtension';
import { PIANO_STUDENT_LEVELS } from './types/studentLevel';

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
};
