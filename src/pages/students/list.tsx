import React, { useState } from "react";
import { useTable, useDelete, useCan, useNavigation } from "@refinedev/core";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  QrCode,
  Ticket,
  Phone,
  ShieldCheck,
} from "lucide-react";

import { useTerminology } from "@/core/terminology";
import { useOrganization } from "@/core/organizations/OrganizationProvider";
import { StoreClaimModal, CounterClaimScanner } from "@/core/auth";
import { CustomerTransferModal } from "@/core/customer/components/CustomerTransferModal";
import {
  StandardListView,
  type ResponsiveColumn,
} from "@/shared/components/ui";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";

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
  const customerWord = t("customer.singular", "원생");
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
  const [transferTarget, setTransferTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [showScanner, setShowScanner] = useState<boolean>(false);

  // Refine 선언형 useTable: URL 쿼리와 자동 동기화 (syncWithLocation: true)
  const {
    tableQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    sorters,
    setSorters,
    setFilters,
  } = useTable<CustomerRecord>({
    resource: "customers",
    syncWithLocation: true,
    pagination: {
      pageSize: 15,
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

  // 실시간 디바운스 검색어 변경 핸들러 (1페이지 자동 리셋)
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
    const term = val.trim();

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

  // 상태 필터 변경 핸들러 (1페이지 자동 리셋)
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
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

  // 파괴적 삭제 확인 후 실행
  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteOne(
      {
        resource: "customers",
        id: deleteTarget.id,
      },
      {
        onSuccess: () => {
          setDeleteTarget(null);
        },
      }
    );
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
        <span className="text-slate-600 font-mono text-xs tabular-nums">{student.phone || "-"}</span>
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
        <span className="text-slate-400 text-xs font-mono tabular-nums">
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
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="스마트폰 1회용 QR 연결"
          >
            <QrCode className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setTransferTarget({ id: student.id, name: student.name })}
            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="신원 안전 인계 (전화번호 변경·데드락 방어)"
          >
            <ShieldCheck className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => show("customers", student.id)}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="상세보기"
          >
            <Eye className="h-4 w-4" />
          </button>
          {canEdit?.can && (
            <button
              type="button"
              onClick={() => edit("customers", student.id)}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="수정"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
          {canDelete?.can && (
            <button
              type="button"
              onClick={() => setDeleteTarget({ id: student.id, name: student.name })}
              disabled={isDeleting}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="삭제"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // 모바일 전용 카드 렌더러 (엄지존 최적화)
  const renderMobileCard = (student: CustomerRecord) => {
    const statusInfo = statusLabels[student.status] || {
      label: student.status,
      bg: "bg-slate-100 border-slate-200",
      text: "text-slate-600",
    };

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
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
                <span className="flex items-center gap-1 font-mono tabular-nums">
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

        <div className="pt-2 border-t border-slate-100 grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => setClaimTarget({ id: student.id, name: student.name })}
            className="h-11 flex items-center justify-center gap-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR</span>
          </button>
          <button
            type="button"
            onClick={() => show("customers", student.id)}
            className="h-11 flex items-center justify-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>수강권</span>
          </button>
          <button
            type="button"
            onClick={() => edit("customers", student.id)}
            className="h-11 flex items-center justify-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>수정</span>
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget({ id: student.id, name: student.name })}
            className="h-11 flex items-center justify-center gap-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>삭제</span>
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
            {customerWord} 목록과 출결·이용권을 관리합니다. (총 <span className="tabular-nums font-semibold">{total}</span>명)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowScanner((prev) => !prev)}
            className={`min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors border ${
              showScanner
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
            }`}
          >
            <QrCode className="h-4 w-4" />
            <span>QR 등록</span>
          </button>

          {canCreate?.can && (
            <button
              type="button"
              onClick={() => create("customers")}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-colors active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>{customerWord} 등록</span>
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

      {/* 올인원 StandardListView 적용 */}
      <StandardListView<CustomerRecord>
        data={students}
        columns={columns}
        renderMobileCard={renderMobileCard}
        keyExtractor={(student) => student.id}
        isLoading={isLoading}
        error={tableQuery?.error}
        onRetry={() => tableQuery?.refetch()}
        searchable={{
          placeholder: `${customerWord} 이름 검색...`,
          value: searchTerm,
          onChange: handleSearchChange,
        }}
        paginated={{
          currentPage,
          pageSize,
          totalItems: total,
          onPageChange: (page) => setCurrentPage(page),
          onPageSizeChange: (size) => setPageSize(size),
        }}
        exportable={{
          filename: `${customerWord}목록_${new Date().toISOString().slice(0, 10)}.csv`,
          headers: [`${customerWord} 이름`, "연락처", "이메일", "상태", "등록일자"],
          getRowData: (s) => [
            s.name,
            s.phone || "-",
            s.email || "-",
            statusLabels[s.status]?.label || s.status,
            s.created_at ? s.created_at.slice(0, 10) : "-",
          ],
        }}
        emptyState={{
          title: `아직 등록된 ${customerWord}이(가) 없습니다`,
          description: `첫 ${customerWord}을(를) 등록하면 시간표 배치와 출결, 수납 관리를 바로 시작할 수 있습니다.`,
          actionLabel: `+ 첫 ${customerWord} 등록하기`,
          onAction: () => create("customers"),
        }}
        headerActions={
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
            {["all", "active", "paused", "inactive"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => handleStatusFilterChange(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition min-h-[36px] ${
                  statusFilter === st
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {st === "all" ? "전체" : statusLabels[st]?.label || st}
              </button>
            ))}
          </div>
        }
      />

      {/* 파괴적 삭제 확인 모달 (안전 장치) */}
      {deleteTarget && (
        <ConfirmDialog
          options={{
            title: `${deleteTarget.name} ${customerWord} 삭제`,
            message: `해당 ${customerWord}의 정보와 연동된 출결, 수강권 기록이 영구적으로 삭제됩니다. 정말 삭제하시겠습니까?`,
            confirmText: isDeleting ? "삭제 중..." : "삭제 확인",
            cancelText: "취소",
            isDestructive: true,
            onConfirm: confirmDelete,
            onCancel: () => setDeleteTarget(null),
          }}
          onDismiss={() => setDeleteTarget(null)}
        />
      )}

      {/* 스마트폰 1회용 QR 연결 모달 */}
      <StoreClaimModal
        isOpen={!!claimTarget}
        onClose={() => setClaimTarget(null)}
        tenantId={currentOrganization?.id || ""}
        customerId={claimTarget?.id || ""}
        customerName={claimTarget?.name}
      />

      {/* 회원 신원 안전 인계 (번호 변경/데드락 방어) 모달 */}
      {transferTarget && (
        <CustomerTransferModal
          isOpen={!!transferTarget}
          onClose={() => setTransferTarget(null)}
          initialCustomerId={transferTarget.id}
          initialCustomerName={transferTarget.name}
          onSuccess={() => tableQuery.refetch()}
        />
      )}
    </div>
  );
};
