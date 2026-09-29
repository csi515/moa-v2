/**
 * Role + Permission + Scope Capability.
 * 기존 is_org_admin / is_org_staff_actor / RLS helper를 제거하지 않는다.
 */
import { canAuthorize, evaluatePermission, toAuthorizationGrant } from './authorizationService';
import {
  compatIsOrgAdmin,
  compatIsOrgStaffActor,
  isOrgAdmin,
  isStaffRole,
} from './compatibility';
import {
  getPermissionDefinition,
  isKnownPermission,
  isKnownScopeType,
  PERMISSION_DEFINITIONS,
  PERMISSION_KEYS,
} from './registry';
import {
  defaultPermissionsForRole,
  isOrgAdminRole,
  isOrgStaffActorRole,
  roleHasDefaultPermission,
  STAFF_DEFAULT_PERMISSIONS,
} from './roleDefaults';
import {
  customerScope,
  locationScope,
  normalizeScopeId,
  organizationScope,
  resolveAuthScope,
  resourceScope,
} from './scopes';

export const authorizationCapability = {
  permissions: PERMISSION_KEYS,
  definitions: PERMISSION_DEFINITIONS,
  staffDefaults: STAFF_DEFAULT_PERMISSIONS,
  isKnownPermission,
  isKnownScopeType,
  getPermissionDefinition,
  roleHasDefaultPermission,
  defaultPermissionsForRole,
  evaluate: evaluatePermission,
  can: canAuthorize,
  toGrant: toAuthorizationGrant,
  organizationScope,
  locationScope,
  customerScope,
  resourceScope,
  resolveScope: resolveAuthScope,
  normalizeScopeId,
  isOrgAdmin,
  isOrgStaffActor: compatIsOrgStaffActor,
  compatIsOrgAdmin,
  compatIsOrgStaffActor,
  isOrgAdminRole,
  isOrgStaffActorRole,
  isStaffRole,
} as const;

export type AuthorizationCapability = typeof authorizationCapability;
