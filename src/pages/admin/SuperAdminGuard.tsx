import React from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldX, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/core/auth/AuthProvider';
import { isSuperAdmin } from '@/core/auth/superAdminAuth';

interface SuperAdminGuardProps {
  children: React.ReactNode;
}

export const SuperAdminGuard: React.FC<SuperAdminGuardProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
          <p className="text-sm font-medium text-slate-500">관리자 인증 권한 확인 중...</p>
        </div>
      </div>
    );
  }

  // 비로그인 사용자는 로그인 페이지로 리다이렉트
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 최고 관리자 권한이 없는 경우 403 Forbidden 안내
  if (!isSuperAdmin(user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl border border-slate-200">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
            <ShieldX className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">403 Forbidden</h2>
          <p className="text-sm font-semibold text-slate-700 mb-1">
            최고 관리자 전용 페이지입니다
          </p>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            현재 계정({user.email})에는 플랫폼 테넌트 총괄 관제 및 시스템 관리 권한이 없습니다.
            접근이 필요하신 경우 시스템 관리자에게 문의하세요.
          </p>
          <button
            onClick={() => (window.location.href = '/workspace')}
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            내 사업장 워크스페이스로 이동
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default SuperAdminGuard;
