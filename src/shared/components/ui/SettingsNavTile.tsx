import type { FC, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface Props {
  title: string;
  hint?: string;
  icon: ReactNode;
  onClick: () => void;
}

/** 설정 허브 메뉴. 2열 그리드 칸 안의 44px 타일. */
export const SettingsNavTile: FC<Props> = ({ title, hint, icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left min-h-[44px] hover:border-teal-400 hover:bg-slate-50 active:bg-slate-100"
  >
    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold text-slate-900">{title}</span>
      {hint ? <span className="mt-0.5 block text-xs text-slate-500">{hint}</span> : null}
    </span>
    <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
  </button>
);
