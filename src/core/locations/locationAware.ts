/**
 * LocationAware — organization 테넌트 + 선택적 location 하위 범위.
 * 기존 organization_id 를 대체하지 않는다.
 */
import { evaluatePermission } from '@/core/authorization';
import { locationScope } from '@/core/authorization/scopes';
import { businessDateInTimezone, resolveIanaTimezone } from '@/shared/utils/localDate';
import { DEFAULT_LOCATION_CODE, type Location, type LocationAccessContext } from './types';

export const DOMAIN_SCOPE_KINDS = ['organization', 'location'] as const;

export type DomainScopeKind = (typeof DOMAIN_SCOPE_KINDS)[number];

/** 조직 공유 엔티티. location_id 컬럼을 두지 않는다. */
export type OrganizationScoped = {
  organizationId: string;
};

/** 신규 지점 운영 엔티티. organization_id + location_id(NOT NULL). */
export type LocationScoped = {
  organizationId: string;
  locationId: string;
};

/**
 * 공통 레코드 형태.
 * locationId=null 은 기존 레코드(컬럼 없음/미배정) 호환값이다.
 */
export type LocationAware = {
  organizationId: string;
  locationId: string | null;
};

export type LocationAwarePolicy = {
  kind: DomainScopeKind;
  /** 신규 location-scoped 쓰기만 true. 기존 Core는 false */
  requireLocationOnWrite: boolean;
  /** 선택 지점 조회 시 location_id IS NULL 레코드를 포함할지 */
  includeUnassignedOnRead: boolean;
};

export const ORGANIZATION_SCOPE_POLICY: LocationAwarePolicy = {
  kind: 'organization',
  requireLocationOnWrite: false,
  includeUnassignedOnRead: true,
};

/** 신규 지점 도메인 기본. 기존 테이블에는 적용하지 않는다. */
export const LOCATION_SCOPE_POLICY: LocationAwarePolicy = {
  kind: 'location',
  requireLocationOnWrite: true,
  includeUnassignedOnRead: true,
};

/** 컬럼이 아직 없는 기존 도메인 — 동작 변경 없음 */
export const LEGACY_LOCATION_SCOPE_POLICY: LocationAwarePolicy = {
  kind: 'location',
  requireLocationOnWrite: false,
  includeUnassignedOnRead: true,
};

export const NEW_LOCATION_SCOPED_TABLE_RULES = {
  tenantColumn: 'organization_id',
  locationColumn: 'location_id',
  locationNullable: false,
  locationReferences: 'core.locations(id)',
  organizationReferences: 'core.organizations(id)',
  replaceOrganizationId: false,
} as const;

export function toLocationAware(
  organizationId: string,
  locationId?: string | null
): LocationAware {
  return { organizationId, locationId: locationId ?? null };
}

export function isLocationAware(value: unknown): value is LocationAware {
  if (!value || typeof value !== 'object') return false;
  const row = value as { organizationId?: unknown; locationId?: unknown };
  return typeof row.organizationId === 'string' && row.organizationId.length > 0;
}

/** 지점 자체 접근. 고객 데이터 조회(customers.read)와 분리한다. */
export const LOCATION_ACCESS_PERMISSION = 'locations.read' as const;

/** 선택 가능 여부 = has_permission(..., 'location', id). 클라이언트에서 id만 바꿔 승격되지 않는다. */
export function canAccessLocation(
  access: LocationAccessContext,
  locationId: string | null | undefined
): boolean {
  if (!access.organizationId || !locationId) return false;
  // role 미결정 시 기본 권한 없음. extra grant만 허용된다.
  return evaluatePermission({
    role: access.role,
    permission: LOCATION_ACCESS_PERMISSION,
    scope: locationScope(access.organizationId, locationId),
    extraGrants: access.extraGrants,
  });
}

export function hasLocationAssignment(
  access: Pick<LocationAccessContext, 'organizationId' | 'extraGrants'>
): boolean {
  return (access.extraGrants ?? []).some(
    (grant) =>
      grant.active &&
      grant.organizationId === access.organizationId &&
      grant.scopeType === 'location' &&
      Boolean(grant.scopeId)
  );
}

export function filterAccessibleLocations<T extends Pick<Location, 'id' | 'organizationId'>>(
  locations: readonly T[],
  access: LocationAccessContext
): T[] {
  return locations.filter(
    (row) =>
      row.organizationId === access.organizationId && canAccessLocation(access, row.id)
  );
}

export function pickSafeLocation<T extends Pick<Location, 'id' | 'code' | 'active'>>(
  accessible: readonly T[],
  preferredId?: string | null
): T | null {
  if (accessible.length === 0) return null;
  const preferred = preferredId
    ? accessible.find((row) => row.id === preferredId)
    : undefined;
  if (preferred) return preferred;
  const active = accessible.filter((row) => row.active);
  const pool = active.length > 0 ? active : accessible;
  return pool.find((row) => row.code === DEFAULT_LOCATION_CODE) ?? pool[0] ?? null;
}

/** location.timezone 이 없거나 쓸 수 없으면 기존 기본 timezone 정책. */
export function resolveLocationTimezone(timezone?: string | null): string {
  return resolveIanaTimezone(timezone);
}

/**
 * 지정 지점 → 본점(main) → 활성 지점 → 기본 timezone.
 * attendance 처럼 location_id 가 없는 도메인용.
 */
export function pickOrganizationTimezone(
  locations: readonly Pick<Location, 'id' | 'code' | 'active' | 'timezone'>[],
  locationId?: string | null
): string {
  if (locationId) {
    const match = locations.find((row) => row.id === locationId);
    if (match) return resolveLocationTimezone(match.timezone);
  }
  const active = locations.filter((row) => row.active);
  const pool = active.length > 0 ? active : locations;
  const main = pool.find((row) => row.code === DEFAULT_LOCATION_CODE) ?? pool[0];
  return resolveLocationTimezone(main?.timezone);
}

/** UTC instant 의 location business date. toISOString().slice(0,10) 과 혼동하지 않는다. */
export function locationBusinessDate(
  instant: Date | string,
  timezone?: string | null
): string {
  return businessDateInTimezone(instant, timezone);
}
