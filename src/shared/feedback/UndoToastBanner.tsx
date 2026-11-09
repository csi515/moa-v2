import React from 'react';
import { RotateCcw, X } from 'lucide-react';

export interface UndoToastBannerProps {
  activeUndo: {
    id: string;
    message: string;
    undo: () => void;
  } | null;
  onDismiss: () => void;
  className?: string;
}

export const UndoToastBanner: React.FC<UndoToastBannerProps> = ({
  activeUndo,
  onDismiss,
  className = '',
}) => {
  if (!activeUndo) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-200 ${className}`}
    >
      <div className="bg-slate-900/95 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3.5">
        <span className="text-xs sm:text-sm font-semibold">{activeUndo.message}</span>
        <button
          type="button"
          onClick={activeUndo.undo}
          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>실행 취소</span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          aria-label="닫기"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
