import React from 'react';
import { Ban, CheckCircle, Clock, XCircle } from 'lucide-react';
import {
  ENROLLMENT_REQUEST_STATUS_LABELS,
  type EnrollmentRequestInfo,
} from '@/core/parent/types/globalParent';

export const ParentEnrollmentStatusCard: React.FC<{
  request: EnrollmentRequestInfo;
  onCancel: () => void;
}> = ({ request, onCancel }) => {
  const statusIcon = {
    pending: <Clock className="w-4 h-4 text-amber-600" />,
    approved: <CheckCircle className="w-4 h-4 text-green-600" />,
    rejected: <XCircle className="w-4 h-4 text-rose-600" />,
    cancelled: <Ban className="w-4 h-4 text-slate-400" />,
  }[request.status];

  const statusColor = {
    pending: 'bg-amber-50 border-amber-200 text-amber-900',
    approved: 'bg-green-50 border-green-200 text-green-900',
    rejected: 'bg-rose-50 border-rose-200 text-rose-900',
    cancelled: 'bg-slate-50 border-slate-200 text-slate-600',
  }[request.status];

  return (
    <div className={`p-4 rounded-xl border ${statusColor}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {statusIcon}
            <p className="text-xs font-bold uppercase">
              {ENROLLMENT_REQUEST_STATUS_LABELS[request.status]}
            </p>
          </div>
          <p className="font-bold text-sm truncate">{request.organizationName}</p>
          <p className="text-xs mt-0.5">자녀: {request.studentName}</p>
          <p className="text-xs text-slate-500 mt-1">
            요청일: {new Date(request.requestedAt).toLocaleDateString('ko-KR')}
          </p>
          {request.rejectionReason && (
            <p className="text-xs mt-2 p-2 bg-white/50 rounded">
              거절 사유: {request.rejectionReason}
            </p>
          )}
        </div>
        {request.status === 'pending' && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white rounded-lg hover:bg-slate-100 transition-colors shrink-0 min-h-[44px]"
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
};
