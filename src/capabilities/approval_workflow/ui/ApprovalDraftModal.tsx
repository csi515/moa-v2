import React, { useEffect, useState } from 'react';
import type { ApprovalMemberOption, SavedApprovalLine } from '../services/approvalWorkflowService';
import { readRejectionHistory } from '../domain/approvalLine';
import { ApprovalLinePicker } from './ApprovalLinePicker';
import { useAsyncLock } from '@/shared/hooks';

type Props = {
  open: boolean;
  mode: 'create' | 'resubmit';
  members: ApprovalMemberOption[];
  savedLines?: SavedApprovalLine[];
  initialTitle?: string;
  initialAmount?: number;
  initialDescription?: string;
  initialReviewerId?: string;
  initialApproverId?: string;
  content?: Record<string, unknown> | null;
  busy?: boolean;
  onClose: () => void;
  onSaveLine?: (input: {
    title: string;
    reviewerId: string;
    approverId: string;
  }) => Promise<void> | void;
  onDeleteLine?: (lineId: string) => Promise<void> | void;
  onSubmit: (input: {
    title: string;
    amount: number;
    description: string;
    reviewerId: string;
    approverId: string;
  }) => void;
};

export const ApprovalDraftModal: React.FC<Props> = ({
  open,
  mode,
  members,
  savedLines = [],
  initialTitle = '',
  initialAmount = 0,
  initialDescription = '',
  initialReviewerId = '',
  initialApproverId = '',
  content,
  busy = false,
  onClose,
  onSaveLine,
  onDeleteLine,
  onSubmit,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [amount, setAmount] = useState(initialAmount);
  const [description, setDescription] = useState(initialDescription);
  const [reviewerId, setReviewerId] = useState(initialReviewerId);
  const [approverId, setApproverId] = useState(initialApproverId);
  const [selectedLineId, setSelectedLineId] = useState('');
  const { isLocked, runWithLock } = useAsyncLock({ cooldownMs: 500 });

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle);
    setAmount(initialAmount);
    setDescription(initialDescription);
    setReviewerId(initialReviewerId);
    setApproverId(initialApproverId);
    setSelectedLineId('');
  }, [open, initialTitle, initialAmount, initialDescription, initialReviewerId, initialApproverId]);

  if (!open) return null;

  const history = readRejectionHistory(content ?? undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 sm:items-center sm:justify-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-xl sm:max-w-lg sm:rounded-2xl">
        <h2 className="text-lg font-bold text-slate-900">
          {mode === 'resubmit' ? '반려 문서 수정·재상신' : '신규 전자결재 기안'}
        </h2>
        {history.length > 0 ? (
          <ol className="mt-3 space-y-2">
            {history.map((note) => (
              <li key={note.id} className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-950">
                <p className="font-bold">{note.stepLabel} 반려</p>
                <p className="mt-1 whitespace-pre-wrap">{note.reason}</p>
              </li>
            ))}
          </ol>
        ) : null}
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void runWithLock(async () => {
              await onSubmit({ title, amount, description, reviewerId, approverId });
            });
          }}
        >
          <label className="block text-xs font-semibold text-slate-700">
            기안 제목 *
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 h-12 w-full rounded-lg border border-slate-200 px-3 text-sm"
              placeholder="예: 3분기 사무용품 구매 품의"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            품의 금액 (원)
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1 h-12 w-full rounded-lg border border-slate-200 px-3 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            기안 상세 내용
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          {onSaveLine ? (
            <ApprovalLinePicker
              lines={savedLines}
              selectedId={selectedLineId}
              busy={busy}
              canSave={Boolean(reviewerId && approverId && reviewerId !== approverId)}
              onSelect={(lineId) => {
                setSelectedLineId(lineId);
                const line = savedLines.find((row) => row.id === lineId);
                if (!line) return;
                setReviewerId(line.reviewer.userId);
                setApproverId(line.approver.userId);
              }}
              onSave={async (lineTitle) => {
                await onSaveLine({ title: lineTitle, reviewerId, approverId });
              }}
              onDelete={
                onDeleteLine
                  ? async (lineId) => {
                      await onDeleteLine(lineId);
                      if (selectedLineId === lineId) setSelectedLineId('');
                    }
                  : undefined
              }
            />
          ) : null}

          <label className="block text-xs font-semibold text-slate-700">
            검토자 *
            <select
              required
              value={reviewerId}
              onChange={(e) => {
                setSelectedLineId('');
                setReviewerId(e.target.value);
              }}
              className="mt-1 h-12 w-full rounded-lg border border-slate-200 px-3 text-sm"
              aria-label="검토자"
            >
              <option value="">검토자 선택</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            최종 승인자 *
            <select
              required
              value={approverId}
              onChange={(e) => {
                setSelectedLineId('');
                setApproverId(e.target.value);
              }}
              className="mt-1 h-12 w-full rounded-lg border border-slate-200 px-3 text-sm"
              aria-label="최종 승인자"
            >
              <option value="">최종 승인자 선택</option>
              {members.map((member) => (
                <option key={`approver-${member.userId}`} value={member.userId}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="h-12 flex-1 rounded-xl border border-slate-200 text-sm font-medium text-slate-600"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={busy || isLocked}
              className="h-12 flex-1 rounded-xl bg-indigo-600 text-sm font-medium text-white disabled:opacity-50"
            >
              {mode === 'resubmit' ? '다시 상신' : '상신'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
