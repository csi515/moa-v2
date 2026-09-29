import type { ConfirmDialogOptions } from './confirmTypes';

export type ShowToast = (
  message: string,
  type?: 'success' | 'error' | 'info' | 'warning',
  title?: string
) => void;

type UiFeedbackApi = {
  showToast: ShowToast;
  openConfirmDialog: (options: ConfirmDialogOptions) => void;
  triggerRefresh: () => void;
};

function unbound(): never {
  throw new Error('UI feedback is not bound. Render inside AppProvider.');
}

let api: UiFeedbackApi = {
  showToast: unbound,
  openConfirmDialog: unbound,
  triggerRefresh: unbound,
};

/** AppProvider가 toast/confirm/refresh 구현을 연결한다. */
export function bindUiFeedback(next: UiFeedbackApi) {
  api = next;
}

export function unbindUiFeedback() {
  api = {
    showToast: unbound,
    openConfirmDialog: unbound,
    triggerRefresh: unbound,
  };
}

export function showToast(
  message: string,
  type?: 'success' | 'error' | 'info' | 'warning',
  title?: string
) {
  api.showToast(message, type, title);
}

export function openConfirmDialog(options: ConfirmDialogOptions) {
  api.openConfirmDialog(options);
}

export function triggerRefresh() {
  api.triggerRefresh();
}
