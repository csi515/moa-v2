import React, { ReactNode } from 'react';

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

/** 관리 화면 공통 필터/검색 바 래퍼 */
export const FilterBar: React.FC<FilterBarProps> = ({ children, className = '' }) => (
  <div
    className={`bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 ${className}`}
  >
    {children}
  </div>
);
