/**
 * UI/application adapter for the existing authorization engine.
 * It owns no state and deliberately delegates every permission decision to
 * evaluatePermission so RLS-aligned role, scope, and grant semantics stay intact.
 */
import { canAccessLocation as locationIsAccessible } from '@/core/locations/locationAware';
import { evaluatePermission } from './authorizationService';
import { resolveAuthScope } from './scopes';
import type { AuthorizationGrant, AuthScopeType, Permission } from './types';

export type AuthorizationApiInput = {
  organizationId: string;
  role: string | null | undefined;
  locationId?: string | null;
  customerId?: string | null;
  extraGrants?: readonly AuthorizationGrant[] | null;
};

export type CanInput = {
  permission: Permission | string;
  scopeType?: AuthScopeType;
  scopeId?: string | null;
};

export type AuthorizationApi = {
  can: (input: CanInput) => boolean;
  canAccessLocation: (locationId: string | null | undefined) => boolean;
};

export function createAuthorizationApi(input: AuthorizationApiInput): AuthorizationApi {
  const extraGrants = input.extraGrants ?? [];

  const canAccessLocation = (locationId: string | null | undefined): boolean =>
    locationIsAccessible(
      { organizationId: input.organizationId, role: input.role, extraGrants },
      locationId
    );

  const can = ({ permission, scopeType = 'organization', scopeId }: CanInput): boolean => {
    const locationId = scopeType === 'location' ? (scopeId ?? input.locationId) : input.locationId;
    if (scopeType === 'location' && !canAccessLocation(locationId)) return false;

    return evaluatePermission({
      role: input.role,
      permission,
      scope: resolveAuthScope({
        organizationId: input.organizationId,
        type: scopeType,
        locationId,
        customerId: input.customerId,
        scopeId,
      }),
      extraGrants,
    });
  };

  return { can, canAccessLocation };
}
