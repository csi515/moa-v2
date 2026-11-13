import React, { useState, useMemo } from 'react';
import { Download, AlertCircle, RefreshCw } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';
import { ResponsiveTable, ResponsiveColumn } from './ResponsiveTable';
import { PaginationBar } from './PaginationBar';
import { EmptyStateHero } from './EmptyStateHero';
import { SearchField } from './SearchField';
import { downloadCsv } from '@/shared/utils/csvDownload';
import { userFacingErrorMessage } from '@/shared/errors/userFacingError';

export interface SearchConfig<T> {
  placeholder?: string;
  searchFields?: (keyof T)[];
  value?: string;
  onChange?: (val: string) => void;
}

export interface PaginationConfig {
  pageSize?: number;
  pageSizeOptions?: number[];
  currentPage?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export interface ExportConfig<T> {
  filename?: string;
  headers?: string[];
  getRowData?: (record: T) => (string | number)[];
}

export interface EmptyActionConfig {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface StandardListViewProps<T> {
  /** 목록에 바인딩할 데이터 배열 */
  data: T[];
  /** 데스크톱 테이블 컬럼 정의 */
  columns: ResponsiveColumn<T>[];
  /** 고유 키 추출 함수 */
  keyExtractor: (record: T, index: number) => string;
  /** 모바일 전용 카드 렌더러 (생략 시 기본 키-값 카드 자동 생성) */
  renderMobileCard?: (record: T, index: number) => React.ReactNode;
  /** 데이터 로딩 상태 */
  isLoading?: boolean;
  /** 에러 객체 */
  error?: unknown;
  /** 에러 시 다시 시도 콜백 */
  onRetry?: () => void;
  /** 검색 기능 설정 (true 시 기본 세팅) */
  searchable?: boolean | SearchConfig<T>;
  /** 페이지네이션 설정 (true 시 기본 세팅, 15건 미만 시 자동 숨김) */
  paginated?: boolean | PaginationConfig;
  /** CSV/엑셀 내보내기 설정 */
  exportable?: boolean | ExportConfig<T>;
  /** 빈 상태 안내 및 CTA 설정 */
  emptyState?: EmptyActionConfig | React.ReactNode;
  /** 상단 우측 추가 액션 버튼 (예: [신규 등록] 버튼 등) */
  headerActions?: React.ReactNode;
  /** 컨테이너 추가 클래스명 */
  className?: string;
}

/**
 * Moa-v2 Standard List View
 * TanStack Table v8 Headless 엔진 기반 고성능 테이블 래퍼
 */
export function StandardListView<T>({
  data = [],
  columns,
  keyExtractor,
  renderMobileCard,
  isLoading = false,
  error,
  onRetry,
  searchable,
  paginated = true,
  exportable,
  emptyState,
  headerActions,
  className = '',
}: StandardListViewProps<T>) {
  // 1. 검색 설정 및 상태
  const searchConfig = typeof searchable === 'object' ? searchable : {};
  const isSearchEnabled = Boolean(searchable);
  const [internalQuery, setInternalQuery] = useState('');
  const query = searchConfig.value !== undefined ? searchConfig.value : internalQuery;

  // 2. 페이지네이션 설정 및 상태
  const paginationConfig = typeof paginated === 'object' ? paginated : {};
  const isPaginationEnabled = Boolean(paginated);
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(paginationConfig.pageSize || 15);

  const currentPage = paginationConfig.currentPage !== undefined ? paginationConfig.currentPage : internalPage;
  const pageSize = paginationConfig.pageSize !== undefined ? paginationConfig.pageSize : internalPageSize;

  // 3. 정렬 상태 (TanStack Table SortingState)
  const [sorting, setSorting] = useState<SortingState>([]);

  // 4. TanStack Table 컬럼 정의 매핑
  const tableColumns = useMemo<ColumnDef<T, any>[]>(() => {
    return columns.map((col) => ({
      id: col.key,
      header: typeof col.header === 'string' ? col.header : col.key,
      accessorFn: (row: T) => (row as any)[col.key],
      enableSorting: Boolean(col.sortable),
    }));
  }, [columns]);

  // 5. 클라이언트 검색 필터 함수
  const globalFilterFn = useMemo(() => {
    return (row: any, _columnId: string, filterValue: string) => {
      if (!filterValue || !filterValue.trim()) return true;
      const q = filterValue.trim().toLowerCase();
      const item = row.original;
      const fields = searchConfig.searchFields;
      if (fields && fields.length > 0) {
        return fields.some((f) => {
          const val = item[f];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
        });
      }
      return Object.values(item as Record<string, unknown>).some((val) => {
        if (typeof val === 'string' || typeof val === 'number') {
          return String(val).toLowerCase().includes(q);
        }
        return false;
      });
    };
  }, [searchConfig.searchFields]);

  // 6. TanStack Table v8 인스턴스 초기화
  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      globalFilter: isSearchEnabled ? query : '',
      pagination: {
        pageIndex: currentPage - 1,
        pageSize,
      },
    },
    onSortingChange: setSorting,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: Boolean(paginationConfig.onPageChange),
  });

  const handleQueryChange = (val: string) => {
    if (searchConfig.onChange) {
      searchConfig.onChange(val);
    } else {
      setInternalQuery(val);
    }
    setInternalPage(1);
    table.setPageIndex(0);
  };

  const handleSort = (colKey: string) => {
    const currentSort = sorting.find((s) => s.id === colKey);
    if (!currentSort) {
      setSorting([{ id: colKey, desc: false }]);
    } else if (!currentSort.desc) {
      setSorting([{ id: colKey, desc: true }]);
    } else {
      setSorting([]);
    }
  };

  // 필터링된 전체 데이터 및 현재 페이지 데이터
  const filteredData = useMemo(() => {
    return table.getFilteredRowModel().rows.map((r) => r.original);
  }, [table, data, query, sorting]);

  const displayData = useMemo(() => {
    if (!isPaginationEnabled || paginationConfig.onPageChange) {
      return filteredData;
    }
    return table.getPaginationRowModel().rows.map((r) => r.original);
  }, [table, filteredData, isPaginationEnabled, paginationConfig.onPageChange]);

  const totalItems = paginationConfig.totalItems !== undefined ? paginationConfig.totalItems : filteredData.length;

  const handlePageChange = (page: number) => {
    if (paginationConfig.onPageChange) {
      paginationConfig.onPageChange(page);
    } else {
      setInternalPage(page);
    }
    table.setPageIndex(page - 1);
  };

  const handlePageSizeChange = (size: number) => {
    if (paginationConfig.onPageSizeChange) {
      paginationConfig.onPageSizeChange(size);
    } else {
      setInternalPageSize(size);
      setInternalPage(1);
    }
    table.setPageSize(size);
  };

  // 7. CSV/엑셀 내보내기 처리
  const exportConfig = typeof exportable === 'object' ? exportable : {};
  const isExportEnabled = Boolean(exportable);

  const handleExport = () => {
    if (!isExportEnabled) return;
    const filename = exportConfig.filename || `export_${new Date().toISOString().slice(0, 10)}.csv`;
    const headers =
      exportConfig.headers ||
      columns
        .filter((c) => typeof c.header === 'string')
        .map((c) => c.header as string);

    const rows: string[][] = [headers];
    for (const record of filteredData) {
      if (exportConfig.getRowData) {
        rows.push(exportConfig.getRowData(record).map(String));
      } else {
        const row = columns.map((col) => {
          const val = (record as Record<string, unknown>)[col.key];
          return val !== null && val !== undefined ? String(val) : '';
        });
        rows.push(row);
      }
    }
    downloadCsv(filename, rows);
  };

  // 8. 에러 상태 처리
  if (error) {
    return (
      <div className={`p-8 text-center bg-white rounded-3xl border border-rose-200/80 shadow-2xs ${className}`}>
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 mb-1">데이터를 불러오지 못했습니다</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">{userFacingErrorMessage(error)}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-2xs active:scale-[0.98]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            다시 시도
          </button>
        )}
      </div>
    );
  }

  // 9. 빈 상태 UI 구성
  const renderEmptyState = () => {
    if (React.isValidElement(emptyState)) {
      return emptyState;
    }
    const emptyConfig =
      emptyState && typeof emptyState === 'object' && !('then' in emptyState) && !(Symbol.iterator in emptyState)
        ? (emptyState as EmptyActionConfig)
        : undefined;
    return (
      <EmptyStateHero
        title={emptyConfig?.title || '등록된 내역이 없습니다'}
        description={
          emptyConfig?.description ||
          (query ? `'${query}' 검색 결과가 없습니다.` : '새 항목을 등록하여 관리를 시작하세요.')
        }
        action={
          emptyConfig?.actionLabel && emptyConfig?.onAction
            ? {
                label: emptyConfig.actionLabel,
                onClick: emptyConfig.onAction,
              }
            : undefined
        }
      />
    );
  };

  // 10. 모바일 기본 카드 렌더러 (폴백)
  const defaultRenderMobileCard = (record: T, index: number) => {
    if (renderMobileCard) return renderMobileCard(record, index);
    return (
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 text-xs">
        {columns.slice(0, 4).map((col) => (
          <div key={col.key} className="flex justify-between items-center py-0.5">
            <span className="text-slate-500 font-medium">{col.header}</span>
            <span className="text-slate-900 font-semibold">{col.render(record, index)}</span>
          </div>
        ))}
      </div>
    );
  };

  // 11. 인터랙티브 컬럼 정렬 바인딩
  const currentSortCol = sorting[0];
  const interactiveColumns = useMemo(() => {
    return columns.map((col) => {
      if (col.sortable) {
        const isSorted = currentSortCol?.id === col.key;
        const order: 'asc' | 'desc' | undefined = isSorted ? (currentSortCol.desc ? 'desc' : 'asc') : undefined;
        return {
          ...col,
          sortOrder: order,
          onSort: () => handleSort(col.key),
        };
      }
      return col;
    });
  }, [columns, currentSortCol]);

  return (
    <div className={`space-y-4 ${className}`} data-testid="standard-list-view">
      {/* 상단 툴바: 검색창, 엑셀 다운로드, 추가 액션 버튼 */}
      {(isSearchEnabled || isExportEnabled || headerActions) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            {isSearchEnabled && (
              <SearchField
                value={query}
                onChange={handleQueryChange}
                placeholder={searchConfig.placeholder || '검색어를 입력하세요...'}
                className="w-full"
              />
            )}
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {isExportEnabled && (
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs min-h-[44px]"
                title="CSV로 내보내기"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>엑셀 내보내기</span>
              </button>
            )}
            {headerActions}
          </div>
        </div>
      )}

      {/* 테이블 / 카드 영역 */}
      <ResponsiveTable
        columns={interactiveColumns}
        data={displayData}
        keyExtractor={keyExtractor}
        renderMobileCard={defaultRenderMobileCard}
        isLoading={isLoading}
        emptyState={renderEmptyState()}
      />

      {/* 하단 페이지네이션 바 (데이터가 1건 이상이고 페이지 설정 시) */}
      {isPaginationEnabled && totalItems > 0 && (
        <PaginationBar
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={paginationConfig.pageSizeOptions || [15, 30, 50, 100]}
        />
      )}
    </div>
  );
}
