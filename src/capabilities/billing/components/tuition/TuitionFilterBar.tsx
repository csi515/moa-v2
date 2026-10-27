import React from 'react';
import { CreditCard, Search, Users, AlertTriangle } from 'lucide-react';
import { FilterBar } from '@/shared/components';
import { ViewMode } from './tuitionViewTypes';

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
  searchQuery,
  onSearchQueryChange,
  filteredInvoicesCount,
  studentsCount,
  unpaidCount,
  isUnpaidActive,
  onToggleUnpaidFilter,
}) => {
  const activeUnpaid = isUnpaidActive ?? (statusFilter === 'unpaid');
  const handleToggle = onToggleUnpaidFilter ?? (() => {
    onViewModeChange('invoices');
    onStatusFilterChange(statusFilter === 'unpaid' ? 'ALL' : 'unpaid');
  });

  return (
    <div className="space-y-3">
      <FilterBar className="gap-2">
        <button
          onClick={() => onViewModeChange('invoices')}
          title="수강료 청구 목록"
          className={`px-3 sm:px-4 py-2 min-h-[44px] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            viewMode === 'invoices' && !activeUnpaid
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4 shrink-0" />
          <span className="hidden lg:inline">청구 목록 ({filteredInvoicesCount})</span>
          <span className="lg:hidden">목록 ({filteredInvoicesCount})</span>
        </button>
        <button
          onClick={() => onViewModeChange('combined')}
          title={`${customerLabel}별 월간 통합 청구 및 수납`}
          className={`px-3 sm:px-4 py-2 min-h-[44px] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            viewMode === 'combined' && !activeUnpaid
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span className="hidden lg:inline">통합 청구 ({studentsCount})</span>
          <span className="lg:hidden">통합 ({studentsCount})</span>
        </button>

        {/* 미납·연체 모아보기 퀵 필터 버튼 */}
        <button
          type="button"
          onClick={handleToggle}
          title="미납 및 연체 청구 내역만 모아서 확인합니다"
          className={`px-3 sm:px-4 py-2 min-h-[44px] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border ${
            activeUnpaid
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
          }`}
        >
          <AlertTriangle className={`w-4 h-4 shrink-0 ${activeUnpaid ? 'text-white' : 'text-rose-500'}`} />
          <span>미납·연체 모아보기{typeof unpaidCount === 'number' && unpaidCount > 0 ? ` (${unpaidCount})` : ''}</span>
        </button>
      </FilterBar>

      <FilterBar className="justify-between">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <select
            value={selectedMonth}
            onChange={(e) => onSelectedMonthChange(e.target.value)}
            className="px-3.5 py-2 min-h-[44px] text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {viewMode === 'invoices' && (
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="px-3.5 py-2 min-h-[44px] text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-semibold"
            >
              <option value="ALL">전체 상태</option>
              <option value="unpaid">미납 전체 (잔액 있음)</option>
              <option value="paid">수납 완료</option>
              <option value="partial">일부 납부</option>
              <option value="overdue">연체/기한초과</option>
            </select>
          )}

          <div className="relative flex-1 min-w-[160px] sm:min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`${customerLabel} 이름 검색...`}
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full pl-8 pr-3 py-2 min-h-[44px] text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <span className="text-xs text-slate-500 font-medium shrink-0">
          {viewMode === 'invoices' ? (
            <>조회: <strong className="text-slate-900">{filteredInvoicesCount}건</strong></>
          ) : (
            <>재원: <strong className="text-slate-900">{studentsCount}명</strong></>
          )}
        </span>
      </FilterBar>
    </div>
  );
};
