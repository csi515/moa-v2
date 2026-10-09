import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useActiveUser } from '@/shared/session/useActiveUser';
import type { FeedbackTone, WorkStatusMessage } from '@/shared/feedback/feedbackPolicy';
import type { ConfirmDialogOptions } from '@/shared/feedback/confirmTypes';
import { bindUiFeedback, unbindUiFeedback } from '@/shared/feedback/uiFeedback';
import { feedbackStore, type ToastMessage } from '@/shared/feedback/feedbackStore';
import { bindNavigationBridge, unbindNavigationBridge } from '@/shared/navigation/navigationBridge';
import type { NavTab, StudentDetailTab, CustomerDetailTab } from '@/shared/navigation/navigationTypes';
import type { User } from '@/types';

export type { NavTab, StudentDetailTab, CustomerDetailTab } from '@/shared/navigation/navigationTypes';
export type { ConfirmDialogOptions } from '@/shared/feedback/confirmTypes';

/**
 * AppContext
 * 
 * Phase 2 리팩토링:
 * - navSession.ts 제거. URL 기반 라우팅 동기화 적용.
 * - activeTab, selectedStudentId 등은 URL Path와 쿼리 스트링에서 파생됩니다.
 */

interface AppContextType {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  selectedStudentId: string | null;
  setSelectedStudentId: (id: string | null) => void;
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  selectedStudentDetailTab: StudentDetailTab | null;
  setSelectedStudentDetailTab: (tab: StudentDetailTab | null) => void;
  selectedCustomerDetailTab: StudentDetailTab | null;
  setSelectedCustomerDetailTab: (tab: StudentDetailTab | null) => void;
  currentUser: User;
  
  toasts: ToastMessage[];
  showToast: (
    message: string,
    type?: 'success' | 'error' | 'info' | 'warning',
    title?: string
  ) => void;
  dismissToast: (id: string) => void;
  
  confirmDialog: ConfirmDialogOptions | null;
  openConfirmDialog: (options: ConfirmDialogOptions) => void;
  closeConfirmDialog: () => void;
  
  workStatus: WorkStatusMessage | null;
  showWorkStatus: (input: { title: string; message: string; tone?: FeedbackTone }) => void;
  clearWorkStatus: () => void;
  
  refreshKey: number;
  triggerRefresh: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const currentUser = useActiveUser();
  const [refreshKey, setRefreshKey] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();

  // URL에서 파생된 상태
  const activeTab = useMemo<NavTab>(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts[0] === 'workspace' && parts[1]) {
      return parts[1] as NavTab;
    }
    return 'dashboard';
  }, [location.pathname]);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const selectedStudentId = searchParams.get('studentId');
  const selectedStudentDetailTab = (searchParams.get('studentTab') as StudentDetailTab) || null;

  const setActiveTab = useCallback((tab: NavTab) => {
    const target = tab === 'dashboard' ? '/workspace' : `/workspace/${tab}`;
    navigate(`${target}${location.search}`);
  }, [navigate, location.search]);

  const setSelectedStudentId = useCallback((id: string | null) => {
    const params = new URLSearchParams(location.search);
    if (id) params.set('studentId', id);
    else params.delete('studentId');
    navigate(`${location.pathname}?${params.toString()}`);
  }, [navigate, location.pathname, location.search]);

  const setSelectedStudentDetailTab = useCallback((tab: StudentDetailTab | null) => {
    const params = new URLSearchParams(location.search);
    if (tab) params.set('studentTab', tab);
    else params.delete('studentTab');
    navigate(`${location.pathname}?${params.toString()}`);
  }, [navigate, location.pathname, location.search]);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    bindUiFeedback({ triggerRefresh });
    return () => {
      unbindUiFeedback();
    };
  }, [triggerRefresh]);

  useEffect(() => {
    bindNavigationBridge({
      getActiveTab: () => activeTab,
      setActiveTab,
      getSelectedStudentId: () => selectedStudentId,
      setSelectedStudentId,
      getSelectedStudentDetailTab: () => selectedStudentDetailTab,
      setSelectedStudentDetailTab,
    });
    return () => {
      unbindNavigationBridge();
    };
  }, [
    activeTab,
    setActiveTab,
    selectedStudentId,
    setSelectedStudentId,
    selectedStudentDetailTab,
    setSelectedStudentDetailTab,
  ]);

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedStudentId,
        setSelectedStudentId,
        selectedCustomerId: selectedStudentId,
        setSelectedCustomerId: setSelectedStudentId,
        selectedStudentDetailTab,
        setSelectedStudentDetailTab,
        selectedCustomerDetailTab: selectedStudentDetailTab,
        setSelectedCustomerDetailTab: setSelectedStudentDetailTab,
        currentUser,
        
        toasts: [],
        showToast: feedbackStore.showToast,
        dismissToast: feedbackStore.dismissToast,
        
        confirmDialog: null,
        openConfirmDialog: feedbackStore.openConfirmDialog,
        closeConfirmDialog: feedbackStore.closeConfirmDialog,
        
        workStatus: null,
        showWorkStatus: feedbackStore.showWorkStatus,
        clearWorkStatus: feedbackStore.clearWorkStatus,
        
        refreshKey,
        triggerRefresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export function useOptionalApp(): AppContextType | null {
  return useContext(AppContext) ?? null;
}
