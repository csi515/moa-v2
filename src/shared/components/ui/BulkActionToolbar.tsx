import React, { type ReactNode } from 'react';
import { X, CheckSquare } from 'lucide-react';

export interface BulkActionItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'neutral' | 'success';
  disabled?: boolean;
}

export interface BulkActionToolbarProps {
  selectedCount: number;
  totalCount?: number;
  onClearSelection: () => void;
  actions: BulkActionItem[];
  itemName?: string;
  className?: string;
}

export const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
  selectedCount,
  totalCount,
  onClearSelection,
  actions,
  itemName = '항목',
  className = '',
}) => {
  if (selectedCount <= 0) return null;

  return (
    <aside
      aria-label="선택 항목 일괄 작업 바"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] sm:max-w-xl w-auto ${className}`}
    >
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-2 sm:gap-4 animate-in slide-in-from-bottom-4 duration-200">
        {/* 선택 카운터 */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/80 text-white flex items-center justify-center font-bold text-xs">
            <CheckSquare className="w-4 h-4" />
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-tight">
            <strong className="text-indigo-400 font-extrabold">{selectedCount}</strong>
            {totalCount ? ` / ${totalCount}` : ''}개 {itemName} 선택됨
          </span>
        </div>

        <div className="h-4 w-px bg-slate-700 shrink-0" />

        {/* 액션 버튼 그룹 */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
          {actions.map((act) => {
            let colorClass = 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700';
            if (act.variant === 'primary') {
              colorClass = 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-xs shadow-indigo-600/30';
            } else if (act.variant === 'danger') {
              colorClass = 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500';
            } else if (act.variant === 'success') {
              colorClass = 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500';
            }

            return (
              <button
                key={act.key}
                type="button"
                onClick={act.onClick}
                disabled={act.disabled}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${colorClass}`}
              >
                {act.icon && <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">{act.icon}</span>}
                <span>{act.label}</span>
              </button>
            );
          })}
        </div>

        <div className="h-4 w-px bg-slate-700 shrink-0" />

        {/* 선택 취소 버튼 */}
        <button
          type="button"
          onClick={onClearSelection}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0 cursor-pointer"
          title="선택 해제"
          aria-label="선택 해제"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
