import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import type { WorkStatusMessage } from '@/shared/feedback/feedbackPolicy';

interface Props {
  status: WorkStatusMessage;
  onDismiss: () => void;
}

/** 결제/예약/등록 등 화면에 남겨야 하는 업무 결과 */
export const WorkStatusBanner: React.FC<Props> = ({ status, onDismiss }) => {
  const toneClass =
    status.tone === 'success'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
      : status.tone === 'error'
        ? 'bg-rose-50 border-rose-200 text-rose-900'
        : status.tone === 'warning'
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-sky-50 border-sky-200 text-sky-900';
  const icon =
    status.tone === 'success' ? (
      <CheckCircle2 className="w-4 h-4 shrink-0" />
    ) : status.tone === 'error' ? (
      <AlertCircle className="w-4 h-4 shrink-0" />
    ) : status.tone === 'warning' ? (
      <AlertTriangle className="w-4 h-4 shrink-0" />
    ) : (
      <Info className="w-4 h-4 shrink-0" />
    );

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 flex items-start gap-2 ${toneClass}`}
      role="status"
    >
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold">{status.title}</p>
        <p className="text-xs leading-relaxed mt-0.5">{status.message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg shrink-0"
        aria-label="결과 닫기"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
