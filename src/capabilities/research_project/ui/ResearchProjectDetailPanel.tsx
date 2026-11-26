import React, { useEffect, useState } from 'react';
import {
  Users,
  Wallet,
  FileCheck,
  GitBranch,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import {
  RESEARCH_STATUS_LABELS,
  MEMBER_ROLE_LABELS,
  DELIVERABLE_TYPE_LABELS,
  DELIVERABLE_STATUS_LABELS,
  calculateBudgetRemaining,
  canDirectDecideGate,
  formatDeliverableTitle,
  parseDeliverableType,
  getCurrentGate,
  type DeliverableType,
  type ResearchProject,
} from '../domain/researchProjectEngine';
import type { GateApprovalAssignee } from '../domain/researchProjectApproval';
import {
  listApprovalOrgMembers,
  type ApprovalMemberOption,
} from '@/capabilities/approval_workflow';
import { showToast } from '@/shared/feedback/uiFeedback';

function formatKrw(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}

const TYPE_BADGE_STYLES: Record<DeliverableType, string> = {
  paper: 'bg-blue-50 text-blue-700 border-blue-200',
  conference: 'bg-slate-50 text-slate-700 border-slate-200',
  thesis: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  report: 'bg-slate-50 text-slate-700 border-slate-200',
  patent: 'bg-amber-50 text-amber-700 border-amber-200',
  code: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  other: 'bg-slate-50 text-slate-700 border-slate-200',
};

export interface ResearchProjectDetailPanelProps {
  project: ResearchProject;
  hasApprovalWorkflow: boolean;
  onSpend: (amount: number) => string | null;
  onDirectGateDecision: (
    gateOrder: number,
    status: 'approved' | 'rejected',
    note: string
  ) => string | null;
  onSubmitGateApproval: (
    gateId: string,
    note: string,
    reviewer: GateApprovalAssignee,
    approver: GateApprovalAssignee
  ) => Promise<string | null>;
  onDeliverableStatus: (id: string, status: ResearchProject['deliverables'][number]['status']) => void;
  onAddDeliverable?: (title: string, dueDate?: string | null, evidenceUrl?: string | null) => void;
}

export const ResearchProjectDetailPanel: React.FC<ResearchProjectDetailPanelProps> = ({
  project,
  hasApprovalWorkflow,
  onSpend,
  onDirectGateDecision,
  onSubmitGateApproval,
  onDeliverableStatus,
  onAddDeliverable,
}) => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id ?? '';
  const [gateNote, setGateNote] = useState('');
  const [spendAmount, setSpendAmount] = useState(1_000_000);
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [members, setMembers] = useState<ApprovalMemberOption[]>([]);
  const [reviewerId, setReviewerId] = useState('');
  const [approverId, setApproverId] = useState('');

  useEffect(() => {
    if (!orgId || !hasApprovalWorkflow) return;
    void listApprovalOrgMembers(orgId)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [orgId, hasApprovalWorkflow]);

  // 신규 산출물 등록 상태
  const [newType, setNewType] = useState<DeliverableType>('paper');
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [showAddDeliverable, setShowAddDeliverable] = useState(false);

  const currentGate = getCurrentGate(project.gates);

  const handleSpend = () => {
    const err = onSpend(Number(spendAmount) || 0);
    if (err) showToast(err, 'error');
    else showToast('연구비 집행이 기록되었습니다.', 'success');
  };

  const handleDirect = (status: 'approved' | 'rejected') => {
    if (!currentGate) return;
    const err = onDirectGateDecision(currentGate.gateOrder, status, gateNote);
    if (err) showToast(err, 'error');
    else {
      setGateNote('');
      showToast(`${currentGate.gateOrder}차 게이트 ${status === 'approved' ? '승인' : '반려'}`, 'success');
    }
  };

  const handleSubmitApproval = async () => {
    if (!currentGate) return;
    const reviewer = members.find((m) => m.userId === reviewerId);
    const approver = members.find((m) => m.userId === approverId);
    if (!reviewer || !approver) {
      showToast('검토자와 최종 승인자를 선택해 주세요.', 'error');
      return;
    }
    setSubmittingApproval(true);
    const err = await onSubmitGateApproval(
      currentGate.id,
      gateNote,
      { userId: reviewer.userId, name: reviewer.name },
      { userId: approver.userId, name: approver.name }
    );
    setSubmittingApproval(false);
    if (err) showToast(err, 'error');
    else {
      setGateNote('');
      showToast('전자결재로 게이트 심의가 상신되었습니다.', 'success');
    }
  };

  const handleCreateDeliverable = () => {
    if (!newTitle.trim()) {
      showToast('산출물 제목을 입력해주세요.', 'warning');
      return;
    }
    const formattedTitle = formatDeliverableTitle(newType, newTitle);
    if (onAddDeliverable) {
      onAddDeliverable(formattedTitle, newDueDate || null, null);
      showToast(`[${DELIVERABLE_TYPE_LABELS[newType]}] 산출물이 등록되었습니다.`, 'success');
    }
    setNewTitle('');
    setNewDueDate('');
    setShowAddDeliverable(false);
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{project.title}</h2>
        {project.summary && <p className="mt-1 text-sm text-slate-600">{project.summary}</p>}
        <p className="mt-1 text-xs text-slate-400">{RESEARCH_STATUS_LABELS[project.status]}</p>
      </div>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Users className="h-4 w-4" /> 연구진 (PI 및 참여 연구원)
        </h3>
        <ul className="space-y-1 text-sm text-slate-600">
          {project.members.map((m) => (
            <li key={`${m.memberId}-${m.role}`}>
              <span className="font-medium text-slate-700">{MEMBER_ROLE_LABELS[m.role]}</span> — {m.memberName}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Wallet className="h-4 w-4" /> 연구 예산
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-lg bg-slate-50 p-2">
            <div className="text-xs text-slate-500">계획</div>
            <div className="font-medium">{formatKrw(project.budget.planned)}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <div className="text-xs text-slate-500">집행</div>
            <div className="font-medium">{formatKrw(project.budget.spent)}</div>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2">
            <div className="text-xs text-emerald-700">잔액</div>
            <div className="font-medium text-emerald-800">
              {formatKrw(calculateBudgetRemaining(project.budget))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={1}
            value={spendAmount}
            onChange={(e) => setSpendAmount(Number(e.target.value))}
            className="min-h-[44px] w-36 rounded-lg border border-slate-200 px-3 text-sm"
          />
          <button
            type="button"
            onClick={handleSpend}
            className="min-h-[44px] rounded-lg bg-slate-800 px-3 text-sm text-white hover:bg-slate-700"
          >
            집행 기록
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <FileCheck className="h-4 w-4" /> 학술 및 연구 산출물 (논문·특허·보고서)
          </h3>
          {onAddDeliverable && (
            <button
              type="button"
              onClick={() => setShowAddDeliverable((prev) => !prev)}
              className="flex items-center gap-1 text-xs text-slate-800 hover:text-indigo-800 font-medium"
            >
              <Plus className="h-3.5 w-3.5" /> 산출물 추가
            </button>
          )}
        </div>

        {showAddDeliverable && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
            <div className="text-xs font-semibold text-slate-900">신규 산출물 등록</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as DeliverableType)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium"
              >
                {Object.entries(DELIVERABLE_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="산출물 명칭 (예: 저널 투고 논문, 디펜스 논문)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs sm:col-span-2"
              />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">목표 마감일:</span>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAddDeliverable(false)}
                  className="rounded px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleCreateDeliverable}
                  className="rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800"
                >
                  등록
                </button>
              </div>
            </div>
          </div>
        )}

        <ul className="space-y-2 text-sm text-slate-600">
          {project.deliverables.map((d) => {
            const parsed = parseDeliverableType(d.title);
            const badgeClass = TYPE_BADGE_STYLES[parsed.type] || TYPE_BADGE_STYLES.other;
            return (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={`inline-block rounded border px-1.5 py-0.5 text-[11px] font-semibold shrink-0 ${badgeClass}`}
                  >
                    {DELIVERABLE_TYPE_LABELS[parsed.type] || '기타'}
                  </span>
                  <span className="truncate font-medium text-slate-800">{parsed.cleanTitle}</span>
                  {d.dueDate && (
                    <span className="text-[11px] text-slate-400 shrink-0">
                      (~{d.dueDate})
                    </span>
                  )}
                  {d.evidenceUrl && (
                    <a
                      href={d.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-slate-800 shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <select
                  value={d.status}
                  onChange={(e) =>
                    onDeliverableStatus(d.id, e.target.value as typeof d.status)
                  }
                  className="min-h-[34px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700"
                >
                  {Object.entries(DELIVERABLE_STATUS_LABELS).map(([statusKey, statusLabel]) => (
                    <option key={statusKey} value={statusKey}>
                      {statusLabel}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
          {project.deliverables.length === 0 && (
            <li className="text-xs text-slate-400 py-2">등록된 산출물이 없습니다.</li>
          )}
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <GitBranch className="h-4 w-4" /> 게이트 심의 & 단계 승인
        </h3>
        <ol className="space-y-2">
          {project.gates
            .slice()
            .sort((a, b) => a.gateOrder - b.gateOrder)
            .map((g) => (
              <li
                key={g.id}
                className="flex items-start gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                {g.status === 'approved' || g.status === 'skipped' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                ) : g.status === 'rejected' ? (
                  <XCircle className="mt-0.5 h-4 w-4 text-rose-600" />
                ) : (
                  <Clock className="mt-0.5 h-4 w-4 text-amber-500" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-800">
                    {g.gateOrder}차 · {g.title}
                  </div>
                  <div className="text-xs text-slate-500">
                    상태: {g.status}
                    {g.approvalRequestId ? ` · 결재상신: ${g.approvalRequestId.slice(0, 8)}…` : ''}
                    {g.decidedByName ? ` · 승인자: ${g.decidedByName}` : ''}
                    {g.decidedAt ? ` (${g.decidedAt.slice(0, 10)})` : ''}
                  </div>
                  {g.decisionNote && (
                    <div className="mt-1 text-xs text-slate-600 bg-slate-50 p-1.5 rounded">
                      심의 의견: {g.decisionNote}
                    </div>
                  )}
                </div>
              </li>
            ))}
        </ol>

        {currentGate && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="text-xs font-semibold text-slate-700">
              현재 심의 차수: {currentGate.gateOrder}차 ({currentGate.title})
            </div>
            <textarea
              value={gateNote}
              onChange={(e) => setGateNote(e.target.value)}
              placeholder="심의/결재 의견 (선택)"
              rows={2}
              className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
            />
            {hasApprovalWorkflow && currentGate.status === 'pending' ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  aria-label="검토자"
                  value={reviewerId}
                  onChange={(e) => setReviewerId(e.target.value)}
                  className="h-11 rounded-lg border border-slate-200 bg-white px-2 text-xs"
                >
                  <option value="">검토자 선택</option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="최종 승인자"
                  value={approverId}
                  onChange={(e) => setApproverId(e.target.value)}
                  className="h-11 rounded-lg border border-slate-200 bg-white px-2 text-xs"
                >
                  <option value="">최종 승인자 선택</option>
                  {members.map((member) => (
                    <option key={`approver-${member.userId}`} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              {canDirectDecideGate(currentGate) && (
                <>
                  <button
                    type="button"
                    onClick={() => handleDirect('approved')}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    직접 승인
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDirect('rejected')}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
                  >
                    직접 반려
                  </button>
                </>
              )}
              {hasApprovalWorkflow && currentGate.status === 'pending' && (
                <button
                  type="button"
                  disabled={submittingApproval}
                  onClick={() => void handleSubmitApproval()}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {submittingApproval ? '상신 중...' : '전자결재 상신'}
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
