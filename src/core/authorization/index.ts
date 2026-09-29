export { authorizationCapability } from './authorizationCapability';
export type { AuthorizationCapability } from './authorizationCapability';
export { canAuthorize, evaluatePermission } from './authorizationService';
export { createAuthorizationApi } from './authorizationApi';
export type { AuthorizationApi, AuthorizationApiInput, CanInput } from './authorizationApi';
export {
  compatIsOrgAdmin,
  compatIsOrgStaffActor,
  compatibilityRoleContractsHold,
  isOrgAdmin,
  isOrgOwner,
  isParentRole,
  isStaffRole,
  resolveRoleAccessKind,
} from './compatibility';
export {
  getPermissionDefinition,
  isKnownPermission,
  isKnownScopeType,
  PERMISSION_DEFINITIONS,
  PERMISSION_KEYS,
} from './registry';
export {
  defaultPermissionsForRole,
  isOrgAdminRole,
  isOrgStaffActorRole,
  isStaffLikeRole,
  ORG_ADMIN_ROLES,
  ORG_STAFF_ACTOR_ROLES,
  roleHasDefaultPermission,
  STAFF_DEFAULT_PERMISSIONS,
  STAFF_LIKE_ROLES,
} from './roleDefaults';
export {
  customerScope,
  isValidScope,
  locationScope,
  organizationScope,
  organizationScopeCovers,
  resourceScope,
  scopeTargetId,
} from './scopes';
export { AUTH_SCOPE_TYPES } from './types';
export type {
  AuthorizationGrant,
  AuthScope,
  AuthScopeType,
  EvaluatePermissionInput,
  Permission,
  PermissionDefinition,
} from './types';
