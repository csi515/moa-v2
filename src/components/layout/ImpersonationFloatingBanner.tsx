import React, { useEffect, useState } from 'react';
import { ShieldAlert, ArrowLeft, Building2 } from 'lucide-react';
import {
  getImpersonationState,
  stopImpersonation,
  type ImpersonationState,
} from '@/core/auth/impersonationCoordinator';

export const ImpersonationFloatingBanner: React.FC = () => {
  const [state, setState] = useState<ImpersonationState>({
    isActive: false,
    orgId: null,
    orgName: null,
    adminEmail: null,
  });

  useEffect(() => {
    setState(getImpersonationState());

    const handleStorage = () => {
      setState(getImpersonationState());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  if (!state.isActive) return null;

  const handleReturn = () => {
    stopImpersonation();
    window.location.href = '/admin/tenants';
  };

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-amber-600 via-rose-600 to-slate-900 text-white px-4 py-2 shadow-md flex items-center justify-between text-xs sm:text-sm font-medium animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2 max-w-[70%] truncate">
        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-200 animate-pulse" />
        <span className="font-bold text-amber-100">최고관리자 대리 접속 중:</span>
        <span className="truncate bg-black/20 px-2 py-0.5 rounded text-white flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5" />
          {state.orgName || state.orgId}
        </span>
        <span className="hidden md:inline text-white/70 text-xs">
          (관리자: {state.adminEmail || '시스템 관리자'})
        </span>
      </div>

      <button
        onClick={handleReturn}
        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-slate-900 rounded-lg font-bold text-xs hover:bg-amber-50 active:scale-95 transition-all shadow-sm shrink-0"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        관리자 콘솔로 복귀
      </button>
    </div>
  );
};

export default ImpersonationFloatingBanner;
