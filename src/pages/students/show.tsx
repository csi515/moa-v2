import React from "react";
import { useShow, useCan, useDelete, useNavigation } from "@refinedev/core";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  ShieldAlert,
} from "lucide-react";
import { useTerminology } from "@/core/terminology";
import { useOrganization } from "@/core/organizations/OrganizationProvider";
import type { CustomerRecord } from "./list";

export const StudentShowPage: React.FC = () => {
  const { list, edit } = useNavigation();
  const { currentOrganization } = useOrganization();
  const { t } = useTerminology(currentOrganization?.industry_type);
  const customerWord = t('customer.singular', '회원');
  const statusActiveLabel = t('customer.statusActive', '재원');
  const statusPausedLabel = t('customer.statusLeave', '휴원');
  const statusInactiveLabel = t('customer.statusWithdrawn', '퇴원');

  const statusLabels: Record<string, { label: string; bg: string; text: string }> = {
    active: { label: statusActiveLabel, bg: "bg-emerald-50", text: "text-emerald-700" },
    paused: { label: statusPausedLabel, bg: "bg-amber-50", text: "text-amber-700" },
    inactive: { label: statusInactiveLabel, bg: "bg-slate-100", text: "text-slate-600" },
  };

  const { query, result: student } = useShow<CustomerRecord>({
    resource: "customers",
  });

  const { data: canShow, isLoading: isCheckingAuth } = useCan({
    resource: "customers",
    action: "show",
  });
  const { data: canEdit } = useCan({ resource: "customers", action: "edit" });
  const { data: canDelete } = useCan({ resource: "customers", action: "delete" });

  const { mutate: deleteOne, mutation: deleteMutation } = useDelete();
  const isDeleting = deleteMutation.isPending;
  const isLoading = query.isLoading;

  const handleDelete = () => {
    if (!student) return;
    if (window.confirm(`'${student.name}' ${customerWord} 정보를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      deleteOne(
        {
          resource: "customers",
          id: student.id,
        },
        {
          onSuccess: () => {
            list("customers");
          },
        }
      );
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="inline-flex items-center gap-2 text-slate-500 text-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          권한을 확인하는 중...
        </div>
      </div>
    );
  }

  // Fail-Closed: 조회 권한(customers.read)이 없는 사용자 차단
  if (canShow?.can === false) {
    return (
      <div className="max-w-md mx-auto my-12 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center shadow-xs">
        <ShieldAlert className="mx-auto h-10 w-10 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-rose-900">{customerWord} 조회 권한 없음</h2>
        <p className="mt-2 text-sm text-rose-700">
          {customerWord} 정보를 조회할 수 있는 권한(customers.read)이 없습니다.
        </p>
        <button
          type="button"
          onClick={() => list("customers")}
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-rose-200 text-rose-800 rounded-xl text-sm font-semibold hover:bg-rose-100"
        >
          <ArrowLeft className="h-4 w-4" />
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="inline-flex items-center gap-2 text-slate-500 text-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          {customerWord} 상세 정보를 불러오는 중...
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="max-w-md mx-auto my-12 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <User className="mx-auto h-10 w-10 text-slate-300 mb-3" />
        <h2 className="text-lg font-bold text-slate-900">{customerWord}을(를) 찾을 수 없습니다</h2>
        <p className="mt-2 text-sm text-slate-500">
          요청한 {customerWord} 데이터가 존재하지 않거나 접근 권한이 없습니다.
        </p>
        <button
          type="button"
          onClick={() => list("customers")}
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" />
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const statusInfo = statusLabels[student.status] || {
    label: student.status,
    bg: "bg-slate-100",
    text: "text-slate-600",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 헤더 및 액션 버튼 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => list("customers")}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="목록으로"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{student.name}</h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusInfo.bg} ${statusInfo.text}`}
              >
                {statusInfo.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">ID: {student.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit?.can && (
            <button
              type="button"
              onClick={() => edit("customers", student.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-sm font-semibold transition-colors"
            >
              <Edit2 className="h-4 w-4" />
              수정하기
            </button>
          )}
          {canDelete?.can && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              삭제
            </button>
          )}
        </div>
      </div>

      {/* 기본 정보 카드 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          {customerWord} 기본 정보
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl shrink-0">
              <Phone className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">연락처</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">{student.phone || "미등록"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl shrink-0">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">이메일</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">{student.email || "미등록"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">등록 일시</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">
                {student.created_at ? new Date(student.created_at).toLocaleString("ko-KR") : "-"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">최근 수정 일시</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">
                {student.updated_at ? new Date(student.updated_at).toLocaleString("ko-KR") : "-"}
              </p>
            </div>
          </div>
        </div>

        {/* 특이사항 / 메모 */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase text-slate-400 mb-1">특이사항 / 메모</p>
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {student.memo || "작성된 메모가 없습니다."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
