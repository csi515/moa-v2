import React from 'react';
import { Archive } from 'lucide-react';
import {
  ENROLLMENT_STATUS_LABELS,
  getReadOnlyEnrollmentMessage,
  type EnrollmentStatus,
} from '@/core/parent/types/globalParent';

export function ParentReadOnlyBanner({
  status,
  leftAt,
}: {
  status: EnrollmentStatus;
  leftAt?: string | null;
}) {
  const message = getReadOnlyEnrollmentMessage(status);
  if (!message) return null;

  return (
    <div className="mb-4 p-3 rounded-xl bg-slate-100 border border-slate-200 flex gap-2">
      <Archive className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-700">
          {ENROLLMENT_STATUS_LABELS[status]} 기록 보관함
        </p>
        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{message}</p>
        {leftAt && (
          <p className="text-[11px] text-slate-500 mt-1 font-mono">처리일 · {leftAt}</p>
        )}
      </div>
    </div>
  );
}
