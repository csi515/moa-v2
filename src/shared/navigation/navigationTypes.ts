/**
 * Navigation tab contract.
 * UI Context(AppContext)와 분리한다. React / App state를 두지 않는다.
 */

export type CoreNavTab =
  | 'dashboard'
  | 'students'
  | 'parents'
  | 'enrollment-requests'
  | 'classes'
  | 'timetable'
  | 'attendance'
  | 'check-in'
  | 'tuition'
  | 'unpaid'
  | 'textbooks'
  | 'finance'
  | 'income'
  | 'expenses'
  | 'payroll'
  | 'makeups'
  | 'practice-rooms'
  | 'consultations'
  | 'practice'
  | 'lessons'
  | 'resources'
  | 'teachers'
  | 'calendar'
  | 'recitals'
  | 'curriculum'
  | 'assignments'
  | 'achievements'
  | 'song-stamps'
  | 'reports'
  | 'bookings'
  | 'services'
  | 'members'
  | 'instructors'
  | 'passes'
  | 'retail'
  | 'sales'
  | 'inventory'
  | 'shuttle'
  | 'journals'
  | 'medications'
  | 'notices'
  | 'settings'
  | 'account';

/**
 * 전역 Navigation Tab 타입.
 * 코어 탭 리터럴의 IDE 자동완성을 보존하면서 신규 업종 플러그인의 탭 확장을 허용하는 개방형 유니온(Open Union).
 */
export type NavTab = CoreNavTab | (string & {});

export type StudentDetailTab =
  | 'info'
  | 'classes'
  | 'attendance'
  | 'tuition'
  | 'textbooks'
  | 'consultations'
  | 'practice'
  | 'videos'
  | 'memo';

/** Phase 1 & 2: 범용 CustomerDetailTab 앨리어스 */
export type CustomerDetailTab = StudentDetailTab;
