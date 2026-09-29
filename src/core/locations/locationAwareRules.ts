/**
 * 신규 도메인용 organization_id + location_id 규칙.
 * 기존 Core 조회/쓰기를 호출하거나 바꾸지 않는다.
 */
import {
  LEGACY_LOCATION_SCOPE_POLICY,
  LOCATION_SCOPE_POLICY,
  ORGANIZATION_SCOPE_POLICY,
  type LocationAware,
  type LocationAwarePolicy,
} from './locationAware';
import type { LocationAwareEntity } from './locationAwareRegistry';
import { policyForEntity } from './locationAwareRegistry';
import type { Location } from './types';

export class LocationAwareError extends Error {
  readonly code: 'location_required' | 'org_mismatch' | 'location_not_found';

  constructor(code: LocationAwareError['code'], message: string) {
    super(message);
    this.name = 'LocationAwareError';
    this.code = code;
  }
}

export function locationBelongsToOrganization(
  locations: readonly Pick<Location, 'id' | 'organizationId'>[],
  organizationId: string,
  locationId: string | null | undefined
): boolean {
  if (!organizationId || !locationId) return false;
  return locations.some((row) => row.id === locationId && row.organizationId === organizationId);
}

export function assertLocationInOrganization(
  locations: readonly Pick<Location, 'id' | 'organizationId'>[],
  organizationId: string,
  locationId: string | null | undefined,
  required = false
): string | null {
  if (!locationId) {
    if (required) {
      throw new LocationAwareError('location_required', 'Location required');
    }
    return null;
  }
  const found = locations.find((row) => row.id === locationId);
  if (!found) {
    throw new LocationAwareError('location_not_found', 'Location not found');
  }
  if (found.organizationId !== organizationId) {
    throw new LocationAwareError('org_mismatch', 'Organization mismatch');
  }
  return locationId;
}

/**
 * 선택 지점 조회.
 * selected=null → 조직 전체(기존 동작).
 * row.locationId=null → 미배정/레거시 레코드, includeUnassignedOnRead면 포함.
 */
export function locationAwareVisible(
  row: Pick<LocationAware, 'locationId'>,
  selectedLocationId?: string | null,
  policy: LocationAwarePolicy = LOCATION_SCOPE_POLICY
): boolean {
  if (selectedLocationId == null || selectedLocationId === '') return true;
  if (row.locationId == null || row.locationId === '') {
    return policy.includeUnassignedOnRead;
  }
  return row.locationId === selectedLocationId;
}

export function resolveWriteLocationId(
  entity: LocationAwareEntity | LocationAwarePolicy,
  locationId?: string | null
): string | null {
  const policy = 'key' in entity ? policyForEntity(entity) : entity;
  if (policy.kind === 'organization') return null;
  if (!policy.requireLocationOnWrite) return null;
  if (!locationId) {
    throw new LocationAwareError('location_required', 'Location required');
  }
  return locationId;
}

export function locationAwareOrFilter(
  selectedLocationId: string,
  column = 'location_id'
): string {
  return `${column}.eq.${selectedLocationId},${column}.is.null`;
}

export function policyForNewDomain(kind: LocationAwarePolicy['kind']): LocationAwarePolicy {
  return kind === 'organization' ? ORGANIZATION_SCOPE_POLICY : LOCATION_SCOPE_POLICY;
}

export function policyForExistingDomain(kind: LocationAwarePolicy['kind']): LocationAwarePolicy {
  return kind === 'organization' ? ORGANIZATION_SCOPE_POLICY : LEGACY_LOCATION_SCOPE_POLICY;
}
