import type { ConfirmDialogOptions } from './confirmTypes';
import { feedbackStore } from './feedbackStore';

export type ShowToast = (
  message: string,
  type?: 'success' | 'error' | 'info' | 'warning',
  title?: string
) => void;

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

export function showToast(
  message: string,
  type?: 'success' | 'error' | 'info' | 'warning',
  title?: string
) {
  feedbackStore.showToast(message, type, title);
}

export function openConfirmDialog(options: ConfirmDialogOptions) {
  feedbackStore.openConfirmDialog(options);
}

export function triggerRefresh() {
  api.triggerRefresh();
}
