import React from 'react';
import { formatCurrency } from '@/utils/formatters';
import { TuitionStats } from './tuitionViewTypes';
import { Check } from 'lucide-react';

export type TuitionSummaryFilterType = 'all' | 'paid' | 'unpaid';

export interface TuitionSummaryCardsProps {
  selectedMonth: string;
  stats: TuitionStats;
  activeFilter?: TuitionSummaryFilterType;
  onFilterChange?: (filter: TuitionSummaryFilterType) => void;
}

export const TuitionSummaryCards: React.FC<TuitionSummaryCardsProps> = ({
  selectedMonth,
  stats,
  activeFilter = 'all',
  onFilterChange,
}) => {
  const isInteractive = Boolean(onFilterChange);

  const handleCardClick = (targetFilter: TuitionSummaryFilterType) => {
    if (!onFilterChange) return;
    if (activeFilter === targetFilter && targetFilter !== 'all') {
      onFilterChange('all');
    } else {
      onFilterChange(targetFilter);
    }
  };

  const isAllActive = activeFilter === 'all';
  const isPaidActive = activeFilter === 'paid';
  const isUnpaidActive = activeFilter === 'unpaid';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. 총 청구액 (전체) */}
      <div
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onClick={isInteractive ? () => handleCardClick('all') : undefined}
        className={`p-3.5 sm:p-4 rounded-lg border bg-white flex flex-col justify-between transition-colors shadow-2xs text-left ${
          isInteractive ? 'cursor-pointer hover:border-slate-300' : ''
        } ${
          isAllActive
            ? 'border-slate-900 ring-1 ring-slate-900/10 bg-slate-50/50'
            : 'border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">총 청구액 ({selectedMonth})</span>
          {isInteractive && isAllActive && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
              <Check className="w-2.5 h-2.5" /> 전체
            </span>
          )}
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums my-1">
          {formatCurrency(stats.totalBilled)}
        </div>
        <p className="text-[11px] text-slate-500 font-normal truncate">
          발행 청구서 {stats.totalCount}건
        </p>
      </div>

      {/* 2. 수납 완료액 (완납) */}
      <div
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onClick={isInteractive ? () => handleCardClick('paid') : undefined}
        className={`p-3.5 sm:p-4 rounded-lg border bg-white flex flex-col justify-between transition-colors shadow-2xs text-left ${
          isInteractive ? 'cursor-pointer hover:border-slate-300' : ''
        } ${
          isPaidActive
            ? 'border-slate-900 ring-1 ring-slate-900/10 bg-slate-50/50'
            : 'border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">수납 완료액</span>
          {isInteractive && isPaidActive && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
              <Check className="w-2.5 h-2.5" /> 완납
            </span>
          )}
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums my-1">
          {formatCurrency(stats.totalPaid)}
        </div>
        <p className="text-[11px] text-slate-500 font-normal truncate">
          수납률 {stats.collectionRate}%
        </p>
      </div>

      {/* 3. 미납 수강료 (미납 포인트) */}
      <div
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onClick={isInteractive ? () => handleCardClick('unpaid') : undefined}
        className={`p-3.5 sm:p-4 rounded-lg border bg-white flex flex-col justify-between transition-colors shadow-2xs text-left ${
          isInteractive ? 'cursor-pointer hover:border-slate-300' : ''
        } ${
          isUnpaidActive
            ? 'border-rose-400 ring-1 ring-rose-400/20 bg-rose-50/30'
            : 'border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">미납 금액</span>
          {isInteractive && isUnpaidActive && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
              <Check className="w-2.5 h-2.5" /> 미납
            </span>
          )}
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-rose-600 tabular-nums my-1">
          {formatCurrency(stats.totalUnpaid)}
        </div>
        <p className="text-[11px] text-rose-600/80 font-medium truncate">
          미납 {stats.unpaidCount}건
        </p>
      </div>

      {/* 4. 수납 진행률 (게이지) */}
      <div className="p-3.5 sm:p-4 rounded-lg border border-slate-200 bg-white flex flex-col justify-between shadow-2xs text-left">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">수납 진행률</span>
          <span className="text-xs font-bold text-slate-900 tabular-nums">
            {stats.collectionRate}%
          </span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden my-2">
          <div
            className="bg-slate-900 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, stats.collectionRate))}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-500 font-normal truncate">
          {stats.totalCount > 0
            ? `${stats.totalCount - stats.unpaidCount}/${stats.totalCount}건 납부 완료`
            : '청구 내역 없음'}
        </p>
      </div>
    </div>
  );
};
