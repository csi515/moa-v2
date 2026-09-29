/**
 * entity별 organization / location 분류.
 * 분류는 설계 계약이다. hasLocationColumn=false 인 기존 테이블은 스키마를 바꾸지 않는다.
 */
import {
  LEGACY_LOCATION_SCOPE_POLICY,
  LOCATION_SCOPE_POLICY,
  ORGANIZATION_SCOPE_POLICY,
  type DomainScopeKind,
  type LocationAwarePolicy,
} from './locationAware';

export type LocationAwareEntity = {
  key: string;
  kind: DomainScopeKind;
  /** 실제 location_id 컬럼 여부. 기존 Core는 전부 false */
  hasLocationColumn: boolean;
  tables: readonly string[];
};

export const ORGANIZATION_SCOPED_ENTITY_KEYS = [
  'customers',
  'products',
  'service_catalog',
  'staff',
  'price_catalog',
] as const;

export const LOCATION_SCOPED_ENTITY_KEYS = [
  'visits',
  'bookings',
  'rooms',
  'resources',
  'sales',
  'inventory',
  'schedules',
  'operational_tasks',
] as const;

export type OrganizationScopedEntityKey = (typeof ORGANIZATION_SCOPED_ENTITY_KEYS)[number];
export type LocationScopedEntityKey = (typeof LOCATION_SCOPED_ENTITY_KEYS)[number];
export type LocationAwareEntityKey = OrganizationScopedEntityKey | LocationScopedEntityKey;

function orgEntity(
  key: OrganizationScopedEntityKey,
  tables: readonly string[]
): LocationAwareEntity {
  return { key, kind: 'organization', hasLocationColumn: false, tables };
}

function locEntity(
  key: LocationScopedEntityKey,
  tables: readonly string[]
): LocationAwareEntity {
  return { key, kind: 'location', hasLocationColumn: false, tables };
}

/** 개념 분류. tables는 현재 스키마 참고용이며 ALTER 대상이 아니다. */
export const LOCATION_AWARE_ENTITIES: readonly LocationAwareEntity[] = [
  orgEntity('customers', ['customers']),
  orgEntity('products', ['products']),
  orgEntity('service_catalog', ['offered_services']),
  orgEntity('staff', ['staff']),
  orgEntity('price_catalog', ['products']),
  locEntity('visits', ['visits']),
  locEntity('bookings', ['reservations', 'resource_reservations']),
  locEntity('rooms', ['practice_rooms']),
  locEntity('resources', ['bookable_resources']),
  locEntity('sales', ['sales']),
  locEntity('inventory', ['inventory']),
  locEntity('schedules', ['schedules']),
  locEntity('operational_tasks', ['ops_tasks']),
];

const ENTITY_BY_KEY = new Map(LOCATION_AWARE_ENTITIES.map((row) => [row.key, row]));

export function getLocationAwareEntity(key: string): LocationAwareEntity | null {
  return ENTITY_BY_KEY.get(key) ?? null;
}

export function domainScopeKind(key: string): DomainScopeKind | null {
  return getLocationAwareEntity(key)?.kind ?? null;
}

export function policyForEntity(entity: LocationAwareEntity): LocationAwarePolicy {
  if (entity.kind === 'organization') return ORGANIZATION_SCOPE_POLICY;
  if (entity.hasLocationColumn) return LOCATION_SCOPE_POLICY;
  return LEGACY_LOCATION_SCOPE_POLICY;
}

export function isOrganizationScopedEntity(key: string): boolean {
  return domainScopeKind(key) === 'organization';
}

export function isLocationScopedEntity(key: string): boolean {
  return domainScopeKind(key) === 'location';
}
