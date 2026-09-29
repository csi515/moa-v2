import { isKnownScopeType } from './registry';
import type { AuthScope, AuthScopeType } from './types';

export function organizationScope(organizationId: string): AuthScope {
  return { type: 'organization', organizationId };
}

export function locationScope(organizationId: string, locationId: string): AuthScope {
  return { type: 'location', organizationId, locationId };
}

export function customerScope(organizationId: string, customerId: string): AuthScope {
  return { type: 'customer', organizationId, customerId };
}

export function resourceScope(organizationId: string, resourceId: string): AuthScope {
  return { type: 'resource', organizationId, resourceId };
}

/** core.has_permission 의 NULLIF(btrim(p_scope_id), '') 와 동일. */
export function normalizeScopeId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function scopeTargetId(scope: AuthScope): string | null {
  if (scope.type === 'location') return normalizeScopeId(scope.locationId);
  if (scope.type === 'resource') return normalizeScopeId(scope.resourceId);
  if (scope.type === 'customer') return normalizeScopeId(scope.customerId);
  return null;
}

/** RequestContext.scope 조립. 새 scope 타입을 만들지 않는다. */
export function resolveAuthScope(input: {
  organizationId: string;
  type?: AuthScopeType;
  locationId?: string | null;
  customerId?: string | null;
  resourceId?: string | null;
  scopeId?: string | null;
}): AuthScope {
  const type = input.type ?? 'organization';
  const explicit = normalizeScopeId(input.scopeId);
  if (type === 'location') {
    return {
      type,
      organizationId: input.organizationId,
      locationId: explicit ?? normalizeScopeId(input.locationId),
    };
  }
  if (type === 'customer') {
    return {
      type,
      organizationId: input.organizationId,
      customerId: explicit ?? normalizeScopeId(input.customerId),
    };
  }
  if (type === 'resource') {
    return {
      type,
      organizationId: input.organizationId,
      resourceId: explicit ?? normalizeScopeId(input.resourceId),
    };
  }
  return organizationScope(input.organizationId);
}

/** 본사(organization) grant는 하위 location/resource/customer를 포함한다. */
export function organizationScopeCovers(requested: AuthScopeType): boolean {
  return isKnownScopeType(requested);
}

export function isValidScope(scope: AuthScope | null | undefined): boolean {
  if (!scope?.organizationId?.trim()) return false;
  return isKnownScopeType(scope.type);
}
