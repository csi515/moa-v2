import React from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useCan, useNavigation } from "@refinedev/core";
import { ArrowLeft, Save, AlertCircle, ShieldAlert } from "lucide-react";
import { useTerminology } from "@/core/terminology";
import { useOrganization } from "@/core/organizations/OrganizationProvider";
import { applyFormErrors } from "@/core/utils/formErrorAdapter";
import type { CustomerRecord } from "./list";

export const StudentCreatePage: React.FC = () => {
  const { list } = useNavigation();
  const { currentOrganization } = useOrganization();
  const { t } = useTerminology(currentOrganization?.industry_type);
  const customerWord = t('customer.singular', '회원');
  const statusActiveLabel = t('customer.statusActive', '재원');
  const statusPausedLabel = t('customer.statusLeave', '휴원');
  const statusInactiveLabel = t('customer.statusWithdrawn', '퇴원');

  const { data: canCreate, isLoading: isCheckingAuth } = useCan({
    resource: "customers",
    action: "create",
  });

  const {
    refineCore: { onFinish, formLoading },
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CustomerRecord>({
    refineCoreProps: {
      resource: "customers",
      action: "create",
      redirect: "list",
      onMutationError: (error: any) => {
        applyFormErrors(
          {
            success: false,
            error: error?.message || "등록 중 오류가 발생했습니다.",
            errors: error?.errors,
          },
          setError as any
        );
      },
    },
    defaultValues: {
      status: "active",
    },
  });

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

  // Fail-Closed: 등록 권한(customers.write)이 없는 사용자 차단
  if (canCreate?.can === false) {
    return (
      <div className="max-w-md mx-auto my-12 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center shadow-xs">
        <ShieldAlert className="mx-auto h-10 w-10 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-rose-900">{customerWord} 등록 권한 없음</h2>
        <p className="mt-2 text-sm text-rose-700">
          {customerWord}을(를) 신규 등록할 수 있는 권한(customers.write)이 없습니다. 관리자에게 문의하세요.
        </p>
        <button
          type="button"
          onClick={() => list("customers")}
          className="mt-5 inline-flex items-center gap-1.5 h-12 px-5 bg-white border border-rose-200 text-rose-800 rounded-xl text-sm font-semibold hover:bg-rose-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => list("customers")}
            className="w-12 h-12 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="목록으로"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{customerWord} 신규 등록</h1>
            <p className="text-sm text-slate-500">기본 정보를 입력하여 신규 {customerWord}을(를) 등록합니다.</p>
          </div>
        </div>
      </div>

      {/* 폼 카드 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit(onFinish)} className="space-y-6">
          {/* 이름 */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-slate-800 mb-1.5">
              {customerWord} 이름 <span className="text-rose-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              {...register("name", { required: `${customerWord} 이름을 입력해주세요.` })}
              placeholder="예: 홍길동"
              className={`w-full h-12 rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 ${
                errors.name
                  ? "border-rose-300 focus:ring-rose-500 bg-rose-50/30"
                  : "border-slate-200 focus:ring-indigo-500"
              }`}
            />
            {errors.name && (
              <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.name.message as string}
              </p>
            )}
          </div>

          {/* 연락처 & 이메일 (모바일 가상 키패드 최적화) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-slate-800 mb-1.5">
                연락처
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                pattern="[0-9\-]*"
                {...register("phone")}
                placeholder="예: 01012345678"
                className={`w-full h-12 rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 ${
                  errors.phone
                    ? "border-rose-300 focus:ring-rose-500 bg-rose-50/30"
                    : "border-slate-200 focus:ring-indigo-500"
                }`}
              />
              {errors.phone && (
                <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.phone.message as string}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-800 mb-1.5">
                이메일
              </label>
              <input
                id="email"
                type="email"
                {...register("email")}
                placeholder="예: customer@example.com"
                className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 상태 */}
          <div>
            <label htmlFor="status" className="block text-sm font-semibold text-slate-800 mb-1.5">
              {customerWord} 상태
            </label>
            <select
              id="status"
              {...register("status")}
              className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="active">{statusActiveLabel} (정상 이용 가능)</option>
              <option value="paused">{statusPausedLabel} (일시 정지)</option>
              <option value="inactive">{statusInactiveLabel} (종료)</option>
            </select>
          </div>

          {/* 메모 */}
          <div>
            <label htmlFor="memo" className="block text-sm font-semibold text-slate-800 mb-1.5">
              특이사항 / 메모
            </label>
            <textarea
              id="memo"
              rows={4}
              {...register("memo")}
              placeholder="학습 목표, 건강 상태, 상담 기록 등을 자유롭게 입력하세요."
              className="w-full rounded-xl border border-slate-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 하단 버튼 (엄지존 h-12) */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => list("customers")}
              disabled={formLoading}
              className="h-12 px-6 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="h-12 inline-flex items-center gap-2 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-100 transition-colors"
            >
              {formLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  등록 완료
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
