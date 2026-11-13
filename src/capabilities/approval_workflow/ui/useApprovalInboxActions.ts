import { useCallback, useState } from 'react';
import { useInvalidate } from '@refinedev/core';
import { showToast } from '@/shared/feedback/uiFeedback';
import { canUserProcessStep } from '../domain/approvalEngine';
import { validateChosenApprovers } from '../domain/approvalLine';
import {
  createApprovalWithChosenLine,
  findPendingStepForRequest,
  isMboPlanApprovalEntity,
  isResearchGateApprovalEntity,
  isResourceReservationApprovalEntity,
  processApprovalStepAtomic,
  resubmitApprovalDraft,
  type ApprovalMemberOption,
  type ApprovalRequestRow,
  type ApprovalStepRow,
} from '../services/approvalWorkflowService';

type DraftInput = {
  title: string;
  amount: number;
  description: string;
  reviewerId: string;
  approverId: string;
};

export function useApprovalInboxActions(input: {
  orgId: string;
  userId: string;
  requesterName: string;
  members: ApprovalMemberOption[];
  steps: ApprovalStepRow[];
  refetch: () => void;
  refetchSteps?: () => void;
  /** 최종 승인·반려 후 연계 엔티티 동기화(자원예약·MBO 등). Cap 간 역의존 방지용 콜백 */
  onLinkedEntityOutcome?: (
    req: ApprovalRequestRow,
    outcome: 'approved' | 'rejected'
  ) => void | Promise<void>;
}) {
  const invalidate = useInvalidate();
  const [busy, setBusy] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ req: ApprovalRequestRow; stepId: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const resolveAssignee = useCallback(
    (id: string) => {
      const member = input.members.find((row) => row.userId === id);
      return { userId: id, name: member?.name ?? '구성원' };
    },
    [input.members]
  );

  const refreshAll = useCallback(
    (req?: ApprovalRequestRow) => {
      void invalidate({ resource: 'approval_requests', invalidates: ['list'] });
      void invalidate({ resource: 'approval_steps', invalidates: ['list'] });
      if (req && isResearchGateApprovalEntity(req.entity_type)) {
        void invalidate({ resource: 'research_projects', invalidates: ['list'] });
        void invalidate({ resource: 'research_project_gates', invalidates: ['list'] });
      }
      if (req && isMboPlanApprovalEntity(req.entity_type)) {
        void invalidate({ resource: 'mbo_objectives', invalidates: ['list'] });
      }
      if (req && isResourceReservationApprovalEntity(req.entity_type)) {
        void invalidate({ resource: 'room_reservations', invalidates: ['list'] });
      }
      input.refetchSteps?.();
      input.refetch();
    },
    [invalidate, input]
  );

  const handleCreate = async (draft: DraftInput) => {
    if (!input.orgId || !input.userId) {
      showToast('로그인·조직 정보가 필요합니다.', 'error');
      return false;
    }
    const check = validateChosenApprovers({
      requesterId: input.userId,
      reviewerId: draft.reviewerId,
      approverId: draft.approverId,
    });
    if (!check.valid) {
      showToast(check.error ?? '결재선을 확인해 주세요.', 'error');
      return false;
    }
    setBusy(true);
    try {
      await createApprovalWithChosenLine({
        organizationId: input.orgId,
        title: draft.title,
        content: { amount: draft.amount, description: draft.description },
        requesterId: input.userId,
        requesterName: input.requesterName,
        reviewer: resolveAssignee(draft.reviewerId),
        approver: resolveAssignee(draft.approverId),
      });
      showToast('전자결재 문서가 기안되었습니다.', 'success');
      refreshAll();
      return true;
    } catch (cause) {
      showToast.error(cause, '기안 실패');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleResubmit = async (requestId: string, draft: DraftInput) => {
    if (!input.userId) return false;
    setBusy(true);
    try {
      await resubmitApprovalDraft({
        requestId,
        title: draft.title,
        content: { amount: draft.amount, description: draft.description },
        reviewer: resolveAssignee(draft.reviewerId),
        approver: resolveAssignee(draft.approverId),
        requesterId: input.userId,
      });
      showToast('다시 상신되었습니다.', 'success');
      refreshAll();
      return true;
    } catch (cause) {
      showToast.error(cause, '재상신 실패');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const runApprove = async (req: ApprovalRequestRow) => {
    const step = findPendingStepForRequest(req, input.steps);
    if (
      !step ||
      !canUserProcessStep(
        {
          id: step.id,
          requestId: req.id,
          stepOrder: step.step_order as 1,
          stepType: 'approval',
          approverId: step.approver_id ?? '',
          approverName: step.approver_name,
          status: 'pending',
        },
        input.userId
      )
    ) {
      showToast('지정된 결재 단계가 없거나 권한이 없습니다.', 'error');
      return;
    }
    setProcessingId(req.id);
    const result = await processApprovalStepAtomic({
      requestId: req.id,
      stepId: step.id,
      action: 'approve',
      comment: '승인',
    });
    setProcessingId(null);
    if (!result.success) {
      showToast(result.error || '결재 처리 실패', 'error');
      return;
    }
    if (result.isFinal) {
      await input.onLinkedEntityOutcome?.(req, 'approved');
    }
    refreshAll(req);
    showToast(
      result.isFinal ? '최종 승인되었습니다.' : '검토가 승인되었습니다. 다음 단계로 진행됩니다.',
      'success'
    );
  };

  const openReject = (req: ApprovalRequestRow, stepId: string) => {
    setRejectTarget({ req, stepId });
    setRejectReason('');
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      showToast('반려 사유를 입력해 주세요.', 'error');
      return;
    }
    setProcessingId(rejectTarget.req.id);
    const result = await processApprovalStepAtomic({
      requestId: rejectTarget.req.id,
      stepId: rejectTarget.stepId,
      action: 'reject',
      comment: reason,
    });
    setProcessingId(null);
    if (!result.success) {
      showToast(result.error || '반려 처리 실패', 'error');
      return;
    }
    await input.onLinkedEntityOutcome?.(rejectTarget.req, 'rejected');
    refreshAll(rejectTarget.req);
    setRejectTarget(null);
    setRejectReason('');
    showToast('반려되어 초안으로 돌아갔습니다. 작성자가 수정 후 다시 상신할 수 있습니다.', 'warning');
  };

  return {
    busy,
    processingId,
    rejectTarget,
    rejectReason,
    setRejectReason,
    setRejectTarget,
    handleCreate,
    handleResubmit,
    runApprove,
    openReject,
    confirmReject,
  };
}
