import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useActiveUser } from '@/shared/session/useActiveUser';
import type { FeedbackTone, WorkStatusMessage } from '@/shared/feedback/feedbackPolicy';
import type { ConfirmDialogOptions } from '@/shared/feedback/confirmTypes';
import { bindUiFeedback, unbindUiFeedback } from '@/shared/feedback/uiFeedback';
import { feedbackStore, type ToastMessage } from '@/shared/feedback/feedbackStore';
import type { NavTab, StudentDetailTab, CustomerDetailTab } from '@/shared/navigation/navigationTypes';
import { useNavSession } from '@/shared/navigation/navSession';
import type { User } from '@/types';

export type { NavTab, StudentDetailTab, CustomerDetailTab } from '@/shared/navigation/navigationTypes';
export type { ConfirmDialogOptions } from '@/shared/feedback/confirmTypes';

/**
 * AppContext
 * 
 * Phase 1 리팩토링:
 * UI State(toasts, dialog, workStatus)는 AppContext에서 제거되어 상태 변경 시의 전역 렌더링을 방지합니다.
 * 하위 호환성을 위해 함수 인터페이스(showToast 등)만 유지하며, 실제 상태는 feedbackStore가 관리합니다.
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
  
  // @deprecated - 상태가 분리되었으므로 항상 빈 배열을 반환합니다. 렌더링에는 사용하지 마세요.
  toasts: ToastMessage[];
  showToast: (
    message: string,
    type?: 'success' | 'error' | 'info' | 'warning',
    title?: string
  ) => void;
  dismissToast: (id: string) => void;
  
  // @deprecated - 항상 null을 반환합니다.
  confirmDialog: ConfirmDialogOptions | null;
  openConfirmDialog: (options: ConfirmDialogOptions) => void;
  closeConfirmDialog: () => void;
  
  // @deprecated - 항상 null을 반환합니다.
  workStatus: WorkStatusMessage | null;
  showWorkStatus: (input: { title: string; message: string; tone?: FeedbackTone }) => void;
  clearWorkStatus: () => void;
  
  refreshKey: number;
  triggerRefresh: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    activeTab,
    setActiveTab,
    selectedStudentId,
    setSelectedStudentId,
    selectedStudentDetailTab,
    setSelectedStudentDetailTab,
  } = useNavSession();
  const currentUser = useActiveUser();
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    bindUiFeedback({ triggerRefresh });
    return () => {
      unbindUiFeedback();
    };
  }, [triggerRefresh]);

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
