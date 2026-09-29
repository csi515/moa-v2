import type { IndustryType } from '@/core/industry/types';
import { useOptionalOrganization } from '@/core/organizations/OrganizationProvider';
import type { AuthScopeType, Permission } from '@/core/authorization';
import { useAuthorization } from '@/hooks/useAuthorization';
import type { NavTab } from '@/shared/navigation/navigationTypes';
import {
  isOrgAdmin,
  isOrgOwner,
} from './permissions';
import { useNavigationPermissions } from './useNavigationPermissions';

/**
 * @deprecated Prefer `useCan` for data permission decisions and
 * `useNavigationPermissions` for tab visibility. Kept for incremental UI migration.
 */
export function usePermissions() {
  const org = useOptionalOrganization();
  const { role, staffId, parentCustomerId, requestContext, authorization } = useAuthorization();
  const industry = (org?.currentOrganization?.industry_type ?? 'piano') as IndustryType;
  const navigation = useNavigationPermissions({ role, staffId, industry });

  return {
    role,
    requestContext,
    staffId,
    parentCustomerId,
    industry,
    settings: navigation.settings,
    attendanceEnabled: navigation.attendanceEnabled,
    isAdmin: isOrgAdmin(role),
    isOwner: isOrgOwner(role),
    isStaff: navigation.isStaff,
    isParent: navigation.isParent,
    canAccessLocation: authorization.canAccessLocation,
    canPermission: (
      permission: Permission | string,
      scopeType: AuthScopeType = 'organization',
      scopeId?: string | null
    ) => authorization.can({ permission, scopeType, scopeId }),
    allowedTabs: navigation.allowedTabs,
    canAccess: (tab: NavTab) => navigation.allowedTabs.includes(tab),
    defaultTab: navigation.defaultTab,
    roleLabel: navigation.roleLabel,
    roleBadge: navigation.roleBadge,
  };
}
