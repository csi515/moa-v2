/**
 * Request Context 생성 경계.
 * user / organization / location / role / scope 를 한 곳에서만 조립한다.
 */
import { resolveAuthScope } from '@/core/authorization/scopes';
import { canAccessLocation } from '@/core/locations/locationAware';
import { locationBelongsToOrganization } from '@/core/locations/locationAwareRules';
import {
  RequestContextError,
  type RequestContext,
  type RequestContextSource,
} from './types';

function requiredId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * catalog + 접근 범위로 검증된 실행 location.
 * localStorage 값만으로는 채택하지 않는다.
 */
export function resolveTrustedLocationId(source: RequestContextSource): string | null {
  const organizationId = requiredId(source.organizationId);
  const locationId = requiredId(source.locationId);
  if (!organizationId || !locationId) return null;

  const catalog = source.locations;
  if (!catalog || catalog.length === 0) return null;
  if (!locationBelongsToOrganization(catalog, organizationId, locationId)) {
    return null;
  }

  if (
    !canAccessLocation(
      {
        organizationId,
        role: source.role,
        extraGrants: source.extraGrants,
      },
      locationId
    )
  ) {
    return null;
  }

  return locationId;
}

/** organizationId와 locationId가 서로 다른 조직을 가리키면 실패한다. */
export function assertOrganizationLocationPair(source: RequestContextSource): string | null {
  const organizationId = requiredId(source.organizationId);
  const locationId = requiredId(source.locationId);
  if (!locationId) return null;
  if (!organizationId) {
    throw new RequestContextError('missing_organization', '조직이 없습니다.');
  }

  const catalog = source.locations;
  if (!catalog || catalog.length === 0) {
    throw new RequestContextError(
      'org_location_mismatch',
      'locationId를 조직 catalog 없이 실행 context로 쓸 수 없습니다.'
    );
  }
  if (!locationBelongsToOrganization(catalog, organizationId, locationId)) {
    throw new RequestContextError(
      'org_location_mismatch',
      'location이 현재 조직에 속하지 않습니다.'
    );
  }
  if (
    !canAccessLocation(
      { organizationId, role: source.role, extraGrants: source.extraGrants },
      locationId
    )
  ) {
    throw new RequestContextError('location_not_accessible', '해당 지점에 접근할 수 없습니다.');
  }
  return locationId;
}

/** 공통 생성 경계. 잘못된 org/location 조합은 location을 비운다. */
export function createRequestContext(source: RequestContextSource): RequestContext {
  const userId = requiredId(source.userId);
  const organizationId = requiredId(source.organizationId);
  if (!userId) {
    throw new RequestContextError('missing_user', '사용자 정보가 없습니다.');
  }
  if (!organizationId) {
    throw new RequestContextError('missing_organization', '조직이 없습니다.');
  }

  const locationId = resolveTrustedLocationId(source);
  const scope = resolveAuthScope({
    organizationId,
    type: source.scopeType ?? (locationId ? 'location' : 'organization'),
    locationId,
    customerId: source.customerId,
    resourceId: source.resourceId,
    scopeId: source.scopeId,
  });

  return {
    userId,
    organizationId,
    role: source.role ?? null,
    locationId,
    staffId: requiredId(source.staffId),
    scope,
    extraGrants: source.extraGrants ?? [],
  };
}
