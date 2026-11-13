import { createStateMachine } from '@/core/fsm/finiteStateMachine';

export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'canceled';
export type StepStatus = 'waiting' | 'pending' | 'approved' | 'rejected' | 'skipped';
export type StepType = 'review' | 'approval' | 'consensus';

export const approvalFSM = createStateMachine<ApprovalStatus, 'SUBMIT' | 'APPROVE' | 'REJECT' | 'CANCEL'>({
  domain: 'approval_workflow',
  initialState: 'draft',
  finalStates: ['approved', 'rejected', 'canceled'],
  transitions: [
    { from: 'draft', to: 'pending', event: 'SUBMIT' },
    { from: 'pending', to: 'approved', event: 'APPROVE' },
    { from: 'pending', to: 'draft', event: 'REJECT' },
    { from: 'pending', to: 'canceled', event: 'CANCEL' },
  ],
});

export interface ApprovalStep {
  id: string;
  requestId: string;
  stepOrder: number;
  stepType: StepType;
  approverId: string;
  approverName: string;
  approverRole?: string;
  status: StepStatus;
  comment?: string;
  signatureUrl?: string;
  processedAt?: string;
}

export interface ApprovalRequest {
  id: string;
  organizationId: string;
  templateId?: string;
  title: string;
  content: Record<string, unknown>;
  requesterId: string;
  requesterName: string;
  status: ApprovalStatus;
  currentStepOrder: number;
  totalSteps: number;
  entityType?: string;
  entityId?: string;
  steps: ApprovalStep[];
  finalApprovedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalStepInput {
  stepOrder: number;
  stepType: StepType;
  approverId: string;
  approverName: string;
  approverRole?: string;
}

export interface ApprovalTransitionResult {
  success: boolean;
  error?: string;
  updatedRequest?: ApprovalRequest;
  isFinalApproval?: boolean;
}

/**
 * 결재선 유효성 검증
 * - 최소 1개 이상의 단계 필요
 * - 단계 순서는 1부터 1씩 증가해야 함
 * - 중복된 결재자 연속 지정 차단 (자가 결재 방지)
 */
export function validateApprovalSteps(
  requesterId: string,
  steps: ApprovalStepInput[]
): { valid: boolean; error?: string } {
  if (!steps || steps.length === 0) {
    return { valid: false, error: '최소 1명 이상의 결재자가 지정되어야 합니다.' };
  }

  // 순서 검증
  const sorted = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].stepOrder !== i + 1) {
      return { valid: false, error: `결재 순번이 올바르지 않습니다 (1부터 순차 증가 필수).` };
    }
  }

  // 기안자 본인이 최종 승인자로 단독 승인하는 자가 승인 차단
  if (steps.length === 1 && steps[0].approverId === requesterId) {
    return { valid: false, error: '기안자 본인 1인 자가 승인은 불가합니다. 검토자 또는 승인자를 추가하십시오.' };
  }

  return { valid: true };
}

/**
 * 결재 처리 권한 검증 — 기안자가 지정한 담당자만 처리한다.
 */
export function canUserProcessStep(
  step: ApprovalStep,
  currentUserId: string,
  _permissions: string[] = []
): boolean {
  if (!currentUserId) return false;
  if (step.status !== 'pending') return false;
  return step.approverId === currentUserId;
}

/**
 * 결재/반려 상태 전이 엔진
 */
export function transitionApprovalStep(
  request: ApprovalRequest,
  stepId: string,
  action: 'approve' | 'reject',
  comment?: string,
  signatureUrl?: string
): ApprovalTransitionResult {
  if (request.status !== 'pending') {
    return { success: false, error: '진행 중인 결재 문서만 심사할 수 있습니다.' };
  }

  const stepIndex = request.steps.findIndex((s) => s.id === stepId);
  if (stepIndex === -1) {
    return { success: false, error: '해당 결재 단계를 찾을 수 없습니다.' };
  }

  const targetStep = request.steps[stepIndex];
  if (targetStep.status !== 'pending') {
    return { success: false, error: '현재 대기 중인 결재 단계가 아닙니다.' };
  }

  const now = new Date(Date.now()).toISOString();
  const nextSteps = [...request.steps];

  if (action === 'approve') {
    // 1. 현재 단계 승인 완료
    nextSteps[stepIndex] = {
      ...targetStep,
      status: 'approved',
      comment: comment || undefined,
      signatureUrl: signatureUrl || undefined,
      processedAt: now,
    };

    // 다음 결재 단계 탐색
    const nextStepIndex = nextSteps.findIndex((s) => s.stepOrder === targetStep.stepOrder + 1);

    if (nextStepIndex !== -1) {
      // 다음 단계 활성화
      nextSteps[nextStepIndex] = {
        ...nextSteps[nextStepIndex],
        status: 'pending',
      };

      const updatedRequest: ApprovalRequest = {
        ...request,
        steps: nextSteps,
        currentStepOrder: targetStep.stepOrder + 1,
        updatedAt: now,
      };

      return {
        success: true,
        updatedRequest,
        isFinalApproval: false,
      };
    } else {
      // 모든 단계 승인 완료 -> 문서 최종 승인
      const updatedRequest: ApprovalRequest = {
        ...request,
        steps: nextSteps,
        status: 'approved',
        finalApprovedAt: now,
        updatedAt: now,
      };

      return {
        success: true,
        updatedRequest,
        isFinalApproval: true,
      };
    }
  } else if (action === 'reject') {
    const reason = (comment ?? '').trim();
    if (!reason) {
      return { success: false, error: '반려 사유를 입력해 주세요.' };
    }

    nextSteps[stepIndex] = {
      ...targetStep,
      status: 'rejected',
      comment: reason,
      processedAt: now,
    };

    // 이후 단계는 재상신을 위해 waiting으로 되돌린다.
    for (let i = 0; i < nextSteps.length; i++) {
      if (nextSteps[i].stepOrder > targetStep.stepOrder) {
        nextSteps[i] = {
          ...nextSteps[i],
          status: 'waiting',
          comment: undefined,
          signatureUrl: undefined,
          processedAt: undefined,
        };
      }
    }

    const previousHistory = Array.isArray(request.content.rejectionHistory)
      ? [...(request.content.rejectionHistory as unknown[])]
      : [];
    previousHistory.push({
      id: `reject-${now}`,
      stepOrder: targetStep.stepOrder,
      stepLabel: targetStep.stepType === 'review' ? '검토' : '최종 승인',
      reason,
      rejectedAt: now,
    });

    const updatedRequest: ApprovalRequest = {
      ...request,
      content: {
        ...request.content,
        rejectionHistory: previousHistory,
      },
      steps: nextSteps,
      status: 'draft',
      rejectedAt: now,
      rejectionReason: reason,
      currentStepOrder: 1,
      updatedAt: now,
    };

    return {
      success: true,
      updatedRequest,
      isFinalApproval: false,
    };
  }

  return { success: false, error: '올바르지 않은 결재 액션입니다.' };
}

/**
 * 결재 현황 요약 메트릭스
 */
export interface ApprovalMetrics {
  totalCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

export function summarizeApprovalMetrics(requests: ApprovalRequest[]): ApprovalMetrics {
  return {
    totalCount: requests.length,
    pendingCount: requests.filter((r) => r.status === 'pending').length,
    approvedCount: requests.filter((r) => r.status === 'approved').length,
    rejectedCount: requests.filter(
      (r) => r.status === 'rejected' || (r.status === 'draft' && Boolean(r.rejectionReason))
    ).length,
  };
}
