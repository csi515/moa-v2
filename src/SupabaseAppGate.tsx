import React, { useCallback, type FC, type ReactNode } from 'react';
import { useAuth } from '@/core/auth/AuthProvider';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { StorageHydrator } from '@/StorageHydrator';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { ParentShell } from '@/modules/parent/ParentShell';
import { CustomerShell } from '@/core/customer/CustomerShell';
import { OwnerOperationStoppedView } from '@/core/organizations/OwnerOperationStoppedView';
import { OrganizationSelector } from '@/core/organizations/OrganizationSelector';
import { PendingStaffInviteGate } from '@/core/staff/components/PendingStaffInviteGate';
import { IndustryAppRouter } from '@/app/industry/IndustryAppRouter';

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
    organizationsError,
    refreshOrganizations,
    currentOrganization,
    selectedMembership,
    organizations,
    parentPortalActive,
    customerPortalActive,
    portalMode,
    blockedOwnerOrgIds,
  } = useOrganization();

  const handleRetry = useCallback(() => {
    void refreshOrganizations();
  }, [refreshOrganizations]);

  // 1. 인증 확인 중
  if (authLoading) {
    return <LoadingScreen message="로그인 세션을 확인하는 중..." />;
  }

  // 2. 비인증 상태 (Refine Authenticated fallback 처리 대상)
  if (!user) {
    return null;
  }

  // 3. 사업장 / 멤버십 로딩 중
  if (orgLoading || organizationsStatus === 'loading') {
    return <LoadingScreen message="사업장 정보를 불러오는 중..." />;
  }

  // 4. 사업장 목록 조회 에러 (기존 memberships가 없는 경우)
  if (organizationsStatus === 'error' && (!organizations || organizations.length === 0)) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 p-4 text-center"
        data-testid="organization-gate-error"
      >
        <p className="text-sm text-rose-600 font-medium max-w-sm">
          {organizationsError || '사업장 목록을 불러오지 못했습니다.'}
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl min-h-[44px] hover:bg-indigo-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // 5. 학부모 포털 활성 상태
  if (parentPortalActive || portalMode === 'parent') {
    return <ParentShell />;
  }

  // 6. 성인 수강생/고객 포털 활성 상태
  if (customerPortalActive || portalMode === 'customer') {
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
