import { DEFAULT_LOCATION_CODE, DEFAULT_LOCATION_SLUG, LOCATION_HOURS_SOURCE } from './types';
import type { Location, OrganizationLocationScope } from './types';

export function normalizeLocationCode(value?: string | null): string {
  const raw = (value ?? '').trim().toLowerCase();
  return raw || DEFAULT_LOCATION_CODE;
}

export function normalizeLocationSlug(value?: string | null, fallbackCode?: string): string {
  const raw = (value ?? '').trim().toLowerCase();
  if (raw) return raw;
  return normalizeLocationCode(fallbackCode);
}

export function organizationLocationScope(
  organizationId: string,
  locationId?: string | null
): OrganizationLocationScope {
  return { organizationId, locationId: locationId ?? null };
}

export function optionalLocationId(scope: OrganizationLocationScope): string | null {
  return scope.locationId ?? null;
}

export function isLocationInOrganization(
  location: Pick<Location, 'organizationId'>,
  organizationId: string
): boolean {
  return location.organizationId === organizationId;
}

/** Availability 규칙이 나중에 location 에 붙을 때 쓰는 참조 */
export function locationHoursRef(locationId: string): {
  targetType: 'location';
  targetId: string;
  source: typeof LOCATION_HOURS_SOURCE;
} {
  return { targetType: 'location', targetId: locationId, source: LOCATION_HOURS_SOURCE };
}

/**
 * 저장된 location 이 현재 조직에 있을 때만 사용.
 * 없으면 null — 기존 organization context 만으로도 동작한다.
 */
export function resolveLocationSelection(
  locations: readonly Location[],
  organizationId: string | null,
  storedLocationId: string | null
): Location | null {
  if (!organizationId || locations.length === 0) return null;
  if (!storedLocationId) return null;
  return (
    locations.find(
      (row) => row.id === storedLocationId && row.organizationId === organizationId
    ) ?? null
  );
}

export function locationCodeTaken(
  locations: readonly Pick<Location, 'id' | 'code'>[],
  code: string,
  excludeId?: string
): boolean {
  const normalized = normalizeLocationCode(code);
  return locations.some((row) => row.code === normalized && row.id !== excludeId);
}

export { DEFAULT_LOCATION_SLUG };
