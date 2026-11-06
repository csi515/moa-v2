import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationBarProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[]; // 기본값: [15, 30, 50]
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  totalItems,
  pageSize,
  pageSizeOptions = [15, 30, 50],
  onPageChange,
  onPageSizeChange,
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // 최대 5개 페이지 번호 생성
  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safePage <= 3) {
      return [1, 2, 3, 4, 5];
    }
    if (safePage >= totalPages - 2) {
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [safePage - 2, safePage - 1, safePage, safePage + 1, safePage + 2];
  }, [safePage, totalPages]);

  if (totalItems === 0) return null;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-3.5 py-3 bg-white border border-slate-200/80 rounded-2xl shadow-2xs text-xs text-slate-600 ${className}`}
    >
      {/* 좌측: 페이지당 개수 선택 & 전체 항목 카운트 */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">페이지당</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="py-1 px-2 border border-slate-200 rounded-lg bg-slate-50 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none min-h-[36px]"
              aria-label="페이지당 항목 수"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}개
                </option>
              ))}
            </select>
          </div>
        )}
        <span className="font-medium text-slate-500">
          전체 <strong className="text-slate-900 font-bold">{totalItems}</strong>개 중{' '}
          <strong className="text-slate-900 font-bold">
            {startItem}~{endItem}
          </strong>
          개 표시
        </span>
      </div>

      {/* 우측 / 모바일 네비게이션 */}
      <div className="flex items-center justify-center gap-1 w-full sm:w-auto">
        {/* 이전 버튼 */}
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg border font-semibold transition-colors ${
            safePage <= 1
              ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50/50'
              : 'border-slate-200 text-slate-700 hover:bg-slate-100 active:bg-slate-200 cursor-pointer'
          }`}
          aria-label="이전 페이지"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">이전</span>
        </button>

        {/* 데스크톱: 페이지 번호 리스트 */}
        <div className="hidden sm:flex items-center gap-1">
          {pageNumbers[0] > 1 && (
            <>
              <button
                type="button"
                onClick={() => onPageChange(1)}
                className="w-8 h-8 rounded-lg text-xs font-semibold hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                1
              </button>
              {pageNumbers[0] > 2 && <span className="px-1 text-slate-400">...</span>}
            </>
          )}

          {pageNumbers.map((p) => {
            const isActive = p === safePage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {p}
              </button>
            );
          })}

          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                <span className="px-1 text-slate-400">...</span>
              )}
              <button
                type="button"
                onClick={() => onPageChange(totalPages)}
                className="w-8 h-8 rounded-lg text-xs font-semibold hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        {/* 모바일: 1 / 10 페이지 번호 표시 */}
        <span className="sm:hidden px-3 text-xs font-bold text-slate-700 tabular-nums">
          {safePage} / {totalPages}
        </span>

        {/* 다음 버튼 */}
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg border font-semibold transition-colors ${
            safePage >= totalPages
              ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50/50'
              : 'border-slate-200 text-slate-700 hover:bg-slate-100 active:bg-slate-200 cursor-pointer'
          }`}
          aria-label="다음 페이지"
        >
          <span className="hidden sm:inline">다음</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
