import React from 'react';
import { CreditCard, Search, Users } from 'lucide-react';
import { ViewMode } from './tuitionViewTypes';
import type { MonthlyTuitionWorkFilter } from '@/capabilities/billing/finance';

interface MonthOption {
  value: string;
  label: string;
}

interface TuitionFilterBarProps {
  customerLabel: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedMonth: string;
  onSelectedMonthChange: (month: string) => void;
  monthOptions: MonthOption[];
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  combinedStatusFilter?: MonthlyTuitionWorkFilter;
  onCombinedStatusFilterChange?: (status: MonthlyTuitionWorkFilter) => void;
  combinedStatusCounts?: Record<MonthlyTuitionWorkFilter, number>;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  filteredInvoicesCount: number;
  studentsCount: number;
  unpaidCount?: number;
  isUnpaidActive?: boolean;
  onToggleUnpaidFilter?: () => void;
}

export const TuitionFilterBar: React.FC<TuitionFilterBarProps> = ({
  customerLabel,
  viewMode,
  onViewModeChange,
  selectedMonth,
  onSelectedMonthChange,
  monthOptions,
  statusFilter,
  onStatusFilterChange,
  combinedStatusFilter = 'all',
  onCombinedStatusFilterChange,
  combinedStatusCounts,
  searchQuery,
  onSearchQueryChange,
  filteredInvoicesCount,
  studentsCount,
}) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-2.5 sm:p-3 space-y-2.5 shadow-2xs">
      {/* 상단 줄 (Row 1): 뷰 전환 세그먼트 + 월 선택 + 검색 인풋 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-100 pb-2.5">
        {/* 좌측: 뷰 전환 언더라인/세그먼트 컨트롤 */}
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-md shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange('combined')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'combined'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>대상별 통합 수납</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('invoices')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'invoices'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
            <span>청구서별 내역</span>
          </button>
        </div>

        {/* 우측: 월 선택 드롭다운 & 검색창 */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <select
            value={selectedMonth}
            onChange={(e) => onSelectedMonthChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-800 focus:border-slate-400 focus:outline-none shrink-0"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`${customerLabel} 이름 검색...`}
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 하단 줄 (Row 2): 상태 필터 세그먼트 + 건수 표시 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-0.5">
        {/* 좌측: 상태 필터 세그먼트 */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {viewMode === 'combined' ? (
            <>
              {[
                { id: 'all', label: '전체', count: combinedStatusCounts?.all ?? studentsCount },
                { id: 'paid', label: '납부완료', count: combinedStatusCounts?.paid ?? 0 },
                { id: 'unpaid', label: '미납', count: combinedStatusCounts?.unpaid ?? 0 },
                { id: 'no_invoice', label: '청구서 없음', count: combinedStatusCounts?.no_invoice ?? 0 },
              ].map((chip) => {
                const active = combinedStatusFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => onCombinedStatusFilterChange?.(chip.id as MonthlyTuitionWorkFilter)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition shrink-0 cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                    }`}
                  >
                    {chip.label} <span className="tabular-nums font-normal opacity-80">{chip.count}</span>
                  </button>
                );
              })}
            </>
          ) : (
            <>
              {[
                { id: 'ALL', label: '전체' },
                { id: 'paid', label: '납부완료' },
                { id: 'unpaid', label: '미납' },
                { id: 'partial', label: '일부납' },
                { id: 'overdue', label: '연체' },
              ].map((chip) => {
                const active = statusFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => onStatusFilterChange(chip.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition shrink-0 cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* 우측: 건수 요약 */}
        <div className="text-xs text-slate-500 font-medium shrink-0 self-end sm:self-auto">
          {viewMode === 'combined' ? (
            <>총 <strong className="text-slate-800 tabular-nums">{studentsCount}</strong>명</>
          ) : (
            <>총 <strong className="text-slate-800 tabular-nums">{filteredInvoicesCount}</strong>건</>
          )}
        </div>
      </div>
    </div>
  );
};
