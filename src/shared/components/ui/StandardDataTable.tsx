import React from 'react';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { PaginationBar, type PaginationBarProps } from './PaginationBar';

export interface StandardColumn<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
}

export interface StandardDataTableProps<T> {
  data: T[];
  columns: StandardColumn<T>[];
  keyExtractor?: (item: T, index: number) => string | number;
  isLoading?: boolean;
  loadingRows?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void; icon?: React.ReactNode };
  emptyState?: React.ReactNode;
  pagination?: {
    currentPage: number;
    totalItems: number;
    pageSize: number;
    pageSizeOptions?: number[];
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
  };
  onRowClick?: (item: T, index: number) => void;
  rowClassName?: (item: T, index: number) => string;
  /** 모바일 화면에서 테이블 대신 카드 뷰를 렌더링하고 싶을 때 전달 (선택적) */
  renderMobileCard?: (item: T, index: number) => React.ReactNode;
  className?: string;
  tableClassName?: string;
  density?: 'compact' | 'normal';
  stickyHeader?: boolean;
}

/**
 * Moa-v2 표준 데이터 테이블 컴포넌트 (StandardDataTable)
 * - 인라인 <table> 태그 작성을 완전히 대체하는 고차 복합 컴포넌트
 * - B2B SaaS 표준 디자인(토스 비즈니스, 리니어 스타일) 내장
 * - 가로 반응형 스크롤 + 헤더 고정 + 로딩 스켈레톤 + 빈 상태(EmptyState) + 페이지네이션 일체형 지원
 */
export function StandardDataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  loadingRows = 5,
  emptyTitle = '등록된 데이터가 없습니다',
  emptyDescription,
  emptyAction,
  emptyState,
  pagination,
  onRowClick,
  rowClassName,
  renderMobileCard,
  className = '',
  tableClassName = '',
  density = 'normal',
  stickyHeader = false,
}: StandardDataTableProps<T>) {
  const getKey = (item: T, index: number): string | number => {
    if (keyExtractor) return keyExtractor(item, index);
    if (typeof item === 'object' && item !== null && 'id' in item) {
      return String((item as { id: string | number }).id);
    }
    return index;
  };

  const padX = density === 'compact' ? 'px-4 py-2.5' : 'px-5 py-3.5';
  const headerPad = density === 'compact' ? 'px-4 py-2.5' : 'px-5 py-3';

  // 1. Loading State
  if (isLoading) {
    return (
      <div className={`w-full space-y-3 ${className}`}>
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="divide-y divide-slate-100 p-2 space-y-2">
            {Array.from({ length: loadingRows }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2 px-3">
                <Skeleton className="h-4 w-8 shrink-0" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24 shrink-0" />
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. Empty State
  if (data.length === 0) {
    if (emptyState) {
      return <div className={className}>{emptyState}</div>;
    }
    return (
      <div className={className}>
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
          className="rounded-xl border border-dashed border-slate-200/90 shadow-2xs"
        />
      </div>
    );
  }

  // 3. Render Table
  return (
    <div className={`w-full space-y-3 ${className}`}>
      {/* 모바일 전용 카드 뷰 (renderMobileCard가 정의된 경우에만 md 이하에서 노출) */}
      {renderMobileCard && (
        <div className="block md:hidden space-y-2.5">
          {data.map((item, index) => (
            <div
              key={getKey(item, index)}
              onClick={() => onRowClick?.(item, index)}
              className={onRowClick ? 'cursor-pointer' : undefined}
            >
              {renderMobileCard(item, index)}
            </div>
          ))}
        </div>
      )}

      {/* 데스크톱 및 표준 테이블 뷰 (renderMobileCard가 없으면 모바일에서도 가로 스크롤 테이블로 표시) */}
      <div
        className={`${renderMobileCard ? 'hidden md:block' : 'block'} bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden`}
      >
        <div className="overflow-x-auto">
          <table className={`w-full text-left text-xs sm:text-sm text-slate-700 ${tableClassName}`}>
            <thead
              className={`bg-slate-50/90 text-slate-600 text-xs font-semibold border-b border-slate-200 uppercase tracking-wider select-none ${
                stickyHeader ? 'sticky top-0 z-10' : ''
              }`}
            >
              <tr>
                {columns.map((col) => {
                  const alignClass =
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left';

                  return (
                    <th
                      key={col.key}
                      scope="col"
                      style={col.width ? { width: col.width } : undefined}
                      className={`${headerPad} ${alignClass} whitespace-nowrap font-medium ${col.className || ''}`}
                    >
                      {col.header}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data.map((item, index) => {
                const key = getKey(item, index);
                const customRowClass = rowClassName?.(item, index) ?? '';
                const clickableClass = onRowClick
                  ? 'cursor-pointer hover:bg-slate-50/80 active:bg-slate-100/70 transition-colors'
                  : 'hover:bg-slate-50/50 transition-colors';

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(item, index)}
                    className={`${clickableClass} ${customRowClass}`}
                  >
                    {columns.map((col) => {
                      const alignClass =
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left';

                      const content = col.render
                        ? col.render(item, index)
                        : (item as Record<string, any>)[col.key];

                      return (
                        <td
                          key={col.key}
                          className={`${padX} ${alignClass} ${col.className || ''}`}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 페이지네이션 연동 */}
      {pagination && (
        <PaginationBar
          currentPage={pagination.currentPage}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          pageSizeOptions={pagination.pageSizeOptions}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          className="rounded-xl border border-slate-200 shadow-2xs"
        />
      )}
    </div>
  );
}
