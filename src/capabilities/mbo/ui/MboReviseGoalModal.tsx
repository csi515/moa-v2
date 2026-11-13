import React, { useState } from 'react';
import { X } from 'lucide-react';
import { MboService } from '../services/mboService';
import { showToast } from '@/shared/feedback/uiFeedback';

interface Props {
  open: boolean;
  goalId: string;
  currentTargetValue?: number | null;
  currentDueDate?: string | null;
  onClose: () => void;
  onRevised: () => void;
}

export const MboReviseGoalModal: React.FC<Props> = ({
  open,
  goalId,
  currentTargetValue,
  currentDueDate,
  onClose,
  onRevised,
}) => {
  const [targetValue, setTargetValue] = useState(String(currentTargetValue ?? ''));
  const [dueDate, setDueDate] = useState(currentDueDate ?? '');
  const [unmetReason, setUnmetReason] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <form
        className="w-full max-w-lg space-y-3 rounded-t-2xl bg-white p-4 sm:rounded-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          if (!unmetReason.trim() || !revisionReason.trim() || !dueDate) {
            showToast('미달 사유, 수정 사유, 마감일은 필수입니다.', 'warning');
            return;
          }
          setBusy(true);
          const finishLocal = () => {
            showToast('목표가 수정되었고 이력이 저장되었습니다.', 'success');
            onRevised();
            onClose();
          };
          // 로컬 샘플 목표(obj-*)는 RPC 대신 UI 상태만 갱신
          if (goalId.startsWith('obj-')) {
            finishLocal();
            setBusy(false);
            return;
          }
          void MboService.reviseGoal({
            goalId,
            newTargetValue: Number(targetValue),
            newDueDate: dueDate,
            unmetReason: unmetReason.trim(),
            revisionReason: revisionReason.trim(),
          })
            .then(finishLocal)
            .catch((cause) => {
              showToast.error(cause, '수정 실패');
            })
            .finally(() => setBusy(false));
        }}
      >
        <header className="flex items-center justify-between">
          <h2 className="text-base font-bold">월별 점검 및 계획 수정</h2>
          <button type="button" className="min-h-12 min-w-12" aria-label="닫기" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </header>
        <label className="block text-sm">
          신규 목표치
          <input
            className="mt-1 min-h-12 w-full rounded-lg border px-3"
            type="number"
            value={targetValue}
            onChange={(event) => setTargetValue(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          변경 마감일
          <input
            className="mt-1 min-h-12 w-full rounded-lg border px-3"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          미달성 사유 (원인 분석) *
          <textarea
            className="mt-1 min-h-24 w-full rounded-lg border px-3 py-2"
            value={unmetReason}
            onChange={(event) => setUnmetReason(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          목표/일정 수정 사유 *
          <textarea
            className="mt-1 min-h-24 w-full rounded-lg border px-3 py-2"
            value={revisionReason}
            onChange={(event) => setRevisionReason(event.target.value)}
            required
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="min-h-12 px-4" onClick={onClose}>취소</button>
          <button
            type="submit"
            disabled={busy}
            className="min-h-12 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white disabled:opacity-40"
          >
            수정 확정
          </button>
        </div>
      </form>
    </div>
  );
};
