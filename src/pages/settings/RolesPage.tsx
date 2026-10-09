import React, { useState } from "react";
import { useTable, useDelete, CanAccess } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Save,
  QrCode,
  Users,
  Sparkles,
} from "lucide-react";
import { useOrganization } from "@/core/organizations/OrganizationProvider";
import { StaffInviteQrModal } from "@/components/staff/StaffInviteQrModal";

export interface TenantRoleRecord {
  id: string;
  tenant_id: string;
  name: string;
  rank_order: number;
  permissions: string[];
  created_at: string;
}

const PERMISSION_GROUPS = [
  {
    category: "수강권 / 이용권",
    domain: "passes",
    items: [
      { key: "passes:view", label: "수강권 조회" },
      { key: "passes:deduct", label: "이용 차감" },
      { key: "passes:create", label: "신규 발급" },
      { key: "passes:delete", label: "삭제 / 환불" },
    ],
  },
  {
    category: "출결 관리",
    domain: "attendance",
    items: [
      { key: "attendance:view", label: "출결 현황 조회" },
      { key: "attendance:checkin", label: "출석 / 퇴실 처리" },
    ],
  },
  {
    category: "사물함 / 락커",
    domain: "lockers",
    items: [
      { key: "lockers:view", label: "락커 조회" },
      { key: "lockers:assign", label: "락커 배정 / 회수" },
    ],
  },
  {
    category: "정산 / 장부",
    domain: "settlement",
    items: [{ key: "settlement:view", label: "매출 / 장부 조회" }],
  },
];

export const RolesPage: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<TenantRoleRecord | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Refine useTable for tenant_roles
  const {
    tableQuery,
  } = useTable<TenantRoleRecord>({
    resource: "tenant_roles",
    meta: {
      schema: "core",
    },
    filters: {
      permanent: currentOrganization?.id
        ? [{ field: "tenant_id", operator: "eq", value: currentOrganization.id }]
        : [],
    },
    sorters: {
      initial: [{ field: "rank_order", order: "asc" }],
    },
  });

  const { mutate: deleteRole, mutation: deleteMutation } = useDelete();
  const isDeleting = deleteMutation.isPending;

  const roles = tableQuery?.data?.data || [];
  const isLoading = tableQuery?.isLoading;

  // Refine useForm for Role Create/Edit Modal
  const {
    register,
    handleSubmit,
    reset,
    refineCore: { onFinish },
    formState: { errors },
  } = useForm<TenantRoleRecord>({
    refineCoreProps: {
      resource: "tenant_roles",
      meta: {
        schema: "core",
      },
      action: editingRole ? "edit" : "create",
      id: editingRole?.id,
      redirect: false,
      onMutationSuccess: () => {
        tableQuery.refetch();
        handleCloseModal();
      },
    },
  });

  const handleOpenCreate = () => {
    setEditingRole(null);
    setSelectedPermissions(["passes:view", "attendance:checkin"]);
    reset({
      name: "",
      rank_order: (roles.length + 1) * 10,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (role: TenantRoleRecord) => {
    setEditingRole(role);
    setSelectedPermissions(Array.isArray(role.permissions) ? role.permissions : []);
    reset({
      name: role.name,
      rank_order: role.rank_order,
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingRole(null);
    setSelectedPermissions([]);
  };

  const handleTogglePermission = (permKey: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permKey)
        ? prev.filter((p) => p !== permKey)
        : [...prev, permKey]
    );
  };

  const handleToggleDomain = (domain: string, allItems: { key: string }[]) => {
    const allKeys = allItems.map((i) => i.key);
    const hasAll = allKeys.every((k) => selectedPermissions.includes(k));

    if (hasAll) {
      setSelectedPermissions((prev) => prev.filter((p) => !allKeys.includes(p)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...allKeys])));
    }
  };

  const onSubmitRole = async (data: any) => {
    if (!currentOrganization?.id) return;

    await onFinish({
      ...data,
      tenant_id: currentOrganization.id,
      rank_order: Number(data.rank_order) || 1,
      permissions: selectedPermissions,
    });
  };

  const handleDelete = (role: TenantRoleRecord) => {
    if (window.confirm(`'${role.name}' 직급을 삭제하시겠습니까?`)) {
      deleteRole({
        resource: "tenant_roles",
        id: role.id,
        meta: {
          schema: "core",
        },
      }, {
        onSuccess: () => {
          tableQuery.refetch();
        },
      });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>하이브리드 RBAC 직급 시스템</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            매장 직급 및 권한 설정
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            매장 운영 형태에 맞게 직급을 자유롭게 신설하고 1회용 QR로 직원을 초대하세요.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CanAccess resource="tenant_roles" action="invite" fallback={null}>
            <button
              type="button"
              onClick={() => setInviteModalOpen(true)}
              className="h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
            >
              <QrCode className="h-4 w-4 text-indigo-600" />
              <span>직원 초대 1회용 QR</span>
            </button>
          </CanAccess>

          <CanAccess resource="tenant_roles" action="create" fallback={null}>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>직급 신규 추가</span>
            </button>
          </CanAccess>
        </div>
      </div>

      {/* 직급 목록 카드 리스트 */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-800">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>등록된 매장 직급 ({roles.length}개)</span>
          </div>
          <span className="text-xs text-slate-400">숫자가 낮을수록 상위 직급</span>
        </div>

        {isLoading ? (
          <div className="p-16 text-center text-slate-400">직급 목록을 불러오는 중...</div>
        ) : roles.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">등록된 커스텀 직급이 없습니다.</p>
            <p className="text-xs text-slate-400 mt-1">
              [직급 신규 추가] 버튼을 눌러 점장, 알바, 강사 등의 직급을 등록하세요.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {roles.map((role: TenantRoleRecord) => {
              const perms = Array.isArray(role.permissions) ? role.permissions : [];
              return (
                <div
                  key={role.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-mono text-xs font-bold flex items-center justify-center">
                        #{role.rank_order}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{role.name}</h3>
                    </div>

                    {/* 권한 뱃지 리스트 */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {perms.length === 0 ? (
                        <span className="text-xs text-slate-400">부여된 권한 없음</span>
                      ) : perms.includes("*") ? (
                        <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
                          모든 권한 허용 (*)
                        </span>
                      ) : (
                        perms.map((p) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px]"
                          >
                            {p}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <CanAccess resource="tenant_roles" action="edit" fallback={null}>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(role)}
                        className="h-10 px-3.5 flex items-center space-x-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>수정</span>
                      </button>
                    </CanAccess>
                    <CanAccess resource="tenant_roles" action="delete" fallback={null}>
                      <button
                        type="button"
                        onClick={() => handleDelete(role)}
                        disabled={isDeleting}
                        className="h-10 px-3 flex items-center justify-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition disabled:opacity-50"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </CanAccess>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 직급 추가/수정 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingRole ? "직급 및 권한 수정" : "신규 직급 추가"}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-10 h-10 inline-flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmitRole)} className="p-6 space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    직급명 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register("name", { required: "직급명을 입력하세요." })}
                    placeholder="예: 수석강사, 매니저, 알바"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                  {errors.name && (
                    <span className="text-xs text-rose-600 mt-1 block">
                      {errors.name.message as string}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    우선순위 (정렬 번호)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    {...register("rank_order", { valueAsNumber: true })}
                    placeholder="10"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* CRUD 권한 매트릭스 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-3">
                  권한 매트릭스 설정
                </label>
                <div className="space-y-4">
                  {PERMISSION_GROUPS.map((group) => {
                    const allKeys = group.items.map((i) => i.key);
                    const isAllSelected = allKeys.every((k) =>
                      selectedPermissions.includes(k)
                    );

                    return (
                      <div
                        key={group.category}
                        className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">
                            {group.category}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleDomain(group.domain, group.items)}
                            className="text-[11px] font-semibold text-indigo-600 hover:underline"
                          >
                            {isAllSelected ? "전체 해제" : "전체 선택"}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {group.items.map((item) => {
                            const isChecked = selectedPermissions.includes(item.key);
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => handleTogglePermission(item.key)}
                                className={`h-11 px-3 flex items-center justify-between rounded-xl border text-xs font-medium transition ${
                                  isChecked
                                    ? "bg-indigo-50/80 border-indigo-200 text-indigo-900 font-semibold"
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                <span>{item.label}</span>
                                {isChecked && (
                                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-1" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 하단 버튼 */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="h-12 px-5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="h-12 px-6 flex items-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-100 transition"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingRole ? "변경사항 저장" : "직급 등록"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 직원 초대 1회용 QR 모달 */}
      <StaffInviteQrModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        roles={roles}
      />
    </div>
  );
};
