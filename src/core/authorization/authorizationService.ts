/**
 * core.has_permission 과 동일한 Role + Grant + Scope 판정.
 * 기존 RLS / is_org_admin 화면 체크를 교체하지 않는다.
 */
import { compatIsOrgAdmin } from './compatibility';
import { isKnownPermission, isKnownScopeType } from './registry';
import { roleHasDefaultPermission } from './roleDefaults';
import { isValidScope, normalizeScopeId, organizationScopeCovers, scopeTargetId } from './scopes';
import type { AuthorizationGrant, AuthScopeType, EvaluatePermissionInput } from './types';

function grantMatchesPermission(
  grant: AuthorizationGrant,
  input: EvaluatePermissionInput
): boolean {
  if (!grant.active) return false;
  if (grant.organizationId !== input.scope.organizationId) return false;
  if (grant.permission !== input.permission) return false;
  if (grant.scopeType === 'organization') return true;
  return (
    grant.scopeType === input.scope.type &&
    normalizeScopeId(grant.scopeId) === scopeTargetId(input.scope)
  );
}

function assignmentIds(
  explicit: readonly string[] | null | undefined,
  grants: readonly AuthorizationGrant[] | null | undefined,
  organizationId: string,
  scopeType: AuthScopeType
): readonly string[] | null {
  if (explicit != null) {
    return explicit.map((id) => normalizeScopeId(id)).filter((id): id is string => id != null);
  }
  const fromGrants = (grants ?? [])
    .filter(
      (row) =>
        row.active &&
        row.organizationId === organizationId &&
        row.scopeType === scopeType &&
        normalizeScopeId(row.scopeId)
    )
    .map((row) => normalizeScopeId(row.scopeId) as string);
  return fromGrants.length > 0 ? fromGrants : null;
}

/** 해당 scope_type 배정이 없으면 전 범위. 있으면 scope_id가 일치해야 한다. */
function assignmentAllows(input: EvaluatePermissionInput): boolean {
  const { scope } = input;
  if (scope.type === 'organization') return true;

  const target = scopeTargetId(scope);
  const assigned =
    scope.type === 'location'
      ? assignmentIds(input.assignedLocationIds, input.extraGrants, scope.organizationId, 'location')
      : scope.type === 'customer'
        ? assignmentIds(input.assignedCustomerIds, input.extraGrants, scope.organizationId, 'customer')
        : assignmentIds(input.assignedResourceIds, input.extraGrants, scope.organizationId, 'resource');

  if (assigned == null || assigned.length === 0) return true;
  return target != null && assigned.includes(target);
}

export function evaluatePermission(input: EvaluatePermissionInput): boolean {
  if (!isKnownPermission(input.permission)) return false;
  if (!isValidScope(input.scope) || !isKnownScopeType(input.scope.type)) return false;
  if (!organizationScopeCovers(input.scope.type)) return false;

  if ((input.extraGrants ?? []).some((grant) => grantMatchesPermission(grant, input))) {
    return true;
  }

  if (compatIsOrgAdmin(input.role)) {
    return true;
  }

  if (!roleHasDefaultPermission(input.role, input.permission)) {
    return false;
  }

  return assignmentAllows(input);
}

export function canAuthorize(
  role: string | null | undefined,
  permission: string,
  scope: EvaluatePermissionInput['scope'],
  extras?: Omit<EvaluatePermissionInput, 'role' | 'permission' | 'scope'>
): boolean {
  return evaluatePermission({ role, permission, scope, ...extras });
}

export function toAuthorizationGrant(row: {
  organization_id: string;
  user_id?: string | null;
  permission: string;
  scope_type: string;
  scope_id?: string | null;
  is_active: boolean;
}): AuthorizationGrant | null {
  if (!isKnownScopeType(row.scope_type)) return null;
  return {
    organizationId: row.organization_id,
    userId: row.user_id,
    permission: row.permission,
    scopeType: row.scope_type,
    scopeId: normalizeScopeId(row.scope_id),
    active: row.is_active,
  };
}
