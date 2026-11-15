import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import type { ConfirmDialogOptions, OverlayComponentProps } from './types';

export interface StandardConfirmModalProps
  extends ConfirmDialogOptions,
    OverlayComponentProps<boolean> {}

export const StandardConfirmModal: React.FC<StandardConfirmModalProps> = ({
  isOpen,
  close,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  isDestructive = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => close(false)}
      title={title}
      maxWidth="sm"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            onClick={() => close(false)}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-3 py-1">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isDestructive
              ? 'bg-rose-50 text-rose-600'
              : 'bg-indigo-50 text-indigo-600'
          }`}
        >
          {isDestructive ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <HelpCircle className="w-5 h-5" />
          )}
        </div>
        <div className="text-sm text-slate-700 leading-relaxed pt-1 whitespace-pre-line">
          {message}
        </div>
      </div>
    </Modal>
  );
};
