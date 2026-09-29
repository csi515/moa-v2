import type { FC, ReactNode } from 'react';
import { FilterBar, SearchField } from '@/shared/components';
import { Calendar } from 'lucide-react';

interface CareDateSearchBarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder: string;
  leading?: ReactNode;
}

/** 보육 기록 공통 — 날짜 + 검색 필터 바 */
export const CareDateSearchBar: FC<CareDateSearchBarProps> = ({
  selectedDate,
  onDateChange,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  leading,
}) => (
  <FilterBar className="border-0 shadow-none rounded-none border-b border-slate-100">
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-slate-400" />
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => onDateChange(e.target.value)}
        className="px-3 py-2 min-h-[44px] text-sm font-bold border border-slate-200 rounded-xl"
      />
    </div>
    {leading}
    <SearchField
      value={searchQuery}
      onChange={onSearchChange}
      placeholder={searchPlaceholder}
      className="w-full sm:flex-1 sm:max-w-xs"
    />
  </FilterBar>
);
