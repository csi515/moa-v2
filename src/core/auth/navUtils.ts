import type { ReactNode } from 'react';
import type { NavTab } from '@/shared/navigation/navigationTypes';

export const MORE_NAV_SECTION = {
  work: '업무',
  manage: '관리',
  settings: '설정',
} as const;

export interface NavMenuItem {
  tab: NavTab;
  label: string;
  icon: ReactNode;
  /** More 시트 그룹. 없으면 기존처럼 단일 목록 */
  section?: string;
}

export interface NavMenuSection {
  title: string;
  items: NavMenuItem[];
}

/** 허용된 탭만 남기고 빈 섹션 제거 */
export function filterNavSections(
  sections: NavMenuSection[],
  allowedTabs: NavTab[]
): NavMenuSection[] {
  const allowed = new Set(allowedTabs);
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => allowed.has(item.tab)),
    }))
    .filter((section) => section.items.length > 0);
}

/** 탭 목록 필터 */
export function filterNavTabs<T extends { tab: NavTab }>(items: T[], allowedTabs: NavTab[]): T[] {
  const allowed = new Set(allowedTabs);
  return items.filter((item) => allowed.has(item.tab));
}

/** More 항목을 section 순서로 묶는다. section이 없으면 제목 없는 단일 그룹. */
export function groupMoreNavItems(items: NavMenuItem[]): NavMenuSection[] {
  if (items.length === 0) return [];
  if (!items.some((item) => item.section)) {
    return [{ title: '', items }];
  }
  const order: string[] = [];
  const grouped = new Map<string, NavMenuItem[]>();
  for (const item of items) {
    const title = item.section || '';
    if (!grouped.has(title)) {
      grouped.set(title, []);
      order.push(title);
    }
    grouped.get(title)!.push(item);
  }
  return order.map((title) => ({ title, items: grouped.get(title)! }));
}

/**
 * 허브 하위·레거시 딥링크 → 사이드바·하단 네비 하이라이트용 대표 탭
 * (화면은 VIEW_MAP 별칭으로 동일 허브에 연결)
 *
 * 피아노는 industries/piano/config/navHighlight.ts 가 이 함수를 확장한다.
 * - lessons → attendance (레거시「레슨」딥링크)
 * - calendar/makeups/practice-rooms → timetable
 * - tuition/unpaid/… → finance
 */
export function resolveNavHighlightTab(tab: NavTab): NavTab {
  switch (tab) {
    case 'income':
    case 'expenses':
    case 'tuition':
    case 'unpaid':
    case 'payroll':
      return 'finance';
    case 'parents':
    case 'enrollment-requests':
      return 'students';
    case 'passes':
      return 'members';
    case 'calendar':
    case 'makeups':
    case 'practice-rooms':
      return 'timetable';
    /** 구「레슨」딥링크 — 출결 화면으로 통합됨 (탭명 lessons 유지) */
    case 'lessons':
      return 'attendance';
    case 'check-in':
    case 'teachers':
    case 'instructors':
    case 'notices':
    case 'account':
      return 'settings';
    case 'services':
      return 'bookings';
    case 'medications':
      return 'journals';
    default:
      return tab;
  }
}

/** 네비 항목이 현재 활성 허브에 속하는지 */
export function isNavItemActive(itemTab: NavTab, activeTab: NavTab): boolean {
  return resolveNavHighlightTab(activeTab) === itemTab || activeTab === itemTab;
}
