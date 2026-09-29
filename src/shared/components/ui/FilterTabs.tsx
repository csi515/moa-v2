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
}

export function FilterTabs<T extends string>({
  tabs,
  active,
  onChange,
  activeClassName = 'bg-indigo-600 text-white',
  inactiveClassName = 'bg-slate-100 text-slate-600',
}: FilterTabsProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            active === tab.id ? activeClassName : inactiveClassName
          }`}
        >
          {tab.label}
          {tab.count !== undefined && ` (${tab.count})`}
        </button>
      ))}
    </div>
  );
}
