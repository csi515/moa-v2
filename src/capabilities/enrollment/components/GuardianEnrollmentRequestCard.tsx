import React, { useState } from 'react';
import { Calendar, CheckCircle, Loader2, Mail, Phone, User, XCircle } from 'lucide-react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import type { GuardianEnrollmentRequest } from '@/core/parent/services/enrollmentRequestService';
import { GUARDIAN_RELATIONSHIP_LABELS } from '@/core/parent/types';
import { SHARED_CHILD_FIELD_LABELS, type SharedChildField } from '@/core/parent/services/parentChildService';
import { useModuleLabels } from '@/core/labels';

function sharedFieldValue(field: SharedChildField, request: GuardianEnrollmentRequest): string {
  if (field === 'display_name') return request.studentName;
  if (field === 'birth_date') {
    return request.birthDate ? new Date(request.birthDate).toLocaleDateString('ko-KR') : '미입력';
  }
  if (field === 'gender') {
    if (request.gender === 'M') return '남';
    if (request.gender === 'F') return '여';
    return '미입력';
  }
  if (field === 'school') return request.school || '미입력';
  return request.grade || '미입력';
}

const SharedProfilePreview: React.FC<{ request: GuardianEnrollmentRequest }> = ({ request }) => {
  const shared = new Set(request.consentFields);
  const fields = (Object.keys(SHARED_CHILD_FIELD_LABELS) as SharedChildField[]).filter(
    (field) => field !== 'display_name'
  );

  return (
    <div className="p-3 bg-indigo-50/70 rounded-lg mb-3">
      <p className="text-xs font-bold text-slate-500 mb-2">제공 동의 정보</p>
      <ul className="space-y-1">
        {fields.map((field) => {
          const allowed = shared.has(field);
          return (
            <li key={field} className="text-sm text-slate-700">
              <span className="font-bold">{SHARED_CHILD_FIELD_LABELS[field]}</span>
              {' · '}
              {allowed ? sharedFieldValue(field, request) : '제공 안 함'}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export const GuardianEnrollmentRequestCard: React.FC<{
  request: GuardianEnrollmentRequest;
  onApprove: () => void | Promise<void>;
  onReject: (reason: string) => void | Promise<void>;
}> = ({ request, onApprove, onReject }) => {
  const { showToast } = useApp();
  const labels = useModuleLabels();
  const contactLabel = labels.contact.singular;
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await onApprove();
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showToast('거절 사유를 입력해 주세요', 'error');
      return;
    }
    setProcessing(true);
    try {
      await onReject(rejectReason);
      setShowRejectForm(false);
      setRejectReason('');
    } catch {
      // 부모에서 토스트 — 실패 시 사유 폼 유지
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-lg text-slate-900 truncate">{request.studentName}</p>
              <p className="text-sm text-slate-500">
                {request.consentFields.includes('birth_date')
                  ? request.birthDate
                    ? new Date(request.birthDate).toLocaleDateString('ko-KR')
                    : '생년월일 미입력'
                  : '생년월일 제공 안 함'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">{contactLabel}</p>
                <p className="font-bold text-slate-900">
                  {request.parentName} ({GUARDIAN_RELATIONSHIP_LABELS[request.relationship as keyof typeof GUARDIAN_RELATIONSHIP_LABELS]})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">연락처</p>
                <p className={`font-bold ${request.parentPhone ? 'text-slate-900' : 'text-amber-700'}`}>
                  {request.parentPhone || '연락처 미등록'}
                </p>
              </div>
            </div>

            {request.parentEmail && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">이메일</p>
                  <p className="font-bold text-slate-900 truncate">{request.parentEmail}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">요청일</p>
                <p className="font-bold text-slate-900">
                  {new Date(request.requestedAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>
          </div>

          <SharedProfilePreview request={request} />

          {request.notes && (
            <div className="p-3 bg-slate-50 rounded-lg mb-3">
              <p className="text-xs font-bold text-slate-500 mb-1">전달 메시지</p>
              <p className="text-sm text-slate-700">{request.notes}</p>
            </div>
          )}

          {request.status === 'rejected' && request.rejectionReason && (
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
              <p className="text-xs font-bold text-rose-900 mb-1">거절 사유</p>
              <p className="text-sm text-rose-800">{request.rejectionReason}</p>
            </div>
          )}

          {request.status === 'approved' && request.reviewedAt && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs font-bold text-green-900">
                ✓ {new Date(request.reviewedAt).toLocaleDateString('ko-KR')} 승인됨
                {request.reviewedByName && ` (${request.reviewedByName})`}
              </p>
            </div>
          )}
        </div>
      </div>

      {request.status === 'pending' && !showRejectForm && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowRejectForm(true)}
            disabled={processing}
            className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            거절
          </button>
          <button
            type="button"
            onClick={() => void handleApprove()}
            disabled={processing}
            className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {processing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            승인
          </button>
        </div>
      )}

      {showRejectForm && (
        <div className="space-y-3">
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="거절 사유를 입력해 주세요 (필수)"
            rows={3}
            maxLength={500}
            disabled={processing}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl resize-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowRejectForm(false);
                setRejectReason('');
              }}
              disabled={processing}
              className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl min-h-[44px] disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void handleReject()}
              disabled={processing}
              className="flex-1 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              거절 확정
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
