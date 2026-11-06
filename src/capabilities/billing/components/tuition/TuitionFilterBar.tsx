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

const TUITION_STATUS_CHIPS = [
  { value: 'ALL', label: '전체 상태' },
  { value: 'unpaid', label: '미납' },
  { value: 'paid', label: '완납' },
  { value: 'partial', label: '일부납' },
  { value: 'overdue', label: '연체' },
];

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

  const handleViewModeClick = (mode: ViewMode) => {
    onViewModeChange(mode);
  };

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {/* 1. 상단 뷰 모드 탭 & 미납만 보기 토글 (모바일 가로 스와이프 지원) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
        {/* 1. 메인 뷰 스위처 (원생별 합산 vs 청구서별 건별) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
          <button
            type="button"
            onClick={() => handleViewModeClick('combined')}
            title={`${customerLabel} 1명 기준 수강료+교재비 총액 합산 수납`}
            className={`px-3 sm:px-4 py-2 min-h-[40px] text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              viewMode === 'combined'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>{customerLabel}별 합산 ({studentsCount}명)</span>
          </button>
          <button
            type="button"
            onClick={() => handleViewModeClick('invoices')}
            title="청구서 1장당 1줄씩 개별 영수증 내역 표시"
            className={`px-3 sm:px-4 py-2 min-h-[40px] text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              viewMode === 'invoices'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>청구서별 건별 ({filteredInvoicesCount}건)</span>
          </button>
        </div>

        {/* 2. 미납만 보기 토글 버튼 (메인 탭보다 작고, 클릭 시 뚜렷하게 전환) */}
        <button
          type="button"
          onClick={handleToggle}
          title="미납 내역만 필터링하여 확인합니다"
          className={`min-h-[34px] py-1 px-2.5 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer shrink-0 border whitespace-nowrap ${
            activeUnpaid
              ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-100 shadow-2xs scale-[1.02]'
              : 'bg-white text-slate-500 border-slate-200 hover:border-rose-200 hover:text-rose-600'
          }`}
        >
          <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${activeUnpaid ? 'text-rose-600' : 'text-slate-400'}`} />
          <span>미납만 보기</span>
          {typeof unpaidCount === 'number' && unpaidCount > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeUnpaid ? 'bg-rose-200 text-rose-800' : 'bg-slate-100 text-slate-600'
            }`}>
              {unpaidCount}
            </span>
          )}
        </button>
      </div>

      {/* 2. 메인 필터: 모바일 최적화 (가로 100% 검색창 + 스와이프 칩) */}
      <FilterBar className="flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* 모바일 100% 너비 검색창 */}
        <div className="relative w-full sm:flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`${customerLabel} 이름 검색...`}
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 min-h-[44px] text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* 월 선택 드롭다운 + 상태 필터 (모바일 스와이프 칩 / 데스크톱 셀렉트) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <select
            value={selectedMonth}
            onChange={(e) => onSelectedMonthChange(e.target.value)}
            className="px-3 py-2 min-h-[44px] text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold shrink-0"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* 모바일에서는 좌우 스와이프 가능한 칩 버튼들 */}
          {viewMode === 'invoices' && (
            <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto no-scrollbar">
              {TUITION_STATUS_CHIPS.map((chip) => {
                const active = statusFilter === chip.value;
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => onStatusFilterChange(chip.value)}
                    className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 border ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* 데스크톱 셀렉트 박스 */}
          {viewMode === 'invoices' && (
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="hidden sm:block px-3.5 py-2 min-h-[44px] text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-semibold shrink-0"
            >
              <option value="ALL">전체 상태</option>
              <option value="unpaid">미납 전체 (잔액 있음)</option>
              <option value="paid">수납 완료</option>
              <option value="partial">일부 납부</option>
              <option value="overdue">연체/기한초과</option>
            </select>
          )}

          <span className="text-xs text-slate-500 font-medium shrink-0 ml-auto whitespace-nowrap pl-2">
            {viewMode === 'invoices' ? (
              <>조회: <strong className="text-slate-900">{filteredInvoicesCount}건</strong></>
            ) : (
              <>재원: <strong className="text-slate-900">{studentsCount}명</strong></>
            )}
          </span>
        </div>
      </FilterBar>
    </div>
  );
};
