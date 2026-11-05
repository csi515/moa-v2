import React, { type FC, type ReactNode } from 'react';
import { useAuth } from '@/core/auth/AuthProvider';
import { JOURNEY_LOADING_MESSAGES } from '@/core/auth/journeyStates';
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
 *   - 사업장/멤버십 로딩 중: LoadingScreen
 *   - 멤버십 fetch 실패(0건): RefineApp 마운트 허용 → OrganizationSelector 가 재시도·개설 UX
 *   - 사업장/업종 확정 후: children 마운트
 */
export const AppBootstrapGate: FC<AppBootstrapGateProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { loading: orgLoading, organizationsStatus } = useOrganization();

  if (authLoading) {
    return <LoadingScreen message={JOURNEY_LOADING_MESSAGES.checkingSession} />;
  }

  if (!user) {
    return <>{children}</>;
  }

  if (orgLoading || organizationsStatus === 'loading') {
    return <LoadingScreen message={JOURNEY_LOADING_MESSAGES.loadingOrganizations} />;
  }

  // error + 0 membership 도 Selector 로 보낸다 (게이트에서 막지 않음)
  return <>{children}</>;
};

export default AppBootstrapGate;
