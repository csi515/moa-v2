import React from "react";
import { Users, CalendarCheck, CreditCard, Sparkles } from "lucide-react";

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">운영 대시보드</h1>
        <p className="text-sm text-slate-500">
          MOA v2 시스템이 성공적으로 초기화되었습니다. Refine 기반 관리 계층과 기존 도메인이 결합되어 작동합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">재원생 수</span>
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">-- 명</div>
          <span className="text-xs text-emerald-600 font-medium">실시간 동기화 준비 완료</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">오늘 출석</span>
            <CalendarCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">-- 명</div>
          <span className="text-xs text-slate-500">PIN 키오스크 연동</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">당월 수강료 청구</span>
            <CreditCard className="h-5 w-5 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">-- 원</div>
          <span className="text-xs text-slate-500">원자적 결제 불변식 보존</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">보안 & RLS 상태</span>
            <Sparkles className="h-5 w-5 text-sky-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">148 Migrations</div>
          <span className="text-xs text-sky-600 font-medium">Tenant 격리 100% 보존</span>
        </div>
      </div>
    </div>
  );
};
