import type { ConfirmDialogOptions } from './confirmTypes';
import { feedbackStore } from './feedbackStore';
import { userFacingErrorMessage } from '@/shared/errors/userFacingError';

export interface ShowToast {
  (
    message: string,
    type?: 'success' | 'error' | 'info' | 'warning',
    title?: string
  ): void;
  error: (error: unknown, fallbackTitle?: string) => void;
  success: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  warn: (message: string, title?: string) => void;
}

type UiFeedbackApi = {
  triggerRefresh: () => void;
};

function unbound(): never {
  throw new Error('UI feedback triggerRefresh is not bound. Render inside AppProvider.');
}

let api: UiFeedbackApi = {
  triggerRefresh: unbound,
};

/** AppProvider가 triggerRefresh를 연결합니다. */
export function bindUiFeedback(next: UiFeedbackApi) {
  api = next;
}

export function unbindUiFeedback() {
  api = {
    triggerRefresh: unbound,
  };
}

function baseShowToast(
  message: string,
  type?: 'success' | 'error' | 'info' | 'warning',
  title?: string
) {
  feedbackStore.showToast(message, type, title);
}

baseShowToast.error = function (error: unknown, fallbackTitle?: string) {
  const message = userFacingErrorMessage(error, fallbackTitle);
  feedbackStore.showToast(message, 'error', fallbackTitle);
};

baseShowToast.success = function (message: string, title?: string) {
  feedbackStore.showToast(message, 'success', title);
};

baseShowToast.info = function (message: string, title?: string) {
  feedbackStore.showToast(message, 'info', title);
};

baseShowToast.warning = function (message: string, title?: string) {
  feedbackStore.showToast(message, 'warning', title);
};

baseShowToast.warn = function (message: string, title?: string) {
  feedbackStore.showToast(message, 'warning', title);
};

export const showToast: ShowToast = baseShowToast;

/**
 * 예외 객체(Error, PostgREST 에러, 네트워크 오류 등)를 분석하여
 * 사용자에게 친절하고 표준화된 한국어 에러 토스트를 표시합니다.
 */
export function showErrorToast(error: unknown, fallbackTitle?: string) {
  const message = userFacingErrorMessage(error, fallbackTitle);
  feedbackStore.showToast(message, 'error', fallbackTitle);
}

export function openConfirmDialog(options: ConfirmDialogOptions) {
  feedbackStore.openConfirmDialog(options);
}

export function triggerRefresh() {
  api.triggerRefresh();
}
