import React, { useState } from 'react';
import type { SavedApprovalLine } from '../services/approvalWorkflowService';

type Props = {
  lines: SavedApprovalLine[];
  selectedId: string;
  busy?: boolean;
  canSave: boolean;
  onSelect: (lineId: string) => void;
  onSave: (title: string) => Promise<void> | void;
  onDelete?: (lineId: string) => Promise<void> | void;
};

export const ApprovalLinePicker: React.FC<Props> = ({
  lines,
  selectedId,
  busy = false,
  canSave,
  onSelect,
  onSave,
  onDelete,
}) => {
  const [saveOpen, setSaveOpen] = useState(false);
  const [lineTitle, setLineTitle] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">저장된 결재선</p>
        <button
          type="button"
          disabled={busy || !canSave}
          onClick={() => {
            setLineTitle('');
            setSaveOpen(true);
          }}
          className="h-9 rounded-lg bg-white px-3 text-xs font-semibold text-slate-700 border border-slate-200 disabled:opacity-50"
        >
          현재 결재선 저장
        </button>
      </div>
      <select
        aria-label="저장된 결재선"
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
        disabled={busy}
      >
        <option value="">직접 선택</option>
        {lines.map((line) => (
          <option key={line.id} value={line.id}>
            {line.title} ({line.reviewer.name} → {line.approver.name})
          </option>
        ))}
      </select>
      {selectedId && onDelete ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void onDelete(selectedId)}
          className="h-9 text-xs font-semibold text-rose-700"
        >
          선택한 결재선 삭제
        </button>
      ) : null}

      {saveOpen ? (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
          <label className="block text-xs font-semibold text-slate-700">
            결재선 이름
            <input
              value={lineTitle}
              onChange={(e) => setLineTitle(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
              placeholder="예: 구매 기본 결재선"
              maxLength={80}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="h-10 flex-1 rounded-lg border border-slate-200 text-xs font-medium"
              onClick={() => setSaveOpen(false)}
              disabled={saving}
            >
              취소
            </button>
            <button
              type="button"
              className="h-10 flex-1 rounded-lg bg-slate-900 text-xs font-semibold text-white disabled:opacity-50"
              disabled={saving || !lineTitle.trim()}
              onClick={() => {
                setSaving(true);
                void Promise.resolve(onSave(lineTitle.trim()))
                  .then(() => setSaveOpen(false))
                  .finally(() => setSaving(false));
              }}
            >
              저장
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
