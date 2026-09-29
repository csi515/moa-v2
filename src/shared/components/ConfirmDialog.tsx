import React, { useEffect } from 'react';
import { useOptionalApp, type ConfirmDialogOptions } from '@/context/AppContext';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './ui/Modal';

interface ConfirmDialogProps {
  options?: ConfirmDialogOptions | null;
  onDismiss?: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ options, onDismiss }) => {
  const app = useOptionalApp();
  const confirmDialog = options !== undefined ? options : app?.confirmDialog ?? null;
  const closeConfirmDialog = onDismiss ?? app?.closeConfirmDialog ?? (() => {});

  useEffect(() => {
    if (!confirmDialog) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      confirmDialog.onCancel?.();
      closeConfirmDialog();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmDialog, closeConfirmDialog]);

  if (!confirmDialog) return null;

  const handleCancel = () => {
    confirmDialog.onCancel?.();
    closeConfirmDialog();
  };

  return (
    <Modal isOpen onClose={handleCancel} title={confirmDialog.title} maxWidth="sm">
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              confirmDialog.isDestructive ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
            }`}
          >
            <AlertTriangle className="w-6 h-6" aria-hidden />
          </div>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line pt-1">
            {confirmDialog.message}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2.5 min-h-[44px] text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            {confirmDialog.cancelText || '취소'}
          </button>
          {confirmDialog.altText ? (
            <button
              type="button"
              onClick={() => {
                confirmDialog.onAlt?.();
              }}
              className="px-4 py-2.5 min-h-[44px] text-sm font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
            >
              {confirmDialog.altText}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              confirmDialog.onConfirm();
              closeConfirmDialog();
            }}
            className={`px-5 py-2.5 min-h-[44px] text-sm font-bold text-white rounded-xl transition-colors shadow-sm ${
              confirmDialog.isDestructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {confirmDialog.confirmText || '확인'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
