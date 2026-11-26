import React from 'react';
import { canUserProcessStep } from '../domain/approvalEngine';
import { readRejectionHistory } from '../domain/approvalLine';
import {
  findPendingStepForRequest,
  isResearchGateApprovalEntity,
  type ApprovalRequestRow,
  type ApprovalStepRow,
} from '../services/approvalWorkflowService';

type Props = {
  requests: ApprovalRequestRow[];
  steps: ApprovalStepRow[];
  userId: string;
  processingId: string | null;
  onApprove: (req: ApprovalRequestRow) => void;
  onReject: (req: ApprovalRequestRow, stepId: string) => void;
  onResubmit: (req: ApprovalRequestRow) => void;
};

export const ApprovalRequestTable: React.FC<Props> = ({
  requests,
  steps,
  userId,
  processingId,
  onApprove,
  onReject,
  onResubmit,
}) => {
  if (requests.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-400">등록된 전자결재 문서가 없습니다.</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs text-slate-600">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
          <tr>
            <th className="px-4 py-3">기안 문서</th>
            <th className="px-4 py-3">기안자</th>
            <th className="px-4 py-3">단계</th>
            <th className="px-4 py-3">상태</th>
            <th className="px-4 py-3 text-right">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {requests.map((req) => {
            const pending = findPendingStepForRequest(req, steps);
            const canAct =
              req.status === 'pending' &&
              pending &&
              canUserProcessStep(
                {
                  id: pending.id,
                  requestId: req.id,
                  stepOrder: pending.step_order as 1,
                  stepType: 'approval',
                  approverId: pending.approver_id ?? '',
                  approverName: pending.approver_name,
                  status: 'pending',
                },
                userId
              );
            const canResubmit =
              req.status === 'draft' &&
              Boolean(req.rejection_reason) &&
              (!req.requester_id || req.requester_id === userId);
            const history = readRejectionHistory(req.content ?? undefined);
            return (
              <tr key={req.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3.5 font-medium text-slate-900">
                  <div>{req.title}</div>
                  {isResearchGateApprovalEntity(req.entity_type) ? (
                    <span className="mt-1 inline-block rounded bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                      연구 게이트
                    </span>
                  ) : null}
                  {history[0] ? (
                    <p className="mt-1 text-[11px] text-rose-700">
                      최근 반려: {history[history.length - 1].reason}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3.5">{req.requester_name || '직원'}</td>
                <td className="px-4 py-3.5">
                  {req.current_step_order} / {req.total_steps}
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      req.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700'
                        : req.status === 'draft' || req.status === 'rejected'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {req.status === 'approved' && '승인'}
                    {req.status === 'rejected' && '반려'}
                    {req.status === 'pending' && '심사 중'}
                    {req.status === 'draft' && (req.rejection_reason ? '반려 초안' : '임시 저장')}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <div className="flex justify-end gap-1.5">
                    {canAct && pending ? (
                      <>
                        <button
                          type="button"
                          disabled={processingId === req.id}
                          onClick={() => onApprove(req)}
                          className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                        >
                          승인
                        </button>
                        <button
                          type="button"
                          disabled={processingId === req.id}
                          onClick={() => onReject(req, pending.id)}
                          className="rounded bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 disabled:opacity-50"
                        >
                          반려
                        </button>
                      </>
                    ) : null}
                    {canResubmit ? (
                      <button
                        type="button"
                        onClick={() => onResubmit(req)}
                        className="rounded bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700"
                      >
                        수정·재상신
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
