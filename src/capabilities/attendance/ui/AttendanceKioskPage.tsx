import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthProvider';
import { useOptionalOrganization } from '@/core/organizations/OrganizationProvider';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import {
  isKioskOrganizationReady,
  resolveKioskOrganizationIdFromApp,
} from '../infrastructure/resolveKioskOrganizationId';
import { PinCheckInKioskView } from './PinCheckInKioskView';

/** 입구 태블릿용 전체화면 PIN 출석 — 로그인·사업장 필수 */
export const AttendanceKioskPage: React.FC = () => {
  const { session, loading } = useAuth();
  const org = useOptionalOrganization();
  const organizationId = resolveKioskOrganizationIdFromApp(
    org?.currentOrganization?.id,
    'standalone'
  );

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/" replace />;

  if (!isKioskOrganizationReady(organizationId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm w-full bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3">
          <p className="text-base font-black text-slate-900">키오스크를 열 수 없습니다</p>
          <p className="text-sm text-slate-600 leading-relaxed">
            사업장에 로그인한 뒤 출결 화면에서 키오스크를 실행해 주세요. 로컬 폴백으로는 동작하지 않습니다.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-indigo-600 text-white text-sm font-bold"
          >
            앱으로 이동
          </a>
        </div>
      </div>
    );
  }

  return <PinCheckInKioskView method="kiosk" standalone />;
};
