import React, { useState } from 'react';
import { useList } from '@refinedev/core';
import {
  Ticket,
  Calendar,
  Lock,
  QrCode,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/core/auth/AuthProvider';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { CustomerQrDrawer } from '@/core/auth/components/CustomerQrDrawer';

export const MyPassView: React.FC = () => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [isQrDrawerOpen, setIsQrDrawerOpen] = useState(false);

  // Declarative Refine useList hook for session passes
  const { query: passQuery, result: passResult } = useList({
    resource: 'session_passes',
    filters: [
      {
        field: 'status',
        operator: 'eq',
        value: 'active',
      },
    ],
    queryOptions: {
      enabled: !!user,
    },
  });

  // Declarative Refine useList hook for locker assignments
  const { query: lockerQuery, result: lockerResult } = useList({
    resource: 'lockers',
    queryOptions: {
      enabled: !!user,
    },
  });

  const passLoading = passQuery?.isLoading ?? false;
  const activePasses = passResult?.data || [];
  const assignedLocker = lockerResult?.data?.[0];

  const calculateDDay = (validUntil?: string) => {
    if (!validUntil) return null;
    const end = new Date(validUntil).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return '만료';
    if (diffDays === 0) return 'D-Day';
    return `D-${diffDays}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Responsive Container: Split-screen on lg, Single-card max-420px on mobile */}
      <div className="w-full max-w-[420px] lg:max-w-5xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden lg:grid lg:grid-cols-2">
        {/* Left Column (Desktop Visual & Brand, 50%) */}
        <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>스마트 원터치 멤버십</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-3">
              {currentOrganization?.name || 'MOA 파트너스'}
            </h1>
            <p className="text-sm text-indigo-200/80 leading-relaxed max-w-sm">
              PIN 번호 없이 로그인 세션으로 안전하게 수강권 잔여 횟수, D-Day, 배정 락커를 즉시 확인하세요.
            </p>
          </div>

          <div className="relative z-10 space-y-4 pt-10 border-t border-white/10">
            <div className="flex items-center space-x-3 text-xs text-indigo-200">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>계정 탈취 방지 2-Way W3C 일회용 QR 프로토콜 적용</span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-indigo-200">
              <Building2 className="w-5 h-5 text-indigo-300 shrink-0" />
              <span>Multi-tenant 무결성 보장 세션 뷰</span>
            </div>
          </div>
        </div>

        {/* Right Column (Single-card view on mobile & 50% column on lg) */}
        <div className="p-6 sm:p-8 flex flex-col justify-between">
          <div>
            {/* Mobile Header */}
            <div className="lg:hidden mb-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-600">내 멤버십</span>
                <h2 className="text-xl font-bold text-slate-900">
                  {currentOrganization?.name || 'MOA'}
                </h2>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Ticket className="w-5 h-5" />
              </div>
            </div>

            {/* Pass Content */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">보유 수강권 현황</h3>
                <span className="text-xs text-slate-400">실시간 연동</span>
              </div>

              {passLoading ? (
                <div className="h-32 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
              ) : activePasses.length > 0 ? (
                activePasses.map((pass: any) => {
                  const dDay = calculateDDay(pass.valid_until);
                  return (
                    <div
                      key={pass.id}
                      className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 border border-indigo-100/80 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-100/60 px-2 py-0.5 rounded-md">
                            {pass.pass_type || '정기 수강권'}
                          </span>
                          <h4 className="text-base font-bold text-slate-900 mt-1">
                            {pass.name || '스마트 멤버십 이용권'}
                          </h4>
                        </div>
                        {dDay && (
                          <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full">
                            {dDay}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div>
                          <span className="text-slate-400 block mb-0.5">잔여 횟수</span>
                          <span className="text-base font-extrabold text-slate-900">
                            {pass.remaining_count ?? 10}
                            <span className="text-xs font-normal text-slate-500 ml-0.5">회</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">만료 예정일</span>
                          <span className="text-sm font-medium text-slate-700">
                            {pass.valid_until ? pass.valid_until.slice(0, 10) : '제한 없음'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
                  <Ticket className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">등록된 수강권이 없습니다.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    매장 카운터에 QR 코드를 제시하여 수강권을 등록하세요.
                  </p>
                </div>
              )}

              {/* Locker Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                    <Lock className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">배정 락커</span>
                    <span className="text-sm font-bold text-slate-900">
                      {assignedLocker
                        ? `${(assignedLocker as any).number || '01'}번 락커`
                        : '미배정'}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-slate-400">
                  {assignedLocker ? '이용 가능' : '카운터 문의'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Button: Mobile-first 48px touch target */}
          <div className="pt-6 mt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsQrDrawerOpen(true)}
              className="w-full h-12 flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold transition shadow-md shadow-indigo-100"
            >
              <QrCode className="w-5 h-5" />
              <span>내 정보 등록 / 체크인 QR</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
          </div>
        </div>
      </div>

      {/* Customer QR Drawer Component */}
      <CustomerQrDrawer
        isOpen={isQrDrawerOpen}
        onClose={() => setIsQrDrawerOpen(false)}
        tenantId={currentOrganization?.id || ''}
      />
    </div>
  );
};
