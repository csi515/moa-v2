import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, History, Plus, Printer, Send } from 'lucide-react';
import { DocumentApprovalStepper } from './DocumentApprovalStepper';
import { SopHistoryModal, SopNewDocumentModal, SopReviseModal } from './SopDocumentModals';
import { SopPendingApprovalStrip } from './SopPendingApprovalStrip';
import { SopProhibitedList } from './SopProhibitedList';
import { SopStepMatrixTable } from './SopStepMatrixTable';
import { useSopRiskWorkspace } from './useSopRiskWorkspace';
import { formatRevisionNo } from '../domain/sopNumberingAndAuditEngine';
import type { ApprovalStepState } from '../domain/approvalEngine';
import type { ApprovalLineRow } from '../services/riskAssessmentApprovalService';
import type { RejectionNote } from '../domain/sopStepDocument';

function RejectionRecord({
  history,
  lines,
}: {
  history: RejectionNote[];
  lines: ApprovalLineRow[];
}) {
  const extras: RejectionNote[] = lines
    .filter((line) => line.action_status === 'REJECTED' && line.comment)
    .filter(
      (line) =>
        !history.some((note) => note.reason === line.comment && note.stepOrder === line.step_order)
    )
    .map((line) => ({
      id: line.id,
      stepOrder: line.step_order,
      stepLabel: line.step_order === 3 ? '최종 승인' : '검토',
      reason: line.comment ?? '',
      rejectedAt: line.action_at,
    }));
  const notes = [...history, ...extras];
  if (notes.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm font-bold text-rose-900">반려 기록. 내용을 반영해 수정한 뒤 다시 검토를 요청할 수 있습니다.</p>
      <ol className="space-y-2">
      {notes.map((note) => (
        <li key={note.id} className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-950">
          <p className="font-bold">
            {note.stepLabel} 반려
            {note.rejectedAt ? ` · ${new Date(note.rejectedAt).toLocaleString('ko-KR')}` : ''}
          </p>
          <p className="mt-1 whitespace-pre-wrap">{note.reason}</p>
        </li>
      ))}
      </ol>
    </div>
  );
}

function toStep(row: ApprovalLineRow): ApprovalStepState {
  return {
    stepOrder: row.step_order as 1 | 2 | 3,
    stepType: row.step_type as ApprovalStepState['stepType'],
    assigneeId: row.assignee_id,
    assigneeName: row.assignee_name ?? undefined,
    actionStatus: row.action_status as ApprovalStepState['actionStatus'],
    comment: row.comment,
  };
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '초안',
  REVIEW_PENDING: '검토 중',
  APPROVAL_PENDING: '승인 대기',
  APPROVED: '승인',
  LOCKED: '잠금',
};

export const DesktopSopRiskMatrixView: React.FC = () => {
  const workspace = useSopRiskWorkspace();
  const [showNew, setShowNew] = useState(false);
  const [showRevise, setShowRevise] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const canCreate = Boolean(workspace.userId);
  const doc = workspace.selected;
  const live = workspace.viewVersion === 'live';

  return (
    <div className="mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4 sm:px-6" data-testid="desktop-sop-risk-matrix">
      <SopPendingApprovalStrip />
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/workspace/intranet" className="inline-flex h-11 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-bold">
            <ArrowLeft className="h-3.5 w-3.5" />
            사내 앱 런처
          </Link>
          <select
            className="h-11 rounded-xl border border-slate-300 px-3 text-sm font-bold"
            value={doc?.document_no ?? ''}
            onChange={(event) => {
              const next = workspace.docs.find((item) => item.document_no === event.target.value);
              if (next) void workspace.selectDoc(next.id);
            }}
          >
            {workspace.docs.map((item) => (
              <option key={item.id} value={item.document_no}>
                {item.document_no} - {item.process_name}
              </option>
            ))}
          </select>
          {canCreate ? (
          <button type="button" className="inline-flex h-11 items-center gap-1 rounded-xl border border-dashed border-indigo-300 bg-slate-50 px-3 text-xs font-bold text-slate-700" onClick={() => setShowNew(true)}>
            <Plus className="h-3.5 w-3.5" />
            신규 공정 표준 등록
          </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold">
            <History className="h-4 w-4" />
            이력
            <select
              className="bg-transparent"
              value={workspace.viewVersion === 'live' ? 'live' : String(workspace.viewVersion)}
              onChange={(event) =>
                workspace.setViewVersion(event.target.value === 'live' ? 'live' : Number(event.target.value))
              }
            >
              <option value="live">
                현재 {doc ? `${formatRevisionNo((doc.current_version ?? 1) - 1)} · ${STATUS_LABEL[doc.status] ?? doc.status}` : ''}
              </option>
              {workspace.revisions.map((revision) => (
                <option key={revision.id} value={revision.version}>
                  v{revision.version} {formatRevisionNo(revision.version - 1)} 승인본
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="inline-flex h-11 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-bold" onClick={() => setShowHistory(true)}>
            <Eye className="h-3.5 w-3.5" />
            제·개정 이력 카드
          </button>
          <button type="button" className="inline-flex h-11 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-bold" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" />
            현장 인쇄/PDF
          </button>
          {doc && (doc.status === 'APPROVED' || doc.status === 'LOCKED') && live ? (
            <button type="button" className="inline-flex h-11 items-center gap-1 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white" onClick={() => setShowRevise(true)}>
              <Send className="h-3.5 w-3.5" />
              개정 기안
            </button>
          ) : null}
        </div>
      </header>

      {workspace.error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{workspace.error}</p> : null}
      {workspace.message ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{workspace.message}</p> : null}
      {!live ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900 print:hidden">
          과거 승인본을 읽기 전용으로 보고 있습니다.
          <button type="button" className="ml-3 h-11 rounded-lg bg-amber-600 px-3 text-white" onClick={() => workspace.setViewVersion('live')}>
            현재 문서로
          </button>
        </div>
      ) : null}

      {!doc && !workspace.loading ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          등록된 작업표준이 없습니다. 신규 공정 표준을 만들면 초안 단계에서 작업 단계와 위험성평가를 함께 작성합니다.
        </p>
      ) : null}

      {doc ? (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-bold text-slate-700">
              {workspace.body.deptCode} {workspace.body.deptName} · {doc.document_no}_{formatRevisionNo(doc.current_version - 1)}
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">{doc.process_name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              상태 {STATUS_LABEL[doc.status] ?? doc.status} · 작업 단계 {workspace.body.steps.length}개
            </p>
            <div className="mt-4">
              <DocumentApprovalStepper steps={workspace.lines.map(toStep)} />
              <RejectionRecord
                history={workspace.body.rejectionHistory}
                lines={workspace.lines}
              />
            </div>
            {workspace.editable ? (
              <div className="mt-4 grid gap-2 lg:grid-cols-[1fr_1fr_auto_auto]">
                <select
                  className="h-12 rounded-xl border border-slate-300 px-3 text-sm"
                  aria-label="검토자"
                  value={workspace.body.intendedReviewerId ?? ''}
                  onChange={(event) => workspace.setReviewer(event.target.value)}
                >
                  <option value="">검토자 선택</option>
                  {workspace.members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <select
                  className="h-12 rounded-xl border border-slate-300 px-3 text-sm"
                  aria-label="최종 승인자"
                  value={workspace.body.intendedApproverId ?? ''}
                  onChange={(event) => workspace.setApprover(event.target.value)}
                >
                  <option value="">최종 승인자 선택</option>
                  {workspace.members.map((member) => (
                    <option key={`approver-${member.userId}`} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <button type="button" className="h-12 rounded-xl border border-slate-300 px-4 text-sm font-bold" onClick={() => void workspace.save()} disabled={workspace.busy}>
                  초안 저장
                </button>
                <button type="button" className="h-12 rounded-xl bg-rose-700 px-4 text-sm font-bold text-white" onClick={() => void workspace.submit()} disabled={workspace.busy}>
                  {workspace.body.rejectionHistory.length > 0 ? '다시 검토 요청' : '검토 요청'}
                </button>
              </div>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 print:hidden">
              <h2 className="text-sm font-black text-slate-800">작업 단계 · 위험성평가</h2>
              {workspace.editable ? (
                <button type="button" className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white" onClick={workspace.addStep}>
                  단계 추가
                </button>
              ) : null}
            </div>
            <SopStepMatrixTable
              docNo={doc.document_no}
              steps={workspace.body.steps}
              editable={workspace.editable}
              onChange={workspace.setSteps}
            />
          </section>

          <SopProhibitedList
            actions={workspace.body.prohibitedActions}
            editable={workspace.editable}
            onChange={workspace.setProhibited}
          />
        </>
      ) : null}

      <SopNewDocumentModal
        open={showNew}
        existingDocNos={workspace.docs.map((item) => item.document_no)}
        onClose={() => setShowNew(false)}
        onCreate={(input) => workspace.createDoc(input)}
      />
      {doc ? (
        <SopReviseModal
          open={showRevise}
          docNo={doc.document_no}
          processName={doc.process_name}
          nextVersion={doc.current_version + 1}
          onClose={() => setShowRevise(false)}
          onRevise={(reason) => workspace.revise(reason, false)}
        />
      ) : null}
      <SopHistoryModal
        open={showHistory}
        docNo={doc?.document_no ?? ''}
        processName={doc?.process_name ?? ''}
        revisions={workspace.revisions}
        onClose={() => setShowHistory(false)}
        onOpen={(version) => workspace.setViewVersion(version)}
      />
    </div>
  );
};
