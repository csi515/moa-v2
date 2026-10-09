import React, { useState } from "react";
import { useTable, useDelete, useCan, useNavigation } from "@refinedev/core";
import {
  Plus,
  Search,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Eye,
  QrCode,
  Ticket,
  CalendarCheck,
  Phone,
  Mail,
} from "lucide-react";

import { useTerminology } from "@/core/terminology";
import { useOrganization } from "@/core/organizations/OrganizationProvider";
import { StoreClaimModal, CounterClaimScanner } from "@/core/auth";
import {
  ResponsiveTable,
  type ResponsiveColumn,
} from "@/components/ui/responsive-table";

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

export const StudentListPage: React.FC = () => {
  const { create, edit, show } = useNavigation();
  const { currentOrganization } = useOrganization();
  const { t } = useTerminology(currentOrganization?.industry_type);
  const customerWord = t("customer.singular", "회원");
  const statusActiveLabel = t("customer.statusActive", "재원");
  const statusPausedLabel = t("customer.statusLeave", "휴원");
  const statusInactiveLabel = t("customer.statusWithdrawn", "퇴원");

  const statusLabels: Record<
    string,
    { label: string; bg: string; text: string }
  > = {
    active: { label: statusActiveLabel, bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
    paused: { label: statusPausedLabel, bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
    inactive: { label: statusInactiveLabel, bg: "bg-slate-100 border-slate-200", text: "text-slate-600" },
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [claimTarget, setClaimTarget] = useState<{ id: string; name: string } | null>(null);
  const [showScanner, setShowScanner] = useState<boolean>(false);

  // Refine 선언형 useTable: URL 쿼리와 자동 동기화 (syncWithLocation: true)
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
    syncWithLocation: true,
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
    if (window.confirm(`'${name}' ${customerWord} 정보를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      deleteOne({
        resource: "customers",
        id,
      });
    }
  };

  // 데스크톱 테이블 컬럼 정의
  const columns: ResponsiveColumn<CustomerRecord>[] = [
    {
      key: "name",
      header: `${customerWord} 이름`,
      sortable: true,
      sortOrder: sorters?.find((s) => s.field === "name")?.order as any,
      onSort: () => handleSortToggle("name"),
      render: (student) => (
        <button
          type="button"
          onClick={() => show("customers", student.id)}
          className="font-bold text-slate-900 hover:text-indigo-600 hover:underline text-left"
        >
          {student.name}
        </button>
      ),
    },
    {
      key: "phone",
      header: "연락처",
      render: (student) => (
        <span className="text-slate-600 font-mono text-xs">{student.phone || "-"}</span>
      ),
    },
    {
      key: "email",
      header: "이메일",
      render: (student) => (
        <span className="text-slate-500 text-xs">{student.email || "-"}</span>
      ),
    },
    {
      key: "status",
      header: "상태",
      render: (student) => {
        const info = statusLabels[student.status] || {
          label: student.status,
          bg: "bg-slate-100 border-slate-200",
          text: "text-slate-600",
        };
        return (
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${info.bg} ${info.text}`}
          >
            {info.label}
          </span>
        );
      },
    },
    {
      key: "created_at",
      header: "등록일자",
      sortable: true,
      sortOrder: sorters?.find((s) => s.field === "created_at")?.order as any,
      onSort: () => handleSortToggle("created_at"),
      render: (student) => (
        <span className="text-slate-400 text-xs font-mono">
          {student.created_at ? student.created_at.slice(0, 10) : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "작업",
      align: "right",
      render: (student) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setClaimTarget({ id: student.id, name: student.name })}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
            title="스마트폰 1회용 QR 연결"
          >
            <QrCode className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => show("customers", student.id)}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            title="상세보기"
          >
            <Eye className="h-4 w-4" />
          </button>
          {canEdit?.can && (
            <button
              type="button"
              onClick={() => edit("customers", student.id)}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
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
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50"
              title="삭제"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // 모바일 전용 카드 렌더러 (엄지존 최적화, 가로 스크롤 전면 배제)
  const renderMobileCard = (student: CustomerRecord) => {
    const statusInfo = statusLabels[student.status] || {
      label: student.status,
      bg: "bg-slate-100 border-slate-200",
      text: "text-slate-600",
    };

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        {/* 상단: 이름 + 상태 뱃지 */}
        <div className="flex items-start justify-between">
          <div>
            <button
              type="button"
              onClick={() => show("customers", student.id)}
              className="text-base font-bold text-slate-900 hover:text-indigo-600 text-left"
            >
              {student.name}
            </button>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              {student.phone ? (
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {student.phone}
                </span>
              ) : (
                <span className="text-slate-400">연락처 없음</span>
              )}
            </div>
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.bg} ${statusInfo.text}`}
          >
            {statusInfo.label}
          </span>
        </div>

        {/* 원터치 액션 버튼 그룹 (모바일 h-12 터치 타깃) */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setClaimTarget({ id: student.id, name: student.name })}
            className="h-11 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition"
          >
            <QrCode className="w-4 h-4" />
            <span>QR 연결</span>
          </button>

          <button
            type="button"
            onClick={() => show("customers", student.id)}
            className="h-11 flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <Ticket className="w-4 h-4" />
            <span>수강권</span>
          </button>

          <button
            type="button"
            onClick={() => edit("customers", student.id)}
            className="h-11 flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <Edit2 className="w-4 h-4" />
            <span>수정</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 상단 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{customerWord} 관리</h1>
          <p className="text-sm text-slate-500">
            {customerWord} 목록 조회 및 신규 등록, 수강권 및 출석 상태를 관리합니다. (총 {total}명)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowScanner((prev) => !prev)}
            className={`h-12 inline-flex items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors border ${
              showScanner
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
            }`}
          >
            <QrCode className="h-4 w-4" />
            <span>QR 빠른 등록</span>
          </button>

          {canCreate?.can && (
            <button
              type="button"
              onClick={() => create("customers")}
              className="h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>{customerWord} 신규 등록</span>
            </button>
          )}
        </div>
      </div>

      {/* QR 스캐너 패널 (열려있을 때) */}
      {showScanner && (
        <div className="animate-in fade-in duration-200">
          <CounterClaimScanner
            tenantId={currentOrganization?.id || ""}
            onSuccess={() => {
              tableQuery.refetch();
            }}
          />
        </div>
      )}

      {/* 필터 및 검색 바 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`${customerWord} 이름 검색...`}
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white shadow-2xs"
            />
          </div>
          <button
            type="submit"
            className="h-12 px-5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition shadow-xs shrink-0"
          >
            검색
          </button>
        </form>

        <div className="flex items-center gap-2">
          {["all", "active", "paused", "inactive"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => handleStatusFilterChange(st)}
              className={`h-12 px-3.5 rounded-xl text-xs font-semibold transition border ${
                statusFilter === st
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {st === "all" ? "전체" : statusLabels[st]?.label || st}
            </button>
          ))}
        </div>
      </div>

      {/* 반응형 테이블 (데스크톱 표준 Table ↔ 모바일 카드 리스트) */}
      <ResponsiveTable<CustomerRecord>
        data={students}
        columns={columns}
        renderMobileCard={renderMobileCard}
        keyExtractor={(student) => student.id}
        isLoading={isLoading}
      />

      {/* 페이지네이션 바 */}
      {students.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
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
              className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
              className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="다음 페이지"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 스마트폰 1회용 QR 연결 모달 */}
      <StoreClaimModal
        isOpen={!!claimTarget}
        onClose={() => setClaimTarget(null)}
        tenantId={currentOrganization?.id || ""}
        customerId={claimTarget?.id || ""}
        customerName={claimTarget?.name}
      />
    </div>
  );
};
