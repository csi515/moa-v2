import React from 'react';
import { SummaryMetricCard } from '@/shared/components';
import { formatCurrency } from '@/utils/formatters';
import { TextbookStats } from '../textbookViewTypes';

interface TextbookSummaryCardsProps {
  stats: TextbookStats;
  currentYM: string;
  onLowStockClick: () => void;
}

export const TextbookSummaryCards: React.FC<TextbookSummaryCardsProps> = ({
  stats,
  currentYM,
  onLowStockClick
}) => {
  const collectionRate =
    stats.monthlySaleAmount > 0
      ? Math.round((stats.monthlyPaidAmount / stats.monthlySaleAmount) * 100)
      : 100;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <SummaryMetricCard
        label="이번달 교재 판매액"
        value={formatCurrency(stats.monthlySaleAmount)}
        subtitle={`${currentYM}월 누적`}
      />
      <SummaryMetricCard
        label="이번달 교재비 수납액"
        value={formatCurrency(stats.monthlyPaidAmount)}
        variant="emerald"
        subtitle={`수납률 ${collectionRate}%`}
      />
      <SummaryMetricCard
        label="전체 교재비 미납액"
        value={formatCurrency(stats.totalUnpaidAmount)}
        variant="rose"
        subtitle={`미납 학생 ${stats.unpaidStudentsCount}명`}
      />
      <SummaryMetricCard
        label="이번달 판매 권수"
        value={`${stats.monthlyBooksSold}권`}
        variant="amber"
        subtitle="학생 출고 완료"
      />
      <SummaryMetricCard
        label="재고 부족 교재"
        value={`${stats.lowStockBooksCount}종`}
        variant={stats.lowStockBooksCount > 0 ? 'amber' : 'default'}
        subtitle={stats.lowStockBooksCount > 0 ? '클릭하여 발주 대상 확인' : '재고 상태 양호'}
        onClick={onLowStockClick}
        className={`col-span-2 lg:col-span-1 ${stats.lowStockBooksCount > 0 ? 'ring-1 ring-amber-200' : ''}`}
      />
    </div>
  );
};
