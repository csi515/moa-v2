import React from 'react';

export interface FilterTabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface FilterTabsProps<T extends string> {
  tabs: FilterTabItem<T>[];
  active: T;
  onChange: (id: any) => void;
  activeClassName?: string;
  inactiveClassName?: string;
  /** 탭 버튼에 추가할 클래스 (예: min-h-[44px]) */
  className?: string;
}

export function FilterTabs<T extends string>({
  tabs,
  active,
  onChange,
  activeClassName = 'bg-slate-900 text-white shadow-xs',
  inactiveClassName = 'bg-slate-100 text-slate-600 hover:bg-slate-200/80',
  className = '',
}: FilterTabsProps<T>) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 sm:flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`shrink-0 min-h-[36px] px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
            active === tab.id ? activeClassName : inactiveClassName
          } ${className}`}
        >
          <span>{tab.label}</span>
          {tab.count !== undefined && <span className="ml-1 opacity-80">({tab.count})</span>}
        </button>
      ))}
    </div>
  );
}
