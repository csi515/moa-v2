import { useSyncExternalStore } from 'react';
import type { ConfirmDialogOptions } from './confirmTypes';
import { nextWorkStatusId, type WorkStatusMessage, type FeedbackTone } from './feedbackPolicy';

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface FeedbackState {
  toasts: ToastMessage[];
  confirmDialog: ConfirmDialogOptions | null;
  workStatus: WorkStatusMessage | null;
}

let state: FeedbackState = {
  toasts: [],
  confirmDialog: null,
  workStatus: null,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

export const feedbackStore = {
  getState: getSnapshot,
  
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success', title?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    const updated = [...state.toasts, { id, message, type, title }];
    state = { ...state, toasts: updated.slice(-2) }; // MAX_VISIBLE_TOASTS = 2
    emit();
    
    setTimeout(() => {
      state = { ...state, toasts: state.toasts.filter((t) => t.id !== id) };
      emit();
    }, 4000);
  },
  
  dismissToast: (id: string) => {
    state = { ...state, toasts: state.toasts.filter((t) => t.id !== id) };
    emit();
  },
  
  openConfirmDialog: (options: ConfirmDialogOptions) => {
    state = { ...state, confirmDialog: options };
    emit();
  },
  
  closeConfirmDialog: () => {
    state = { ...state, confirmDialog: null };
    emit();
  },
  
  showWorkStatus: (input: { title: string; message: string; tone?: FeedbackTone }) => {
    state = {
      ...state,
      workStatus: {
        id: nextWorkStatusId(),
        title: input.title,
        message: input.message,
        tone: input.tone ?? 'info',
      }
    };
    emit();
  },
  
  clearWorkStatus: () => {
    state = { ...state, workStatus: null };
    emit();
  }
};

export function useFeedbackStore() {
  const storeState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    ...storeState,
    showToast: feedbackStore.showToast,
    dismissToast: feedbackStore.dismissToast,
    openConfirmDialog: feedbackStore.openConfirmDialog,
    closeConfirmDialog: feedbackStore.closeConfirmDialog,
    showWorkStatus: feedbackStore.showWorkStatus,
    clearWorkStatus: feedbackStore.clearWorkStatus,
  };
}
