import React from 'react';
import { Boxes, ShoppingBag, CreditCard, History } from 'lucide-react';
import { SubTab } from '../textbookViewTypes';

interface TabItem {
  id: SubTab;
  icon: React.ReactNode;
  shortLabel: string;
  fullLabel: string;
}

interface TextbookSubTabNavProps {
  activeSubTab: SubTab;
  onSubTabChange: (tab: SubTab) => void;
  textbooksCount: number;
  salesCount: number;
  transactionsCount: number;
}

export const TextbookSubTabNav: React.FC<TextbookSubTabNavProps> = ({
  activeSubTab,
  onSubTabChange,
  textbooksCount,
  salesCount,
  transactionsCount
}) => {
  const tabs: TabItem[] = [
    {
      id: 'inventory',
      icon: <Boxes className="w-4 h-4 shrink-0" />,
      shortLabel: `재고 (${textbooksCount})`,
      fullLabel: `교재 목록 및 재고 관리 (${textbooksCount})`,
    },
    {
      id: 'sales',
      icon: <ShoppingBag className="w-4 h-4 shrink-0" />,
      shortLabel: `판매 (${salesCount})`,
      fullLabel: `교재 판매 내역 (${salesCount})`,
    },
    {
      id: 'payments',
      icon: <CreditCard className="w-4 h-4 shrink-0" />,
      shortLabel: '수납',
      fullLabel: '교재비 수납 / 분할 납부',
    },
    {
      id: 'history',
      icon: <History className="w-4 h-4 shrink-0" />,
      shortLabel: `이력 (${transactionsCount})`,
      fullLabel: `입출고 및 재고 변동 이력 (${transactionsCount})`,
    },
  ];

  return (
    <div className="border-b border-slate-200 lg:border-b-0 lg:bg-slate-50 lg:p-2 lg:rounded-2xl lg:border lg:border-slate-200 flex items-center gap-1 lg:gap-2 overflow-x-auto lg:overflow-visible lg:flex-wrap no-scrollbar">
      {tabs.map((tab) => {
        const isActive = activeSubTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSubTabChange(tab.id)}
            title={tab.fullLabel}
            className={`py-3 px-3 sm:px-4 text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer min-h-[44px] lg:min-h-0 ${
              isActive
                ? 'border-b-2 lg:border-b-0 border-indigo-600 text-indigo-600 lg:bg-indigo-600 lg:text-white lg:rounded-xl lg:shadow-xs'
                : 'border-b-2 lg:border-b-0 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 lg:hover:text-slate-700 lg:bg-white lg:border lg:border-slate-200 lg:rounded-xl lg:hover:bg-slate-50'
            }`}
          >
            {tab.icon}
            <span className="hidden xl:inline">{tab.fullLabel}</span>
            <span className="xl:hidden">{tab.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
};
