import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  createApprovalWithChosenLine,
  listApprovalOrgMembers,
  type ApprovalMemberOption,
} from '@/capabilities/approval_workflow';
import {
  buildMboPlanApprovalContent,
  canSubmitMboPlanToApprovalWorkflow,
} from '../domain/mboPlanApproval';

type Props = {
  open: boolean;
  organizationId: string;
  objectiveId: string;
  objectiveTitle: string;
  objectiveDescription?: string | null;
  successCriteria?: string | null;
  ownerName?: string | null;
  objectiveStatus: string;
  requirePlanApproval: boolean;
  hasApprovalWorkflow: boolean;
  requesterId: string;
  requesterName: string;
  onClose: () => void;
  onSubmitted: () => void;
  onSkipToLocalSubmit: () => void;
};

export const MboPlanApprovalModal: React.FC<Props> = ({
  open,
  organizationId,
  objectiveId,
  objectiveTitle,
  objectiveDescription,
  successCriteria,
  ownerName,
  objectiveStatus,
  requirePlanApproval,
  hasApprovalWorkflow,
  requesterId,
  requesterName,
  onClose,
  onSubmitted,
  onSkipToLocalSubmit,
}) => {
  const [members, setMembers] = useState<ApprovalMemberOption[]>([]);
  const [reviewerId, setReviewerId] = useState('');
  const [approverId, setApproverId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !organizationId || !hasApprovalWorkflow) return;
    void listApprovalOrgMembers(organizationId)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [open, organizationId, hasApprovalWorkflow]);

  if (!open) return null;

  const guard = canSubmitMboPlanToApprovalWorkflow({
    requirePlanApproval,
    hasApprovalWorkflow,
    objectiveStatus,
  });

  const handleConfirm = async () => {
    setError(null);
    if (!guard.allowed) {
      setError(guard.reason ?? '상신할 수 없습니다.');
      return;
    }
    if (!requirePlanApproval || !hasApprovalWorkflow) {
      onSkipToLocalSubmit();
      onClose();
      return;
    }
    const reviewer = members.find((m) => m.userId === reviewerId);
    const approver = members.find((m) => m.userId === approverId);
    if (!reviewer || !approver) {
      setError('검토자와 최종 승인자를 선택해 주세요.');
      return;
    }
    if (reviewer.userId === approver.userId) {
      setError('검토자와 최종 승인자는 서로 다른 사람이어야 합니다.');
      return;
    }
    setBusy(true);
    try {
      await createApprovalWithChosenLine({
        organizationId,
        title: `[MBO 계획] ${objectiveTitle}`,
        content: buildMboPlanApprovalContent({
          title: objectiveTitle,
          description: objectiveDescription,
          successCriteria,
          ownerName,
        }),
        requesterId,
        requesterName,
        reviewer: { userId: reviewer.userId, name: reviewer.name },
        approver: { userId: approver.userId, name: approver.name },
        entityType: 'mbo_plan',
        entityId: objectiveId,
      });
      onSubmitted();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '결재 상신 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">MBO 계획 결재 상신</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-600">{objectiveTitle}</p>
        {error ? (
          <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
        ) : null}
        {requirePlanApproval && hasApprovalWorkflow ? (
          <div className="mb-4 grid gap-3">
            <label className="block text-xs font-bold text-slate-700">
              검토자
              <select
                value={reviewerId}
                onChange={(e) => setReviewerId(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
              >
                <option value="">선택</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold text-slate-700">
              최종 승인자
              <select
                value={approverId}
                onChange={(e) => setApproverId(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
              >
                <option value="">선택</option>
                {members.map((m) => (
                  <option key={`a-${m.userId}`} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <p className="mb-4 text-xs text-slate-500">
            계획 승인 필수가 아니거나 전자결재가 비활성이라 로컬 제출로 진행합니다.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"
          >
            취소
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleConfirm()}
            className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? '상신 중…' : '상신'}
          </button>
        </div>
      </div>
    </div>
  );
};
