import React from 'react';
import { Boxes, ShoppingBag, History } from 'lucide-react';
import { SubTab } from '../textbookViewTypes';

interface TabItem {
  id: SubTab;
  icon: React.ReactNode;
  label: string;
  badge?: React.ReactNode;
}

interface TextbookSubTabNavProps {
  activeSubTab: SubTab;
  onSubTabChange: (tab: SubTab) => void;
  textbooksCount: number;
  salesCount: number;
  transactionsCount: number;
  unpaidSalesCount?: number;
}

export const TextbookSubTabNav: React.FC<TextbookSubTabNavProps> = ({
  activeSubTab,
  onSubTabChange,
  textbooksCount,
  salesCount,
  transactionsCount,
  unpaidSalesCount = 0,
}) => {
  // activeSubTab이 'payments'인 경우도 'sales'와 동일하게 통합 뷰로 처리
  const currentTab = activeSubTab === 'payments' ? 'sales' : activeSubTab;

  const tabs: TabItem[] = [
    {
      id: 'inventory',
      icon: <Boxes className="w-4 h-4 shrink-0" />,
      label: `교재 및 재고 (${textbooksCount})`,
    },
    {
      id: 'sales',
      icon: <ShoppingBag className="w-4 h-4 shrink-0" />,
      label: `학생 배부 및 수납 (${salesCount})`,
      badge:
        unpaidSalesCount > 0 ? (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
            미납 {unpaidSalesCount}
          </span>
        ) : undefined,
    },
    {
      id: 'history',
      icon: <History className="w-4 h-4 shrink-0" />,
      label: `입출고 기록 (${transactionsCount})`,
    },
  ];

  return (
    <div className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSubTabChange(tab.id)}
            className={`py-2 px-3 sm:px-4 text-xs font-bold flex items-center gap-2 rounded-xl transition-all whitespace-nowrap shrink-0 min-h-[44px] sm:min-h-[40px] cursor-pointer ${
              isActive
                ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/60 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge}
          </button>
        );
      })}
    </div>
  );
};
