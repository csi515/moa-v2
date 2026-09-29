/**
 * Organization 하위 Location Capability.
 * 기존 organization_id 테넌트 경계를 대체하지 않는다.
 */
import {
  LOCATION_SCOPE_POLICY,
  NEW_LOCATION_SCOPED_TABLE_RULES,
  ORGANIZATION_SCOPE_POLICY,
  toLocationAware,
} from './locationAware';
import {
  domainScopeKind,
  getLocationAwareEntity,
  LOCATION_AWARE_ENTITIES,
} from './locationAwareRegistry';
import {
  assertLocationInOrganization,
  locationAwareVisible,
  locationBelongsToOrganization,
  resolveWriteLocationId,
} from './locationAwareRules';
import {
  isLocationInOrganization,
  locationHoursRef,
  normalizeLocationCode,
  organizationLocationScope,
  optionalLocationId,
  resolveLocationSelection,
} from './locationHelpers';
import { locationService } from './locationService';
import { DEFAULT_LOCATION_CODE, DEFAULT_LOCATION_SLUG, DEFAULT_LOCATION_TIMEZONE } from './types';

export const locationCapability = {
  defaultCode: DEFAULT_LOCATION_CODE,
  defaultSlug: DEFAULT_LOCATION_SLUG,
  defaultTimezone: DEFAULT_LOCATION_TIMEZONE,
  list: locationService.list,
  getById: locationService.getById,
  upsert: locationService.upsert,
  setActive: locationService.setActive,
  ensureDefault: locationService.ensureDefault,
  scope: organizationLocationScope,
  optionalLocationId,
  isInOrganization: isLocationInOrganization,
  resolveSelection: resolveLocationSelection,
  hoursRef: locationHoursRef,
  normalizeCode: normalizeLocationCode,
  toLocationAware,
  entities: LOCATION_AWARE_ENTITIES,
  domainScopeKind,
  getEntity: getLocationAwareEntity,
  organizationPolicy: ORGANIZATION_SCOPE_POLICY,
  locationPolicy: LOCATION_SCOPE_POLICY,
  newTableRules: NEW_LOCATION_SCOPED_TABLE_RULES,
  belongsToOrganization: locationBelongsToOrganization,
  assertLocation: assertLocationInOrganization,
  visible: locationAwareVisible,
  resolveWriteLocationId,
} as const;

export type LocationCapability = typeof locationCapability;
