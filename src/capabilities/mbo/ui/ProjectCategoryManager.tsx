import React, { useState } from 'react';
import { Plus, Archive, RotateCcw, Tag } from 'lucide-react';
import {
  listActiveCategories,
  validateCategoryDraft,
  type ProjectCategory,
} from '../domain/projectCategoryEngine';
import {
  archiveProjectCategory,
  createProjectCategory,
  renameProjectCategory,
  restoreProjectCategory,
} from '../services/projectCategoryService';
import { showToast } from '@/shared/feedback/uiFeedback';

type Props = {
  organizationId: string;
  categories: ProjectCategory[];
  onChanged: () => void;
  onClose: () => void;
};

export const ProjectCategoryManager: React.FC<Props> = ({
  organizationId,
  categories,
  onChanged,
  onClose,
}) => {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('#4f46e5');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const active = listActiveCategories(categories);
  const archived = categories.filter((c) => !c.isActive);

  const handleCreate = async () => {
    setError(null);
    const check = validateCategoryDraft({ label, color }, categories);
    if (!check.isValid) {
      setError(check.error ?? '입력 오류');
      return;
    }
    setBusy(true);
    try {
      await createProjectCategory(organizationId, { label, color }, categories);
      setLabel('');
      showToast('분류가 추가되었습니다.', 'success');
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '추가 실패');
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async (cat: ProjectCategory) => {
    const next = cat.label;
    if (!next) return;
    try {
      await renameProjectCategory(cat.id, organizationId, next, categories);
      showToast('이름이 변경되었습니다.', 'success');
      onChanged();
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : '변경 실패', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center" role="dialog" aria-modal>
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Tag className="h-5 w-5 text-indigo-600" />
              프로젝트 분류 관리
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              연구·품질·기술 등 분류를 사업장에서 자유롭게 추가·이름변경할 수 있습니다. 삭제는 보관(비활성)만 가능합니다.
            </p>
          </div>
          <button type="button" className="h-12 px-3 text-sm font-semibold text-slate-600" onClick={onClose}>
            닫기
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            className="h-12 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
            placeholder="새 분류 이름 (예: 기술대응)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <input
            type="color"
            className="h-12 w-14 rounded-lg border border-slate-300 p-1"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="분류 색상"
          />
          <button
            type="button"
            className="inline-flex h-12 items-center justify-center gap-1 rounded-xl bg-indigo-700 px-4 text-sm font-bold text-white"
            onClick={() => void handleCreate()}
            disabled={busy}
          >
            <Plus className="h-4 w-4" />
            추가
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}

        <ul className="mt-4 space-y-2">
          {active.map((cat) => (
            <li
              key={cat.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: cat.color || '#64748b' }}
                />
                <div>
                  <div className="text-sm font-bold text-slate-900">{cat.label}</div>
                  <div className="text-[10px] text-slate-400">{cat.categoryKey}</div>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="h-12 rounded-lg px-3 text-xs font-bold text-slate-700"
                  onClick={() => void handleRename(cat)}
                >
                  이름변경
                </button>
                <button
                  type="button"
                  className="inline-flex h-12 items-center gap-1 rounded-lg px-3 text-xs font-bold text-rose-700"
                  onClick={() => {
                    void archiveProjectCategory(cat.id, organizationId)
                      .then(() => {
                        showToast('분류를 보관했습니다. 기존 프로젝트는 유지됩니다.', 'info');
                        onChanged();
                      })
                      .catch((cause) => {
                        showToast(cause instanceof Error ? cause.message : '보관 실패', 'error');
                      });
                  }}
                >
                  <Archive className="h-3.5 w-3.5" />
                  보관
                </button>
              </div>
            </li>
          ))}
          {active.length === 0 ? (
            <li className="py-6 text-center text-sm text-slate-500">활성 분류가 없습니다. 위에서 추가하세요.</li>
          ) : null}
        </ul>

        <button
          type="button"
          className="mt-4 text-xs font-semibold text-slate-500 underline"
          onClick={() => setShowArchived((v) => !v)}
        >
          {showArchived ? '보관 목록 숨기기' : `보관된 분류 ${archived.length}건 보기`}
        </button>

        {showArchived ? (
          <ul className="mt-2 space-y-2">
            {archived.map((cat) => (
              <li
                key={cat.id}
                className="flex items-center justify-between rounded-xl border border-dashed border-slate-200 px-3 py-2 opacity-80"
              >
                <span className="text-sm text-slate-600">{cat.label}</span>
                <button
                  type="button"
                  className="inline-flex h-12 items-center gap-1 rounded-lg px-3 text-xs font-bold text-emerald-700"
                  onClick={() => {
                    void restoreProjectCategory(cat.id, organizationId)
                      .then(() => {
                        showToast('분류를 복구했습니다.', 'success');
                        onChanged();
                      })
                      .catch((cause) => {
                        showToast(cause instanceof Error ? cause.message : '복구 실패', 'error');
                      });
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  복구
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
};
