import type { FC } from 'react';
import { ClipboardList } from 'lucide-react';
import type { NavTab } from '@/context/AppContext';
import { DirectorSectionEmpty } from './DirectorSectionEmpty';

export interface DirectorTodayTaskItem {
  id: string;
  label: string;
  count: number;
  tab: NavTab;
  tone?: 'indigo' | 'amber' | 'rose' | 'emerald';
}

interface DirectorTodayTasksSectionProps {
  items: DirectorTodayTaskItem[];
  onOpen: (item: DirectorTodayTaskItem) => void;
}

const TONE: Record<NonNullable<DirectorTodayTaskItem['tone']>, string> = {
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  amber: 'bg-amber-50 text-amber-800 border-amber-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

/** 원장 홈 — 상담·등록·보강 등 처리 대기 */
export const DirectorTodayTasksSection: FC<DirectorTodayTasksSectionProps> = ({
  items,
  onOpen,
}) => {
  const actionable = items.filter((item) => item.count > 0);
  const total = actionable.reduce((sum, item) => sum + item.count, 0);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
      <div>
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-indigo-600 shrink-0" />
          처리할 업무
        </h3>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {total > 0
            ? `${total}건 대기 중 · 항목을 누르면 처리 화면으로 이동합니다`
            : '지금 대기 중인 요청이 없습니다'}
        </p>
      </div>

      {actionable.length === 0 ? (
        <DirectorSectionEmpty className="py-5">처리할 업무가 없습니다.</DirectorSectionEmpty>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {actionable.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onOpen(item)}
                className={`w-full text-left px-3 py-3 min-h-[52px] rounded-xl border flex items-center justify-between gap-2 ${
                  TONE[item.tone ?? 'indigo']
                }`}
              >
                <span className="text-sm font-bold truncate">{item.label}</span>
                <span className="shrink-0 text-sm font-black tabular-nums">{item.count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
