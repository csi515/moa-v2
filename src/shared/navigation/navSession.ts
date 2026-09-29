import { useSyncExternalStore } from 'react';
import type { NavTab, StudentDetailTab } from './navigationTypes';

export type { StudentDetailTab } from './navigationTypes';

type NavSessionSnapshot = {
  activeTab: NavTab;
  selectedStudentId: string | null;
  selectedStudentDetailTab: StudentDetailTab | null;
};

let snapshot: NavSessionSnapshot = {
  activeTab: 'dashboard',
  selectedStudentId: null,
  selectedStudentDetailTab: null,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeNavSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNavSessionSnapshot(): NavSessionSnapshot {
  return snapshot;
}

const WORK_SCROLL_ROOT = '[data-work-scroll-root]';

/** 업무 탭 전환 시 새 화면을 상단에서 시작. 상세 내부 탭은 activeTab을 바꾸지 않는다. */
function resetWorkTabScroll() {
  if (typeof window === 'undefined') return;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  document.querySelectorAll<HTMLElement>(WORK_SCROLL_ROOT).forEach((el) => {
    el.scrollTop = 0;
  });
}

export function setActiveTab(tab: NavTab) {
  if (snapshot.activeTab === tab) return;
  snapshot = { ...snapshot, activeTab: tab };
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(resetWorkTabScroll);
  }
  emit();
}

export function setSelectedStudentId(id: string | null) {
  if (snapshot.selectedStudentId === id) return;
  snapshot = { ...snapshot, selectedStudentId: id };
  emit();
}

export function setSelectedStudentDetailTab(tab: StudentDetailTab | null) {
  if (snapshot.selectedStudentDetailTab === tab) return;
  snapshot = { ...snapshot, selectedStudentDetailTab: tab };
  emit();
}

/** Navigation UI state. AppContext와 같은 스냅샷을 읽는다. */
export function useNavSession() {
  const state = useSyncExternalStore(
    subscribeNavSession,
    getNavSessionSnapshot,
    getNavSessionSnapshot
  );
  return {
    ...state,
    setActiveTab,
    setSelectedStudentId,
    setSelectedStudentDetailTab,
  };
}
