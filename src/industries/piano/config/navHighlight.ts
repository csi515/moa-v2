import type { NavTab } from '@/context/AppContext';
import { resolveNavHighlightTab } from '@/core/auth/navUtils';
import { PIANO_SETTINGS_EXTRAS } from './nav';
import {
  PIANO_ATTENDANCE_HUB_TABS,
  PIANO_CUSTOMER_HUB_TABS,
  PIANO_FINANCE_HUB_TABS,
  PIANO_SCHEDULE_HUB_TABS,
  PIANO_SETTINGS_HUB_TABS,
  isTabInHub,
} from './hubRoutes';
import { PIANO_ROOM_ENTRY_TABS } from './pianoScheduleRoutes';

/**
 * 설정「부가」탭 중 일정 허브(연습실)에 속한 것 — 설정으로 하이라이트하지 않음.
 */
const SETTINGS_EXTRAS_DEFER_TO_OTHER_HUB = new Set<NavTab>(PIANO_ROOM_ENTRY_TABS);

const PIANO_SETTINGS_EXTRA_TABS = new Set(
  PIANO_SETTINGS_EXTRAS.map((item) => item.tab).filter(
    (tab) => !SETTINGS_EXTRAS_DEFER_TO_OTHER_HUB.has(tab)
  )
);

/**
 * 피아노 네비 하이라이트 — hubRoutes·설정 부가와 맞춤.
 * Core resolveNavHighlightTab을 확장 (passes→members 등 타업종 규칙을 피아노에서 덮어씀).
 */
export function resolvePianoNavHighlightTab(tab: NavTab): NavTab {
  if (tab === 'teachers' || tab === 'instructors' || tab === 'staff') return 'teachers';
  if (isTabInHub(tab, PIANO_CUSTOMER_HUB_TABS)) return 'students';
  if (isTabInHub(tab, PIANO_ATTENDANCE_HUB_TABS)) return 'attendance';
  if (isTabInHub(tab, PIANO_SCHEDULE_HUB_TABS)) return 'timetable';
  // 수납(tuition, unpaid)과 재무 관리(income, expenses, payroll, overview) 분리
  if (tab === 'tuition' || tab === 'unpaid') return 'tuition';
  if (isTabInHub(tab, PIANO_FINANCE_HUB_TABS)) return 'finance';
  if (isTabInHub(tab, PIANO_SETTINGS_HUB_TABS)) return 'settings';
  if (PIANO_SETTINGS_EXTRA_TABS.has(tab)) return 'settings';
  return resolveNavHighlightTab(tab);
}

export function isPianoNavItemActive(itemTab: NavTab, activeTab: NavTab): boolean {
  return resolvePianoNavHighlightTab(activeTab) === itemTab || activeTab === itemTab;
}
