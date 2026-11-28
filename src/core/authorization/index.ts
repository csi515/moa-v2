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
  isSuperAdmin,
  isDirector,
  isManager,
  isStaff,
  isDriver,
  isWorker,
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
export { evaluateCustomPermission } from './permissions';
export {
  CANONICAL_TO_LEGACY_MATRIX,
  matrixKeySatisfiesCanonical,
  PERMISSION_KEY_ALIASES,
  resolveCanonicalPermission,
  resolveCanonicalPermissionKey,
} from './permissionAliases';
export {
  canViewEntityColumn,
  canViewSensitiveColumn,
  getCustomerMasked,
  listSensitiveFieldPolicies,
  maskPhoneLocal,
} from './fieldAclService';
export type { MaskedCustomer, SensitiveFieldPolicy } from './fieldAclService';
export {
  deactivateAuthorizationGrant,
  listOrganizationGrants,
  upsertAuthorizationGrant,
} from './authorizationGrantService';
export type { GrantUpsertInput } from './authorizationGrantService';
export { AUTH_SCOPE_TYPES, SIX_LEVEL_USER_ROLES } from './types';
export type {
  AuthorizationGrant,
  AuthScope,
  AuthScopeType,
  EvaluatePermissionInput,
  Permission,
  PermissionDefinition,
  SixLevelUserRole,
} from './types';
