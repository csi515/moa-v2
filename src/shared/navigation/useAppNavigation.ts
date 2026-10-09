import { useState, useEffect, useCallback } from 'react';
import type { NavTab, StudentDetailTab } from './navigationTypes';
import {
  getActiveTab,
  setActiveTab as bridgeSetActiveTab,
  getSelectedStudentId,
  setSelectedStudentId as bridgeSetSelectedStudentId,
  openStudent as bridgeOpenStudent,
  subscribeNavigationBridge,
} from './navigationBridge';

/**
 * React hook for navigation without importing @/context/AppContext.
 * Safe to use anywhere in Core, Capability, and Shared layers.
 */
export function useAppNavigation() {
  const [activeTab, setLocalTab] = useState<NavTab>(getActiveTab);
  const [selectedStudentId, setLocalStudentId] = useState<string | null>(getSelectedStudentId);

  useEffect(() => {
    return subscribeNavigationBridge(() => {
      setLocalTab(getActiveTab());
      setLocalStudentId(getSelectedStudentId());
    });
  }, []);

  const setActiveTab = useCallback((tab: NavTab) => {
    bridgeSetActiveTab(tab);
    setLocalTab(tab);
  }, []);

  const setSelectedStudentId = useCallback((id: string | null) => {
    bridgeSetSelectedStudentId(id);
    setLocalStudentId(id);
  }, []);

  const openStudent = useCallback((studentId: string, tab?: StudentDetailTab) => {
    bridgeOpenStudent(studentId, tab);
  }, []);

  return {
    activeTab,
    setActiveTab,
    selectedStudentId,
    setSelectedStudentId,
    openStudent,
  };
}
