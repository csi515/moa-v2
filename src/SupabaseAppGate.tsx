import React, { Suspense, lazy, type FC, type ReactNode } from 'react';
import { useAuth } from '@/core/auth/AuthProvider';
import { JOURNEY_LOADING_MESSAGES } from '@/core/auth/journeyStates';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { StorageHydrator } from '@/StorageHydrator';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { OwnerOperationStoppedView } from '@/core/organizations/OwnerOperationStoppedView';
import { OrganizationSelector } from '@/core/organizations/OrganizationSelector';
import { PendingStaffInviteGate } from '@/core/staff/components/PendingStaffInviteGate';
import { IndustryAppRouter } from '@/app/industry/IndustryAppRouter';

// 포털 셸은 해당 역할 진입 시에만 로드한다 (초기 번들 분리).
const LazyParentShell = lazy(() =>
  import('@/modules/parent/ParentShell').then((m) => ({ default: m.ParentShell }))
);
const LazyCustomerShell = lazy(() =>
  import('@/core/customer/CustomerShell').then((m) => ({ default: m.CustomerShell }))
);
const ParentShell: FC = () => (
  <Suspense fallback={<LoadingScreen />}>
    <LazyParentShell />
  </Suspense>
);
const CustomerShell: FC = () => (
  <Suspense fallback={<LoadingScreen />}>
    <LazyCustomerShell />
  </Suspense>
);

interface SupabaseAppGateProps {
  children?: ReactNode;
}

/**
 * MOA v2 Core App Gate.
 * 
 * 유지 흐름:
 * 로그인 -> Supabase session -> AuthProvider -> OrganizationProvider
 * -> membership 조회 -> organization 선택/복원 -> active organization
 * -> StorageHydrator -> IndustryAppRouter / Refine Shell
 * 
 * 보장 사항:
 * - single / multiple organization 진입
 * - 저장된 organization 복원 및 stale organization 처리
 * - 신규 가입 사용자 onboarding (OrganizationSelector / CreateOrganizationWizard)
 * - parent / customer portal 전용 진입 분기
 * - blocked owner 진입 차단 (OwnerOperationStoppedView)
 * - StorageHydrator를 통한 도메인 스토리지 하이드레이션
 * - ?staff_link 토큰 감지 (PendingStaffInviteGate)
 */
export const SupabaseAppGate: FC<SupabaseAppGateProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const {
    loading: orgLoading,
    organizationsStatus,
    currentOrganization,
    selectedMembership,
    parentPortalActive,
    customerPortalActive,
    portalMode,
    blockedOwnerOrgIds,
  } = useOrganization();

  // 1. 인증 확인 중
  if (authLoading) {
    return <LoadingScreen message={JOURNEY_LOADING_MESSAGES.checkingSession} />;
  }

  // 2. 비인증 상태 (Refine Authenticated fallback 처리 대상)
  if (!user) {
    return null;
  }

  // 3. 사업장 / 멤버십 로딩 중
  if (orgLoading || organizationsStatus === 'loading') {
    return <LoadingScreen message={JOURNEY_LOADING_MESSAGES.loadingOrganizations} />;
  }

  // 4. 멤버십 fetch 실패(0건)도 OrganizationSelector 로 보냄 — 재시도·학원 개설 UX
  //    (Selector 가 organizationsStatus === 'error' 배너를 표시)

  // 5. 학부모 포털 활성 상태
  if (parentPortalActive || portalMode === 'parent') {
    if (currentOrganization?.id) {
      return (
        <StorageHydrator
          organizationId={currentOrganization.id}
          industryType={currentOrganization.industry_type}
        >
          <ParentShell />
        </StorageHydrator>
      );
    }
    return <ParentShell />;
  }

  // 6. 성인 수강생/고객 포털 활성 상태
  if (customerPortalActive || portalMode === 'customer') {
    if (currentOrganization?.id) {
      return (
        <StorageHydrator
          organizationId={currentOrganization.id}
          industryType={currentOrganization.industry_type}
        >
          <CustomerShell />
        </StorageHydrator>
      );
    }
    return <CustomerShell />;
  }

  // 7. 차단된 사업주 (휴·폐업 등)
  if (currentOrganization && blockedOwnerOrgIds.includes(currentOrganization.id)) {
    return <OwnerOperationStoppedView />;
  }

  // 8. 사업장이 없거나 아직 선택되지 않은 상태 (다중 사업장 대기, stale 해제, 온보딩 대상)
  if (!currentOrganization || !selectedMembership) {
    return <OrganizationSelector />;
  }

  // 9. 사업장 정상 활성화 -> 스토리지 하이드레이션 -> 초대 게이트 -> 업종/Refine 셸
  return (
    <StorageHydrator
      organizationId={currentOrganization.id}
      industryType={currentOrganization.industry_type}
    >
      <PendingStaffInviteGate />
      {children ?? <IndustryAppRouter />}
    </StorageHydrator>
  );
};

export default SupabaseAppGate;
