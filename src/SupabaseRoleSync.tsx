import React, { useEffect } from 'react';
import { useOptionalAuth } from './core/auth/AuthProvider';
import { useOptionalOrganization } from './core/organizations/OrganizationProvider';
import {
  resolveActiveUserRole,
  type AppPortalMode,
} from './core/organizations/resolveOrganizationContext';
import { StorageService } from './services/storage';

/** Supabase 로그인 사용자 → 조직 역할·staffId 기반 activeUser 동기화 */
export const SupabaseRoleSync: React.FC = () => {
  const auth = useOptionalAuth();
  const org = useOptionalOrganization();

  useEffect(() => {
    if (!auth?.user) return;

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
    if (role == null) return;

    StorageService.setActiveUser({
      id: auth.user.id,
      name: fullName,
      role,
      staffId: org?.currentStaffId ?? null,
      parentCustomerId: org?.currentParentCustomerId ?? null,
      email: auth.user.email || '',
    });
  }, [
    auth?.user,
    org?.loading,
    org?.currentRole,
    org?.currentStaffId,
    org?.currentParentCustomerId,
    org?.parentPortalActive,
    org?.customerPortalActive,
  ]);

  return null;
};
