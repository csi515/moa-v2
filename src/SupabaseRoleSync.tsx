import React, { useEffect } from 'react';
import { useOptionalAuth } from './core/auth/AuthProvider';
import { useOptionalOrganization } from './core/organizations/OrganizationProvider';
import {
  resolveActiveUserRole,
  type AppPortalMode,
} from './core/organizations/resolveOrganizationContext';
import { StorageService } from './services/storage';
import { bindAccessControlContextResolver } from './providers/accessControlProvider';

/** Supabase 로그인 사용자 → 조직 역할·staffId 및 MOA Authorization 컨텍스트 동기화 */
export const SupabaseRoleSync: React.FC = () => {
  const auth = useOptionalAuth();
  const org = useOptionalOrganization();

  useEffect(() => {
    if (!auth?.user) {
      bindAccessControlContextResolver(null);
      return;
    }

    const fullName =
      (auth.user.user_metadata?.full_name as string | undefined) ||
      auth.user.email?.split('@')[0] ||
      '사용자';

    const portalMode: AppPortalMode = org
      ? org.parentPortalActive
        ? 'parent'
        : org.customerPortalActive
          ? 'customer'
          : 'none'
      : 'none';

    // membership 없음 ≠ parent. loading 중에는 sync skip.
    const role = resolveActiveUserRole({
      loading: Boolean(org?.loading),
      currentRole: org?.currentRole ?? null,
      portalMode,
    });

    if (role == null) {
      bindAccessControlContextResolver(null);
      return;
    }

    const activeUser = {
      id: auth.user.id,
      name: fullName,
      role,
      staffId: org?.currentStaffId ?? null,
      parentCustomerId: org?.currentParentCustomerId ?? null,
      email: auth.user.email || '',
    };

    StorageService.setActiveUser(activeUser);

    // OrganizationProvider의 활성 컨텍스트를 Refine accessControlProvider의 최종 authority로 바인딩
    bindAccessControlContextResolver({
      getActiveUser: () => activeUser,
      getOrganizationId: () => {
        if (org?.loading) return null;
        // 선택된 membership 또는 currentOrganization이 권한 판단의 진실 원천(SoT)임.
        return org?.selectedMembership
          ? org.currentOrganization?.id ?? org.selectedMembership.organizationId
          : null;
      },
      getLocationId: (orgId) => {
        const activeOrgId = orgId || org?.currentOrganization?.id;
        if (!activeOrgId) return null;
        return org?.currentLocation?.id ?? null;
      },
    });

    return () => {
      bindAccessControlContextResolver(null);
    };
  }, [
    auth?.user,
    org?.loading,
    org?.selectedMembership,
    org?.currentOrganization,
    org?.currentLocation,
    org?.currentRole,
    org?.currentStaffId,
    org?.currentParentCustomerId,
    org?.parentPortalActive,
    org?.customerPortalActive,
  ]);

  return null;
};
