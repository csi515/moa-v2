import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthorizationGrant } from '@/core/authorization';
import type { MemberRole } from '@/lib/supabase';
import {
  canAccessLocation,
  filterAccessibleLocations,
  hasLocationAssignment,
  pickSafeLocation,
} from './locationAware';
import { resolveLocationSelection } from './locationHelpers';
import {
  clearStoredLocationId,
  getStoredLocationId,
  locationService,
  storeLocationId,
} from './locationService';
import { formatLocationScopeLabel } from './locationLabels';
import type { Location, LocationAccessContext, TrustedLocationSelection } from './types';

/**
 * OrganizationProvider 확장점. 선택이 없어도 기존 org context 는 그대로 동작한다.
 * 목록/선택은 authorization location scope 와 같은 기준을 쓴다.
 */
export function useOrganizationLocationState(
  organizationId: string | null,
  role: MemberRole | null
): {
  locations: Location[];
  currentLocation: Location | null;
  selectLocation: (locationId: string | null) => void;
  trustedLocation: TrustedLocationSelection;
  locationLabel: string;
  canChangeLocation: boolean;
  canClearLocation: boolean;
  locationsStatus: 'loading' | 'ready' | 'error';
} {
  const [catalog, setCatalog] = useState<Location[]>([]);
  const [extraGrants, setExtraGrants] = useState<AuthorizationGrant[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [catalogReady, setCatalogReady] = useState(false);
  const [catalogFailed, setCatalogFailed] = useState(false);
  const [grantsReady, setGrantsReady] = useState(false);

  const access = useMemo<LocationAccessContext>(
    () => ({
      organizationId: organizationId ?? '',
      role,
      extraGrants,
    }),
    [organizationId, role, extraGrants]
  );

  const locations = useMemo(
    () => (organizationId ? filterAccessibleLocations(catalog, access) : []),
    [access, catalog, organizationId]
  );

  const restricted = hasLocationAssignment(access);

  useEffect(() => {
    setCatalog([]);
    setExtraGrants([]);
    setCatalogReady(false);
    setCatalogFailed(false);
    setGrantsReady(false);
    setSelectedLocationId(organizationId ? getStoredLocationId(organizationId) : null);
    if (!organizationId) return;

    let cancelled = false;
    void locationService.list(organizationId).then(
      (rows) => {
        if (cancelled) return;
        setCatalog(rows);
        setCatalogFailed(false);
        setCatalogReady(true);
      },
      () => {
        if (cancelled) return;
        setCatalog([]);
        setCatalogFailed(true);
        setCatalogReady(true);
      }
    );
    void locationService.listAccessGrants(organizationId).then((grants) => {
      if (cancelled) return;
      setExtraGrants(grants);
      setGrantsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId || !catalogReady || !grantsReady) return;
    const preferred = resolveLocationSelection(locations, organizationId, selectedLocationId);
    if (preferred) {
      if (getStoredLocationId(organizationId) !== preferred.id) {
        storeLocationId(preferred.id, organizationId);
      }
      return;
    }
    if (!restricted && !selectedLocationId) return;
    const fallback = pickSafeLocation(locations, selectedLocationId);
    if (!fallback) {
      if (selectedLocationId) {
        clearStoredLocationId();
        setSelectedLocationId(null);
      }
      return;
    }
    if (fallback.id === selectedLocationId) return;
    storeLocationId(fallback.id, organizationId);
    setSelectedLocationId(fallback.id);
  }, [
    catalogReady,
    grantsReady,
    locations,
    organizationId,
    restricted,
    selectedLocationId,
  ]);

  const currentLocation = resolveLocationSelection(
    locations,
    organizationId,
    selectedLocationId
  );

  const selectLocation = useCallback(
    (locationId: string | null) => {
      if (!organizationId) return;
      if (!locationId) {
        if (restricted) {
          const fallback = pickSafeLocation(locations);
          if (fallback) {
            storeLocationId(fallback.id, organizationId);
            setSelectedLocationId(fallback.id);
          }
          return;
        }
        clearStoredLocationId();
        setSelectedLocationId(null);
        return;
      }
      if (!canAccessLocation(access, locationId)) return;
      const found = locations.find(
        (row) => row.id === locationId && row.organizationId === organizationId
      );
      if (!found) return;
      storeLocationId(locationId, organizationId);
      setSelectedLocationId(locationId);
    },
    [access, locations, organizationId, restricted]
  );

  const trustedLocation = useMemo<TrustedLocationSelection>(
    () => ({
      organizationId: organizationId ?? '',
      locationId: currentLocation?.id ?? null,
      locations,
    }),
    [currentLocation, locations, organizationId]
  );

  return {
    locations,
    currentLocation,
    selectLocation,
    trustedLocation,
    locationLabel: formatLocationScopeLabel(currentLocation, locations.length),
    canChangeLocation: locations.length > 1,
    canClearLocation: locations.length > 1 && !restricted,
    locationsStatus:
      organizationId && (!catalogReady || !grantsReady)
        ? 'loading'
        : catalogFailed
          ? 'error'
          : 'ready',
  };
}