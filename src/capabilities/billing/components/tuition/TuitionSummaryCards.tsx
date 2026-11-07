import React from 'react';
import { SummaryMetricCard } from '@/shared/components';
import { formatCurrency } from '@/utils/formatters';
import { TuitionStats } from './tuitionViewTypes';
import { Check, Filter } from 'lucide-react';

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
    // 이미 활성화된 필터를 다시 누르면 'all'로 토글 (미납/완납 해제)
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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* 1. 총 청구액 (전체 보기) */}
      <div className="relative group">
        <SummaryMetricCard
          label={`총 청구액 (${selectedMonth})`}
          value={formatCurrency(stats.totalBilled)}
          subtitle={
            isAllActive
              ? `전체 ${stats.totalCount}건 표시 중`
              : `발행 청구서 ${stats.totalCount}건 (클릭 시 전체)`
          }
          onClick={isInteractive ? () => handleCardClick('all') : undefined}
          className={`transition-all duration-150 ${
            isInteractive ? 'hover:border-slate-300 hover:shadow-xs' : ''
          } ${
            isAllActive
              ? 'ring-2 ring-indigo-500/80 border-indigo-300 bg-indigo-50/20 shadow-xs'
              : 'opacity-90 hover:opacity-100'
          }`}
        />
        {isInteractive && isAllActive && (
          <span className="absolute top-2.5 right-2.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 pointer-events-none">
            <Check className="w-2.5 h-2.5" /> 전체
          </span>
        )}
      </div>

      {/* 2. 수납 완료액 (완납만 필터링) */}
      <div className="relative group">
        <SummaryMetricCard
          label="수납 완료액"
          value={formatCurrency(stats.totalPaid)}
          variant="emerald"
          subtitle={
            isPaidActive
              ? `완납 내역만 필터링 중`
              : `수납률 ${stats.collectionRate}% (클릭 시 완납만)`
          }
          onClick={isInteractive ? () => handleCardClick('paid') : undefined}
          className={`transition-all duration-150 ${
            isInteractive ? 'hover:border-emerald-300 hover:shadow-xs' : ''
          } ${
            isPaidActive
              ? 'ring-2 ring-emerald-500/90 border-emerald-400 bg-emerald-50/90 shadow-xs scale-[1.01]'
              : 'opacity-90 hover:opacity-100'
          }`}
        />
        {isInteractive && (
          <span
            className={`absolute top-2.5 right-2.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-opacity pointer-events-none ${
              isPaidActive
                ? 'bg-emerald-200 text-emerald-900 opacity-100'
                : 'bg-emerald-100/60 text-emerald-700 opacity-0 group-hover:opacity-100'
            }`}
          >
            {isPaidActive ? (
              <>
                <Check className="w-2.5 h-2.5" /> 완납 필터
              </>
            ) : (
              <>
                <Filter className="w-2.5 h-2.5" /> 완납 보기
              </>
            )}
          </span>
        )}
      </div>

      {/* 3. 미납 수강료 (미납만 필터링) */}
      <div className="relative group">
        <SummaryMetricCard
          label="미납 수강료"
          value={formatCurrency(stats.totalUnpaid)}
          variant="rose"
          subtitle={
            isUnpaidActive
              ? `미납 ${stats.unpaidCount}건 필터링 중`
              : `미납 ${stats.unpaidCount}건 (클릭 시 미납만)`
          }
          onClick={isInteractive ? () => handleCardClick('unpaid') : undefined}
          className={`transition-all duration-150 ${
            isInteractive ? 'hover:border-rose-300 hover:shadow-xs' : ''
          } ${
            isUnpaidActive
              ? 'ring-2 ring-rose-500/90 border-rose-400 bg-rose-50/90 shadow-xs scale-[1.01]'
              : 'opacity-90 hover:opacity-100'
          }`}
        />
        {isInteractive && (
          <span
            className={`absolute top-2.5 right-2.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-opacity pointer-events-none ${
              isUnpaidActive
                ? 'bg-rose-200 text-rose-900 opacity-100'
                : 'bg-rose-100/70 text-rose-700 opacity-0 group-hover:opacity-100'
            }`}
          >
            {isUnpaidActive ? (
              <>
                <Check className="w-2.5 h-2.5" /> 미납 필터
              </>
            ) : (
              <>
                <Filter className="w-2.5 h-2.5" /> 미납 보기
              </>
            )}
          </span>
        )}
      </div>

      {/* 4. 수납 진행률 (진행 게이지) */}
      <div
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onClick={isInteractive ? () => handleCardClick('all') : undefined}
        onKeyDown={
          isInteractive
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick('all');
                }
              }
            : undefined
        }
        className={`p-3.5 sm:p-4 rounded-2xl border border-indigo-200 shadow-2xs bg-indigo-50/70 flex flex-col justify-between transition-all duration-150 ${
          isInteractive ? 'cursor-pointer hover:shadow-xs hover:border-indigo-300' : ''
        }`}
        title={isInteractive ? '수납 현황 전체 조회' : undefined}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs text-indigo-700 font-bold truncate">수납 진행률</p>
          <span className="text-[11px] font-extrabold text-indigo-800 tabular-nums">
            {stats.collectionRate}%
          </span>
        </div>
        <div className="w-full bg-indigo-200/80 h-2.5 rounded-full overflow-hidden my-1.5">
          <div
            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, stats.collectionRate))}%` }}
          />
        </div>
        <p className="text-[11px] text-indigo-600/90 font-medium text-right truncate">
          {stats.totalCount > 0
            ? `${stats.totalCount - stats.unpaidCount}/${stats.totalCount}건 납부`
            : '청구 내역 없음'}
        </p>
      </div>
    </div>
  );
};
