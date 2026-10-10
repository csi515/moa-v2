import React, { type FC, type ReactNode } from 'react';
import { useAuth } from '@/core/auth/AuthProvider';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

interface AppBootstrapGateProps {
  children: ReactNode;
}

/**
 * AppBootstrapGate
 * 
 * 인증 및 사업장/업종 해석이 완료될 때까지 RefineApp 마운트를 지연시킵니다.
 * - 인증 확인 중: LoadingScreen
 * - 비인증 상태 (!user): 로그인/공개 라우트 처리를 위해 RefineApp 렌더 허용
 * - 인증된 사용자:
 *   - 사업장/멤버십 로딩 중 (orgLoading || organizationsStatus === 'loading'): LoadingScreen 노출하여
 *     피아노 리소스 선등록 플리커링 및 404 라우팅 위험 원천 차단
 *   - 사업장 목록 에러 (멤버십 없음): 재시도 에러 화면 노출
 *   - 사업장/업종 확정 후: children (RefineApp) 마운트
 */
export const AppBootstrapGate: FC<AppBootstrapGateProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const {
    loading: orgLoading,
    organizationsStatus,
    organizationsError,
    refreshOrganizations,
    organizations,
  } = useOrganization();

  // 1. 인증 세션 확인 중
  if (authLoading) {
    return <LoadingScreen message="로그인 세션을 확인하는 중..." />;
  }

  // 2. 비인증 상태: 로그인 페이지 및 공개 라우트 진입 허용
  if (!user) {
    return <>{children}</>;
  }

  // 3. 인증 사용자: 사업장/멤버십 정보 로딩 중 (RefineApp 마운트 지연)
  if (orgLoading || organizationsStatus === 'loading') {
    return <LoadingScreen message="사업장 정보를 불러오는 중..." />;
  }

  // 4. 사업장 목록 조회 에러 (멤버십 없는 에러 상태)
  if (organizationsStatus === 'error' && (!organizations || organizations.length === 0)) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 p-4 text-center"
        data-testid="bootstrap-gate-error"
      >
        <p className="text-sm text-rose-600 font-medium max-w-sm">
          {organizationsError || '사업장 목록을 불러오지 못했습니다.'}
        </p>
        <button
          type="button"
          onClick={() => void refreshOrganizations()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl min-h-[44px] hover:bg-indigo-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // 5. 사업장/멤버십 해석 완료 -> RefineApp 정상 마운트
  return <>{children}</>;
};

export default AppBootstrapGate;
