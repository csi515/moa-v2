import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useActiveUser } from '@/shared/session/useActiveUser';
import {
  MAX_VISIBLE_TOASTS,
  nextWorkStatusId,
  type FeedbackTone,
  type WorkStatusMessage,
} from '@/shared/feedback/feedbackPolicy';
import type { ConfirmDialogOptions } from '@/shared/feedback/confirmTypes';
import { bindUiFeedback, unbindUiFeedback } from '@/shared/feedback/uiFeedback';
import type { NavTab, StudentDetailTab } from '@/shared/navigation/navigationTypes';
import { useNavSession } from '@/shared/navigation/navSession';
import type { User } from '@/types';

export type { NavTab, StudentDetailTab } from '@/shared/navigation/navigationTypes';
export type { ConfirmDialogOptions } from '@/shared/feedback/confirmTypes';

/**
 * AppContext 역할:
 * - UI state: activeTab, selectedStudent*, toast, dialog (탭/학생은 nav session SoT)
 * - session user mirror: currentUser (ACTIVE_USER 변경 시만 갱신)
 * - triggerRefresh / refreshKey: 명시적 전체 UI 무효화(설정 저장 등). storage 매 write마다 올리지 않음.
 *
 * Domain data(students/bookings/…)는 AppContext에 두지 않음 → useStorageRefresh(domain) 구독.
 */

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface AppContextType {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  selectedStudentId: string | null;
  setSelectedStudentId: (id: string | null) => void;
  selectedStudentDetailTab: StudentDetailTab | null;
  setSelectedStudentDetailTab: (tab: StudentDetailTab | null) => void;
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
  /**
   * 결제/예약/등록처럼 화면에 남겨야 하는 결과.
   * 짧은 성공/경고는 showToast, 필드 수정은 FormField.error.
   */
  workStatus: WorkStatusMessage | null;
  showWorkStatus: (input: { title: string; message: string; tone?: FeedbackTone }) => void;
  clearWorkStatus: () => void;
  /**
   * 명시적 전역 UI 무효화 카운터.
   * StorageService 매 변경으로 증가하지 않음 — triggerRefresh() 또는 hydrate('*') 연동 화면만.
   */
  refreshKey: number;
  /** 설정 저장·교차 탭 등 storage 키 구독만으로 부족한 경우의 명시적 갱신 */
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
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogOptions | null>(null);
  const [workStatus, setWorkStatus] = useState<WorkStatusMessage | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const showToast = useCallback(
    (
      message: string,
      type: 'success' | 'error' | 'info' | 'warning' = 'success',
      title?: string
    ) => {
      const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
      setToasts((prev) => [...prev, { id, message, type, title }].slice(-MAX_VISIBLE_TOASTS));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const openConfirmDialog = useCallback((options: ConfirmDialogOptions) => {
    setConfirmDialog(options);
  }, []);

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  useEffect(() => {
    bindUiFeedback({ showToast, openConfirmDialog, triggerRefresh });
    return () => {
      unbindUiFeedback();
    };
  }, [showToast, openConfirmDialog, triggerRefresh]);

  const showWorkStatus = useCallback(
    (input: { title: string; message: string; tone?: FeedbackTone }) => {
      setWorkStatus({
        id: nextWorkStatusId(),
        title: input.title,
        message: input.message,
        tone: input.tone ?? 'info',
      });
    },
    []
  );

  const clearWorkStatus = useCallback(() => {
    setWorkStatus(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedStudentId,
        setSelectedStudentId,
        selectedStudentDetailTab,
        setSelectedStudentDetailTab,
        currentUser,
        toasts,
        showToast,
        dismissToast,
        confirmDialog,
        openConfirmDialog,
        closeConfirmDialog,
        workStatus,
        showWorkStatus,
        clearWorkStatus,
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
