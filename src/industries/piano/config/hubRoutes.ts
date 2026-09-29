import type { NavTab } from '@/context/AppContext';
import { customerHubTabs, settingsHubTabs } from '@/core/industry/commonViewEntries';

/**
 * 피아노 허브 딥링크 — VIEW_MAP alias와 네비 하이라이트가 동일 목록을 사용한다.
 * (탭 문자열을 바꾸지 않고, 동일 화면에 여러 이름으로 진입)
 */

/** 고객 허브 (CustomerHubView) */
export const PIANO_CUSTOMER_HUB_TABS = customerHubTabs;

/** 출결 허브 (PianoAttendanceView) — lessons는 레거시 딥링크 유지 */
export const PIANO_ATTENDANCE_HUB_TABS = ['attendance', 'lessons'] as const satisfies readonly NavTab[];

/** 일정 허브 (PianoScheduleView) */
export const PIANO_SCHEDULE_HUB_TABS = [
  'timetable',
  'calendar',
  'makeups',
  'practice-rooms',
] as const satisfies readonly NavTab[];

/** 설정 허브 (SettingsHubView) */
export const PIANO_SETTINGS_HUB_TABS = settingsHubTabs;

/** 재무 허브 (FinanceHubView) */
export const PIANO_FINANCE_HUB_TABS = [
  'finance',
  'income',
  'expenses',
  'tuition',
  'unpaid',
  'payroll',
] as const satisfies readonly NavTab[];

export function isTabInHub(tab: string, hub: readonly string[]): boolean {
  return hub.includes(tab);
}
