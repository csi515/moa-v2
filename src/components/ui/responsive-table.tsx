import React from "react";
import { ArrowUpDown, ChevronUp, ChevronDown, RefreshCw, Inbox } from "lucide-react";

export interface ResponsiveColumn<T> {
  key: string;
  header: React.ReactNode;
  render: (record: T, index: number) => React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
  sortable?: boolean;
  sortOrder?: "asc" | "desc";
  onSort?: () => void;
}

export interface ResponsiveTableProps<T> {
  data: T[];
  columns: ResponsiveColumn<T>[];
  renderMobileCard: (record: T, index: number) => React.ReactNode;
  keyExtractor: (record: T, index: number) => string;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
}

export function ResponsiveTable<T>({
  data,
  columns,
  renderMobileCard,
  keyExtractor,
  isLoading = false,
  emptyState,
  className = "",
}: ResponsiveTableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
        <span className="text-xs font-medium">데이터를 불러오는 중입니다...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-dashed border-slate-200 p-6">
        {emptyState || (
          <>
            <Inbox className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">표시할 데이터가 없습니다.</p>
            <p className="text-xs text-slate-400 mt-1">새로운 데이터를 등록하거나 검색 조건을 변경해보세요.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* =========================================================================
          데스크톱 표준 테이블 뷰 (화면 폭 md 이상)
          ========================================================================= */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs font-semibold text-slate-700 border-b border-slate-200">
              <tr>
                {columns.map((col) => {
                  const alignClass =
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left";

                  return (
                    <th
                      key={col.key}
                      scope="col"
                      className={`px-6 py-3.5 ${alignClass} ${col.className || ""}`}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={col.onSort}
                          className={`inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors ${
                            col.sortOrder ? "text-indigo-600 font-bold" : ""
                          }`}
                        >
                          <span>{col.header}</span>
                          {col.sortOrder === "asc" ? (
                            <ChevronUp className="h-3.5 w-3.5 text-indigo-600" />
                          ) : col.sortOrder === "desc" ? (
                            <ChevronDown className="h-3.5 w-3.5 text-indigo-600" />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((record, index) => {
                const rowKey = keyExtractor(record, index);
                return (
                  <tr
                    key={rowKey}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {columns.map((col) => {
                      const alignClass =
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                            ? "text-center"
                            : "text-left";
                      return (
                        <td
                          key={`${rowKey}-${col.key}`}
                          className={`px-6 py-4 ${alignClass} ${col.className || ""}`}
                        >
                          {col.render(record, index)}
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

      {/* =========================================================================
          모바일 카드 리스트 뷰 (화면 폭 md 미만, 가로 스크롤 전면 배제)
          ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {data.map((record, index) => (
          <div key={keyExtractor(record, index)} className="animate-in fade-in duration-150">
            {renderMobileCard(record, index)}
          </div>
        ))}
      </div>
    </div>
  );
}
