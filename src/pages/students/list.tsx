import React, { useState } from "react";
import { useTable, useDelete, useCan, useNavigation } from "@refinedev/core";
import {
  Plus,
  Search,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Edit2,
  Trash2,
  Eye,
  AlertCircle,
  Filter,
} from "lucide-react";

export interface CustomerRecord {
  id: string;
  organization_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  metadata?: Record<string, any>;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: "재원", bg: "bg-emerald-50", text: "text-emerald-700" },
  paused: { label: "휴원", bg: "bg-amber-50", text: "text-amber-700" },
  inactive: { label: "퇴원", bg: "bg-slate-100", text: "text-slate-600" },
};

export const StudentListPage: React.FC = () => {
  const { create, edit, show } = useNavigation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const {
    tableQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    pageCount,
    sorters,
    setSorters,
    setFilters,
  } = useTable<CustomerRecord>({
    resource: "customers",
    pagination: {
      pageSize: 10,
    },
    sorters: {
      initial: [{ field: "created_at", order: "desc" }],
    },
  });

  const { mutate: deleteOne, mutation: deleteMutation } = useDelete();
  const isDeleting = deleteMutation.isPending;

  // 권한 확인
  const { data: canCreate } = useCan({ resource: "customers", action: "create" });
  const { data: canEdit } = useCan({ resource: "customers", action: "edit" });
  const { data: canDelete } = useCan({ resource: "customers", action: "delete" });

  const students = tableQuery?.data?.data || [];
  const total = tableQuery?.data?.total || 0;
  const isLoading = tableQuery?.isLoading;

  // 검색어 입력 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim();

    setFilters([
      ...(term
        ? [
            {
              field: "name",
              operator: "contains" as const,
              value: term,
            },
          ]
        : []),
      ...(statusFilter !== "all"
        ? [
            {
              field: "status",
              operator: "eq" as const,
              value: statusFilter,
            },
          ]
        : []),
    ]);
  };

  // 상태 필터 변경 핸들러
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    const term = searchTerm.trim();

    setFilters([
      ...(term
        ? [
            {
              field: "name",
              operator: "contains" as const,
              value: term,
            },
          ]
        : []),
      ...(status !== "all"
        ? [
            {
              field: "status",
              operator: "eq" as const,
              value: status,
            },
          ]
        : []),
    ]);
  };

  // 정렬 토글 핸들러
  const handleSortToggle = (field: string) => {
    const currentSort = sorters?.find((s) => s.field === field);
    if (!currentSort) {
      setSorters([{ field, order: "asc" }]);
    } else if (currentSort.order === "asc") {
      setSorters([{ field, order: "desc" }]);
    } else {
      setSorters([]);
    }
  };

  // 학생 삭제 핸들러
  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`'${name}' 원생 정보를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      deleteOne({
        resource: "customers",
        id,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 상단 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">원생 관리</h1>
          <p className="text-sm text-slate-500">
            원생 목록 조회 및 신규 등록, 수강권 및 출석 상태를 관리합니다. (총 {total}명)
          </p>
        </div>

        {canCreate?.can && (
          <button
            type="button"
            onClick={() => create("customers")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            원생 신규 등록
          </button>
        )}
      </div>

      {/* 필터 및 검색 바 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="원생 이름 검색..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
          >
            검색
          </button>
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
          {[
            { id: "all", label: "전체" },
            { id: "active", label: "재원" },
            { id: "paused", label: "휴원" },
            { id: "inactive", label: "퇴원" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleStatusFilterChange(item.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
                statusFilter === item.id
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 테이블 영역 */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3.5 font-semibold cursor-pointer hover:bg-slate-100 select-none"
                  onClick={() => handleSortToggle("name")}
                >
                  <div className="flex items-center gap-1.5">
                    이름
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3.5 font-semibold">연락처</th>
                <th scope="col" className="px-6 py-3.5 font-semibold">이메일</th>
                <th
                  scope="col"
                  className="px-6 py-3.5 font-semibold cursor-pointer hover:bg-slate-100 select-none"
                  onClick={() => handleSortToggle("status")}
                >
                  <div className="flex items-center gap-1.5">
                    상태
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 font-semibold cursor-pointer hover:bg-slate-100 select-none"
                  onClick={() => handleSortToggle("created_at")}
                >
                  <div className="flex items-center gap-1.5">
                    등록일
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3.5 text-right font-semibold">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                      원생 데이터를 불러오는 중...
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <UserCheck className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-700">등록된 원생 데이터가 없습니다.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm || statusFilter !== "all"
                        ? "검색 조건에 맞는 원생이 없습니다."
                        : "신규 원생을 등록하여 관리를 시작하세요."}
                    </p>
                  </td>
                </tr>
              ) : (
                students.map((student: CustomerRecord) => {
                  const statusInfo = STATUS_LABELS[student.status] || {
                    label: student.status,
                    bg: "bg-slate-100",
                    text: "text-slate-600",
                  };

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        <button
                          type="button"
                          onClick={() => show("customers", student.id)}
                          className="hover:text-indigo-600 hover:underline"
                        >
                          {student.name}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{student.phone || "-"}</td>
                      <td className="px-6 py-4 text-slate-500">{student.email || "-"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusInfo.bg} ${statusInfo.text}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {student.created_at ? student.created_at.slice(0, 10) : "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => show("customers", student.id)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="상세보기"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canEdit?.can && (
                            <button
                              type="button"
                              onClick={() => edit("customers", student.id)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="수정"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete?.can && (
                            <button
                              type="button"
                              onClick={() => handleDelete(student.id, student.name)}
                              disabled={isDeleting}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                              title="삭제"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 바 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>페이지 당</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none"
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}개
                </option>
              ))}
            </select>
            <span>전체 {total}개 중 {students.length}개 표시</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="이전 페이지"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 text-xs font-semibold text-slate-700">
              {currentPage} / {pageCount || 1}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= pageCount}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="다음 페이지"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
