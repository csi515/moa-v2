import React, { useEffect, useMemo, useState } from 'react';
import { useList, useGetIdentity } from '@refinedev/core';
import { FileCheck, Clock, CheckCircle2, XCircle, Plus, Search, FileText } from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { showToast } from '@/shared/feedback/uiFeedback';
import { summarizeApprovalMetrics } from '../domain/approvalEngine';
import { ApprovalDraftModal } from './ApprovalDraftModal';
import { ApprovalRequestTable } from './ApprovalRequestTable';
import { useApprovalInboxActions } from './useApprovalInboxActions';
import {
  deactivateApprovalLine,
  listApprovalOrgMembers,
  listSavedApprovalLines,
  saveApprovalLine,
  type ApprovalMemberOption,
  type ApprovalRequestRow,
  type ApprovalStepRow,
  type SavedApprovalLine,
} from '../services/approvalWorkflowService';

type Identity = { id?: string; name?: string };

type Props = {
  onLinkedEntityOutcome?: (
    req: ApprovalRequestRow,
    outcome: 'approved' | 'rejected'
  ) => void | Promise<void>;
};

export const ApprovalWorkflowManagementView: React.FC<Props> = ({
  onLinkedEntityOutcome,
}) => {
  const { currentOrganization } = useOrganization();
  const { data: identity } = useGetIdentity<Identity>();
  const orgId = currentOrganization?.id ?? '';
  const userId = identity?.id ?? '';
  const requesterName = identity?.name?.trim() || '기안자';

  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [resubmitTarget, setResubmitTarget] = useState<ApprovalRequestRow | null>(null);
  const [members, setMembers] = useState<ApprovalMemberOption[]>([]);
  const [savedLines, setSavedLines] = useState<SavedApprovalLine[]>([]);

  const { query } = useList<ApprovalRequestRow>({
    resource: 'approval_requests',
    sorters: [{ field: 'created_at', order: 'desc' }],
    pagination: { pageSize: 50 },
  });
  const stepsQuery = useList<ApprovalStepRow>({
    resource: 'approval_steps',
    pagination: { mode: 'off' },
  });

  const requests = query?.data?.data ?? [];
  const steps = stepsQuery.query?.data?.data ?? [];
  const isLoading = query?.isLoading || stepsQuery.query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const reloadSavedLines = () => {
    if (!orgId) return;
    void listSavedApprovalLines(orgId)
      .then(setSavedLines)
      .catch(() => setSavedLines([]));
  };

  useEffect(() => {
    if (!orgId) return;
    void listApprovalOrgMembers(orgId)
      .then(setMembers)
      .catch(() => setMembers([]));
    reloadSavedLines();
  }, [orgId]);

  const resolveMemberName = (userIdValue: string, fallback: string) =>
    members.find((member) => member.userId === userIdValue)?.name ?? fallback;

  const handleSaveLine = async (input: { title: string; reviewerId: string; approverId: string }) => {
    if (!orgId || !userId) {
      showToast('로그인·조직 정보가 필요합니다.', 'error');
      return;
    }
    try {
      await saveApprovalLine({
        organizationId: orgId,
        title: input.title,
        requesterId: userId,
        line: {
          reviewer: {
            userId: input.reviewerId,
            name: resolveMemberName(input.reviewerId, '검토자'),
          },
          approver: {
            userId: input.approverId,
            name: resolveMemberName(input.approverId, '승인자'),
          },
        },
      });
      showToast('결재선이 저장되었습니다.', 'success');
      reloadSavedLines();
    } catch (cause) {
      showToast.error(cause, '결재선 저장 실패');
      throw cause;
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    try {
      await deactivateApprovalLine(lineId);
      showToast('결재선을 삭제했습니다.', 'success');
      reloadSavedLines();
    } catch (cause) {
      showToast.error(cause, '결재선 삭제 실패');
      throw cause;
    }
  };

  const actions = useApprovalInboxActions({
    orgId,
    userId,
    requesterName,
    members,
    steps,
    refetch,
    refetchSteps: () => void stepsQuery.query?.refetch?.(),
    onLinkedEntityOutcome,
  });

  const metrics = useMemo(
    () =>
      summarizeApprovalMetrics(
        requests.map((r) => ({
          id: r.id,
          organizationId: '',
          title: r.title,
          content: r.content ?? {},
          requesterId: r.requester_id ?? '',
          requesterName: r.requester_name,
          status: r.status as 'pending' | 'approved' | 'rejected' | 'draft' | 'canceled',
          currentStepOrder: r.current_step_order,
          totalSteps: r.total_steps,
          steps: [],
          rejectionReason: r.rejection_reason ?? undefined,
          createdAt: r.created_at ?? '',
          updatedAt: '',
        }))
      ),
    [requests]
  );

  const filteredRequests = requests.filter((r) => {
    if (selectedStatus === 'rejected') {
      if (r.status !== 'rejected' && !(r.status === 'draft' && r.rejection_reason)) return false;
    } else if (selectedStatus !== 'ALL' && r.status !== selectedStatus) {
      return false;
    }
    if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (isLoading) {
    return <div className="p-6 text-slate-500">전자결재 문서를 불러오는 중...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <FileCheck className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">전사 전자결재함</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">기안자가 검토자·승인자를 지정하고, 지정된 사람만 처리합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex h-12 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          신규 결재 기안
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: '총 기안', value: metrics.totalCount, icon: FileText, tone: 'text-slate-900' },
          { label: '결재 대기', value: metrics.pendingCount, icon: Clock, tone: 'text-amber-700' },
          { label: '승인 완료', value: metrics.approvedCount, icon: CheckCircle2, tone: 'text-emerald-700' },
          { label: '반려·초안', value: metrics.rejectedCount, icon: XCircle, tone: 'text-rose-700' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
              <span>{card.label}</span>
              <card.icon className="h-4 w-4 text-slate-400" />
            </div>
            <div className={`mt-2 text-2xl font-bold ${card.tone}`}>{card.value}건</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5 overflow-x-auto">
          {[
            ['ALL', '전체'],
            ['pending', '결재 대기'],
            ['approved', '승인 완료'],
            ['rejected', '반려·초안'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedStatus(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                selectedStatus === value ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="기안 제목 검색..."
            className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <ApprovalRequestTable
          requests={filteredRequests}
          steps={steps}
          userId={userId}
          processingId={actions.processingId}
          onApprove={(req) => void actions.runApprove(req)}
          onReject={actions.openReject}
          onResubmit={setResubmitTarget}
        />
      </div>

      <ApprovalDraftModal
        open={createOpen}
        mode="create"
        members={members}
        savedLines={savedLines}
        busy={actions.busy}
        onClose={() => setCreateOpen(false)}
        onSaveLine={handleSaveLine}
        onDeleteLine={handleDeleteLine}
        onSubmit={(draft) => {
          void actions.handleCreate(draft).then((ok) => {
            if (ok) setCreateOpen(false);
          });
        }}
      />
      <ApprovalDraftModal
        open={Boolean(resubmitTarget)}
        mode="resubmit"
        members={members}
        savedLines={savedLines}
        busy={actions.busy}
        content={resubmitTarget?.content}
        initialTitle={resubmitTarget?.title ?? ''}
        initialAmount={Number(resubmitTarget?.content?.amount ?? 0)}
        initialDescription={String(resubmitTarget?.content?.description ?? '')}
        onClose={() => setResubmitTarget(null)}
        onSaveLine={handleSaveLine}
        onDeleteLine={handleDeleteLine}
        onSubmit={(draft) => {
          if (!resubmitTarget) return;
          void actions.handleResubmit(resubmitTarget.id, draft).then((ok) => {
            if (ok) setResubmitTarget(null);
          });
        }}
      />

      {actions.rejectTarget ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-2xl">
            <h3 className="text-base font-bold text-slate-900">반려 사유</h3>
            <textarea
              className="mt-3 min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm"
              value={actions.rejectReason}
              onChange={(e) => actions.setRejectReason(e.target.value)}
              placeholder="보완이 필요한 항목을 구체적으로 적어 주세요"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="h-12 flex-1 rounded-xl border border-slate-300"
                onClick={() => actions.setRejectTarget(null)}
              >
                취소
              </button>
              <button
                type="button"
                className="h-12 flex-1 rounded-xl bg-rose-700 font-bold text-white"
                onClick={() => void actions.confirmReject()}
              >
                반려
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
