import React, { useState, useMemo } from 'react';
import type { BaseRecord } from '@refinedev/core';
import { useMoaTable } from '@/shared/hooks/data/useMoaTable';
import { SearchField } from '@/shared/components/ui/SearchField';
import { PaginationBar } from '@/shared/components/ui/PaginationBar';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { Button } from '@/shared/components/ui/Button';
import type { AutoColumn, AutoDataTableProps } from './types';

/**
 * Moa-v2 선언형 표준 데이터 테이블 (<AutoDataTable />)
 *
 * 특징:
 * 1. 컬럼 정의만으로 4-State UI(Loading, Error, Empty, Success) 자동 완성
 * 2. 테넌트 격리 및 Refine useMoaTable 데이터 계층 자동 바인딩
 * 3. 데스크톱 테이블 ↔ 모바일 카드 뷰 자동 반응형 스위칭
 * 4. 고정폭 숫자(tabular-nums), 디바운스 검색, 페이지네이션 내장
 */
export function AutoDataTable<TRecord extends BaseRecord = BaseRecord>({
  resource,
  title,
  entityName = '항목',
  columns,
  searchPlaceholder,
  extraActions,
  onRowClick,
  pageSize = 15,
  emptyActionLabel,
  onEmptyAction,
  disableTenantFilter = false,
  schema,
}: AutoDataTableProps<TRecord>) {
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 1. Moa-v2 통합 데이터 훅 호출 (테넌트 격리 및 페이징 내장)
  const {
    records,
    isLoading,
    error,
    refetch,
    totalCount,
    currentPage,
    pageCount,
    setCurrentPage,
  } = useMoaTable<string, TRecord>(resource, {
    pagination: {
      pageSize,
      currentPage: 1,
    },
    disableTenantFilter,
    schema,
  });

  // 2. 검색어 클라이언트 필터링 (서버 사이드 필터 외 빠른 반응성 제공)
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const term = searchTerm.toLowerCase();

    return records.filter((record) => {
      const row = record as Record<string, unknown>;
      return columns.some((col) => {
        const val = row[col.key];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [records, searchTerm, columns]);

  return (
    <div className="flex flex-col space-y-4 w-full">
      {/* 상단 헤더 및 액션 바 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3">
          {title && (
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {title}
            </h2>
          )}
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full tabular-nums">
            총 {totalCount.toLocaleString()}개
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="w-full sm:w-64">
            <SearchField
              value={searchTerm}
              onChange={(val) => {
                setSearchTerm(val);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder || `${entityName} 검색...`}
              aria-label={`${entityName} 검색`}
            />
          </div>
          {extraActions && (
            <div className="flex items-center gap-2 shrink-0">
              {extraActions}
            </div>
          )}
        </div>
      </div>

      {/* 상태별 본문 렌더링 (4-State UI) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* 1. 로딩 상태 (Loading Skeleton) */}
        {isLoading && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        )}

        {/* 2. 에러 상태 (Error State) */}
        {!isLoading && error && (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-xl font-bold">
              !
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              데이터를 불러오는 중 오류가 발생했습니다
            </h3>
            <p className="text-sm text-slate-500 max-w-md">
              {error.message || '네트워크 연결 상태를 확인하고 잠시 후 다시 시도해주세요.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-2 min-h-[44px]"
            >
              다시 시도
            </Button>
          </div>
        )}

        {/* 3. 빈 상태 (Empty State - Actionable) */}
        {!isLoading && !error && filteredRecords.length === 0 && (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-2xl border border-slate-100">
              📋
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              {searchTerm ? '검색 결과가 없습니다' : `등록된 ${entityName}이(가) 없습니다`}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm">
              {searchTerm
                ? '검색어를 변경하거나 필터를 초기화해 보세요.'
                : `새로운 ${entityName}을(를) 등록하여 관리를 시작해보세요.`}
            </p>
            {onEmptyAction && !searchTerm && (
              <Button
                variant="primary"
                size="md"
                onClick={onEmptyAction}
                className="mt-2 min-h-[44px]"
              >
                {emptyActionLabel || `새 ${entityName} 등록`}
              </Button>
            )}
          </div>
        )}

        {/* 4. 데이터 표시 (Success State - Desktop Table & Mobile Card) */}
        {!isLoading && !error && filteredRecords.length > 0 && (
          <>
            {/* 데스크톱 테이블 뷰 (sm: 이상) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {columns.map((col) => {
                      const isRight = col.align === 'right' || col.isNumeric;
                      const isCenter = col.align === 'center';
                      const alignClass = isRight ? 'text-right' : isCenter ? 'text-center' : 'text-left';

                      return (
                        <th
                          key={col.key}
                          style={col.width ? { width: col.width } : undefined}
                          className={`px-4 py-3.5 ${alignClass}`}
                        >
                          {col.header}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {filteredRecords.map((record, rIdx) => {
                    const row = record as Record<string, unknown>;
                    const rowKey = typeof row.id === 'string' || typeof row.id === 'number' ? row.id : rIdx;

                    return (
                      <tr
                        key={rowKey}
                        onClick={() => onRowClick?.(record)}
                        className={`transition-colors duration-150 ${
                          onRowClick
                            ? 'cursor-pointer hover:bg-slate-50/80 active:bg-slate-100/60'
                            : 'hover:bg-slate-50/40'
                        }`}
                      >
                        {columns.map((col) => {
                          const val = row[col.key];
                          const isRight = col.align === 'right' || col.isNumeric;
                          const isCenter = col.align === 'center';
                          const alignClass = isRight ? 'text-right' : isCenter ? 'text-center' : 'text-left';
                          const fontClass = col.isNumeric ? 'tabular-nums font-medium text-slate-900' : '';

                          return (
                            <td
                              key={col.key}
                              className={`px-4 py-3.5 whitespace-nowrap ${alignClass} ${fontClass}`}
                            >
                              {col.render ? col.render(val, record, rIdx) : (val as React.ReactNode) ?? '-'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 뷰 (sm: 미만 - 360px 모바일 완벽 최적화) */}
            <div className="sm:hidden divide-y divide-slate-100">
              {filteredRecords.map((record, rIdx) => {
                const row = record as Record<string, unknown>;
                const rowKey = typeof row.id === 'string' || typeof row.id === 'number' ? row.id : rIdx;
                const titleCol = columns.find((c) => c.mobilePriority === 'title') || columns[0];
                const otherCols = columns.filter((c) => c !== titleCol && c.mobilePriority !== 'hide');
                const titleVal = row[titleCol.key];

                return (
                  <div
                    key={rowKey}
                    onClick={() => onRowClick?.(record)}
                    className={`p-4 space-y-2.5 transition-colors ${
                      onRowClick ? 'active:bg-slate-50' : ''
                    }`}
                  >
                    {/* 모바일 카드 헤더 */}
                    <div className="flex items-center justify-between font-semibold text-slate-900 text-base">
                      <span>
                        {titleCol.render
                          ? titleCol.render(titleVal, record, rIdx)
                          : (titleVal as React.ReactNode) ?? '-'}
                      </span>
                    </div>

                    {/* 모바일 카드 상세 필드 그리드 */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {otherCols.map((col) => {
                        const val = row[col.key];
                        const fontClass = col.isNumeric ? 'tabular-nums font-medium text-slate-900' : 'text-slate-600';

                        return (
                          <div key={col.key} className="flex flex-col space-y-0.5">
                            <span className="text-slate-400 font-medium">{col.header}</span>
                            <span className={`truncate ${fontClass}`}>
                              {col.render ? col.render(val, record, rIdx) : (val as React.ReactNode) ?? '-'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 하단 페이지네이션 바 */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
              <PaginationBar
                currentPage={currentPage}
                totalItems={totalCount}
                pageSize={pageSize}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
