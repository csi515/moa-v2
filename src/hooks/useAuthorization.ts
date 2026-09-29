import { useEffect, useMemo, useState } from 'react';
import { createRequestContext } from '@/core/application/requestContext';
import type { RequestContext } from '@/core/application/types';
import {
  createAuthorizationApi,
  type AuthorizationApi,
  type AuthorizationGrant,
} from '@/core/authorization';
import { locationService } from '@/core/locations/locationService';
import { useOptionalOrganization } from '@/core/organizations/OrganizationProvider';
import { useActiveUser } from '@/shared/session/useActiveUser';

/** Current workspace actor and the public UI authorization adapter. */
export type AuthorizationState = {
  role: string | null | undefined;
  organizationId: string;
  locationId: string | null;
  staffId: string | null;
  parentCustomerId: string | null;
  extraGrants: readonly AuthorizationGrant[];
  requestContext: RequestContext | null;
  authorization: AuthorizationApi;
};

export function useAuthorization(): AuthorizationState {
  const currentUser = useActiveUser();
  const organization = useOptionalOrganization();
  const role = organization?.currentRole ?? currentUser.role;
  const organizationId = organization?.currentOrganization?.id ?? '';
  const locationId = organization?.currentLocation?.id ?? null;
  const staffId = currentUser.staffId ?? organization?.currentStaffId ?? null;
  const parentCustomerId = currentUser.parentCustomerId ?? organization?.currentParentCustomerId ?? null;
  const [extraGrants, setExtraGrants] = useState<AuthorizationGrant[]>([]);

  useEffect(() => {
    if (!organizationId) {
      setExtraGrants([]);
      return;
    }
    let cancelled = false;
    void locationService.listAccessGrants(organizationId).then((grants) => {
      if (!cancelled) setExtraGrants(grants);
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const authorization = useMemo(
    () =>
      createAuthorizationApi({
        organizationId,
        role,
        locationId,
        customerId: parentCustomerId,
        extraGrants,
      }),
    [extraGrants, locationId, organizationId, parentCustomerId, role]
  );

  const requestContext = useMemo<RequestContext | null>(() => {
    if (!currentUser.id || !organizationId) return null;
    return createRequestContext({
      userId: currentUser.id,
      organizationId,
      role,
      locationId,
      staffId,
      extraGrants,
      locations: organization?.locations ?? [],
      customerId: parentCustomerId,
    });
  }, [
    currentUser.id,
    extraGrants,
    locationId,
    organization?.locations,
    organizationId,
    parentCustomerId,
    role,
    staffId,
  ]);

  return {
    role,
    organizationId,
    locationId,
    staffId,
    parentCustomerId,
    extraGrants,
    requestContext,
    authorization,
  };
}
