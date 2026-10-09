/**
 * Decoupled Navigation Bridge for MOA v2
 *
 * Architecture Boundary Rule:
 * Core and Capability layers MUST NOT import from '@/context/AppContext'.
 * This bridge provides pure decoupled navigation functions and binding
 * so capabilities can navigate without tight coupling to AppContext.
 */

import type { NavTab, StudentDetailTab } from './navigationTypes';

export interface NavigationBridgeApi {
  getActiveTab?: () => NavTab;
  setActiveTab: (tab: NavTab) => void;
  getSelectedStudentId?: () => string | null;
  setSelectedStudentId?: (id: string | null) => void;
  getSelectedStudentDetailTab?: () => StudentDetailTab | null;
  setSelectedStudentDetailTab?: (tab: StudentDetailTab | null) => void;
  openStudent?: (studentId: string, tab?: StudentDetailTab) => void;
}

let bridgeApi: NavigationBridgeApi | null = null;
const listeners = new Set<() => void>();

export function bindNavigationBridge(api: NavigationBridgeApi): void {
  bridgeApi = api;
  listeners.forEach((l) => l());
}

export function unbindNavigationBridge(): void {
  bridgeApi = null;
  listeners.forEach((l) => l());
}

export function subscribeNavigationBridge(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getActiveTab(): NavTab {
  return bridgeApi?.getActiveTab?.() ?? 'dashboard';
}

export function setActiveTab(tab: NavTab): void {
  if (bridgeApi) {
    bridgeApi.setActiveTab(tab);
  } else if (typeof window !== 'undefined') {
    window.location.hash = `#${tab}`;
  }
}

export function getSelectedStudentId(): string | null {
  return bridgeApi?.getSelectedStudentId?.() ?? null;
}

export function setSelectedStudentId(id: string | null): void {
  bridgeApi?.setSelectedStudentId?.(id);
}

export function setSelectedStudentDetailTab(tab: StudentDetailTab | null): void {
  bridgeApi?.setSelectedStudentDetailTab?.(tab);
}

export function openStudent(studentId: string, tab?: StudentDetailTab): void {
  if (bridgeApi?.openStudent) {
    bridgeApi.openStudent(studentId, tab);
  } else {
    if (tab && bridgeApi?.setSelectedStudentDetailTab) {
      bridgeApi.setSelectedStudentDetailTab(tab);
    }
    if (bridgeApi?.setSelectedStudentId) {
      bridgeApi.setSelectedStudentId(studentId);
    }
    setActiveTab('students');
  }
}
