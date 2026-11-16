import React, { useEffect, useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { MboService } from '../services/mboService';
import { formatRevisionHistory, type FormattedRevisionItem } from '../domain/mboVisibilityEngine';

interface Props {
  open: boolean;
  goalId: string;
  currentTargetValue?: number | null;
  currentDueDate?: string | null;
  onClose: () => void;
}

export const MboRevisionTimelineModal: React.FC<Props> = ({
  open,
  goalId,
  currentTargetValue,
  currentDueDate,
  onClose,
}) => {
  const [items, setItems] = useState<FormattedRevisionItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !goalId) return;
    setError(null);
    void MboService.listGoalRevisions(goalId)
      .then((rows) => {
        setItems(
          formatRevisionHistory(
            rows.map((row) => ({
              id: row.id,
              previousTargetValue: row.previous_target_value,
              previousDueDate: row.previous_due_date,
              unmetReason: row.unmet_reason,
              revisionReason: row.revision_reason,
              revisedBy: row.revised_by,
              createdAt: row.created_at,
            })),
            { targetValue: currentTargetValue, dueDate: currentDueDate },
          ),
        );
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : '이력을 불러오지 못했습니다.');
      });
  }, [open, goalId, currentTargetValue, currentDueDate]);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="수정 이력 비교 타임라인"
      maxWidth="lg"
      intent="view"
    >
      <div className="space-y-3">
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {items.length === 0 && !error ? (
          <p className="text-sm text-slate-500">수정 이력이 없습니다.</p>
        ) : (
          <ol className="space-y-3">
            {items.map((item, index) => (
              <li key={item.id} className="rounded-xl border p-3 text-sm">
                <p className="font-semibold">#{index + 1} · {new Date(item.createdAt).toLocaleString('ko-KR')}</p>
                <p className="mt-1 text-slate-700">목표치: {item.targetDiff}</p>
                <p className="text-slate-700">마감일: {item.dueDateDiff}</p>
                <p className="mt-2 text-xs text-slate-500">미달 사유: {item.unmetReason}</p>
                <p className="text-xs text-slate-500">수정 사유: {item.revisionReason}</p>
                <p className="text-xs text-slate-400">수정자: {item.revisedBy.slice(0, 8)}…</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Modal>
  );
};
