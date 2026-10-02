import React from 'react';
import { SummaryMetricCard } from '@/shared/components';
import { formatCurrency } from '@/utils/formatters';
import { TuitionStats } from './tuitionViewTypes';

interface TuitionSummaryCardsProps {
  selectedMonth: string;
  stats: TuitionStats;
}

export const TuitionSummaryCards: React.FC<TuitionSummaryCardsProps> = ({
  selectedMonth,
  stats
}) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
    <SummaryMetricCard
      label={`총 청구액 (${selectedMonth})`}
      value={formatCurrency(stats.totalBilled)}
      subtitle={`발행 청구서 ${stats.totalCount}건`}
    />
    <SummaryMetricCard
      label="수납 완료액"
      value={formatCurrency(stats.totalPaid)}
      variant="emerald"
      subtitle={`수납률 ${stats.collectionRate}%`}
    />
    <SummaryMetricCard
      label="미납 수강료"
      value={formatCurrency(stats.totalUnpaid)}
      variant="rose"
      subtitle={`미납 ${stats.unpaidCount}건`}
    />
    <div className="p-4 rounded-2xl border border-indigo-200 shadow-xs bg-indigo-50">
      <p className="text-xs text-indigo-700 font-semibold">수납 진행률</p>
      <div className="w-full bg-indigo-200 h-3 rounded-full overflow-hidden mt-2">
        <div
          className="bg-indigo-600 h-full rounded-full transition-all"
          style={{ width: `${stats.collectionRate}%` }}
        />
      </div>
      <p className="text-[11px] text-indigo-700 font-bold text-right mt-1">{stats.collectionRate}% 완료</p>
    </div>
  </div>
);
