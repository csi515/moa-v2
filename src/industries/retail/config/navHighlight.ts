import type { NavTab } from '@/context/AppContext';

/**
 * 소매업 내비 하이라이트.
 * 공통 resolveNavHighlightTab의 instructors→settings 매핑을 쓰지 않아
 * 더보기「직원」「설정」이 서로 덮이지 않게 한다.
 */
export function resolveRetailNavHighlightTab(tab: NavTab): NavTab {
  if (tab === 'account' || tab === 'notices') return 'settings';
  return tab;
}
