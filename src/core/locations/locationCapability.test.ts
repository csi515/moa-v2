/**
 * Location foundation. 실행: npm run test:location
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isLocationInOrganization,
  locationCodeTaken,
  locationHoursRef,
  normalizeLocationCode,
  organizationLocationScope,
  optionalLocationId,
  resolveLocationSelection,
} from './locationHelpers';
import { mapLocationRpcError } from './locationErrors';
import { rowToLocation, type LocationRow } from './locationMappers';
import type { Location } from './types';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');

function location(partial: Partial<Location> & Pick<Location, 'id' | 'organizationId' | 'code'>): Location {
  return {
    name: partial.name ?? partial.code,
    slug: partial.slug ?? partial.code,
    timezone: 'Asia/Seoul',
    active: true,
    metadata: {},
    createdAt: '2026-09-24T01:00:00.000Z',
    updatedAt: '2026-09-24T01:00:00.000Z',
    ...partial,
  };
}

function run() {
  assert.equal(normalizeLocationCode(' HQ '), 'hq');
  assert.equal(normalizeLocationCode(''), 'main');
  assert.equal(locationCodeTaken([location({ id: 'l1', organizationId: 'o1', code: 'main' })], 'MAIN'), true);
  assert.equal(locationCodeTaken([location({ id: 'l1', organizationId: 'o1', code: 'main' })], 'main', 'l1'), false);

  const orgA = [
    location({ id: 'a1', organizationId: 'org-a', code: 'main', name: '본점' }),
    location({ id: 'a2', organizationId: 'org-a', code: 'east', name: '동부' }),
  ];
  const orgB = [location({ id: 'b1', organizationId: 'org-b', code: 'main', name: '다른사업자' })];

  assert.equal(resolveLocationSelection(orgA, 'org-a', 'a2')?.id, 'a2');
  assert.equal(resolveLocationSelection(orgA, 'org-a', null), null);
  assert.equal(resolveLocationSelection(orgA, 'org-a', 'b1'), null);
  assert.equal(resolveLocationSelection(orgB, 'org-a', 'b1'), null);
  assert.equal(isLocationInOrganization(orgB[0], 'org-a'), false);
  assert.equal(isLocationInOrganization(orgA[0], 'org-a'), true);

  const scope = organizationLocationScope('org-a', 'a1');
  assert.equal(scope.organizationId, 'org-a');
  assert.equal(optionalLocationId(scope), 'a1');
  assert.equal(optionalLocationId(organizationLocationScope('org-a')), null);

  const hours = locationHoursRef('a1');
  assert.equal(hours.targetType, 'location');
  assert.equal(hours.source, 'availability');

  const inactive = { ...orgA[1], active: false };
  assert.equal(inactive.active, false);

  const mapped = rowToLocation({
    id: 'loc-1',
    organization_id: 'org-1',
    name: '본점',
    code: 'main',
    slug: 'main',
    address: '서울',
    phone: '02-0000-0000',
    timezone: 'Asia/Seoul',
    is_active: true,
    metadata: { default: true },
    created_at: '2026-09-24T01:00:00.000Z',
    updated_at: '2026-09-24T01:00:00.000Z',
  } satisfies LocationRow);
  assert.equal(mapped.organizationId, 'org-1');
  assert.equal(mapped.active, true);

  assert.equal(mapLocationRpcError({ message: 'Organization mismatch' }).code, 'org_mismatch');
  assert.equal(mapLocationRpcError({ message: 'Location code already exists' }).code, 'code');
  assert.equal(mapLocationRpcError({ message: 'Permission denied' }).code, 'permission');

  const sql = readFileSync(join(root, 'supabase/migrations/20260924270000_organization_locations.sql'), 'utf8');
  assert.match(sql, /CREATE TABLE core\.locations/);
  assert.match(sql, /REFERENCES core\.organizations\(id\) ON DELETE CASCADE/);
  assert.match(sql, /uq_locations_org_code/);
  assert.match(sql, /uq_locations_org_slug/);
  assert.match(sql, /UNIQUE \(organization_id, code\)/);
  assert.match(sql, /is_org_member/);
  assert.match(sql, /is_org_staff_actor/);
  assert.match(sql, /is_org_owner_or_admin/);
  assert.match(sql, /Organization mismatch/);
  assert.match(sql, /ensure_default_organization_location/);
  assert.match(sql, /organizations_default_location/);
  assert.match(sql, /AFTER INSERT ON core\.organizations/);
  assert.match(sql, /upsert_location/);
  assert.match(sql, /set_location_active/);
  assert.match(sql, /hours/);
  assert.match(sql, /availability/);
  assert.doesNotMatch(sql, /ALTER TABLE core\.(customers|staff|schedules|reservations|bookable_resources) .*location_id/);
  assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION core\.create_organization/);

  const repo = readFileSync(join(here, 'locationRepository.ts'), 'utf8');
  assert.match(repo, /eq\('organization_id', organizationId\)/);
  assert.match(repo, /from\('locations'\)/);

  const service = readFileSync(join(here, 'locationService.ts'), 'utf8');
  assert.match(service, /upsert_location/);
  assert.match(service, /ensure_default_organization_location/);
  assert.match(service, /resolveOrganizationTimezone/);
  assert.match(service, /userFacingErrorMessage/);
  assert.doesNotMatch(service, /if \(error\) return null/);
  assert.doesNotMatch(service, /create_sale/);

  const orgService = readFileSync(join(here, '../organizations/services/organizationService.ts'), 'utf8');
  assert.match(orgService, /ensureDefault/);
  assert.match(orgService, /OrganizationLocationSetupError/);
  assert.match(orgService, /create_organization/);
  assert.doesNotMatch(orgService, /트리거가 이미 만들었거나/);

  const provider = readFileSync(join(here, '../organizations/OrganizationProvider.tsx'), 'utf8');
  assert.match(provider, /useOrganizationLocationState/);
  assert.match(provider, /useOrganizationLocationState\(currentOrganization\?\.id \?\? null, currentRole\)/);
  assert.match(provider, /currentLocation/);
  assert.match(provider, /selectLocation/);
  assert.match(provider, /currentOrganization/);

  const aware = readFileSync(join(here, 'locationAware.ts'), 'utf8');
  assert.match(aware, /LOCATION_ACCESS_PERMISSION = 'locations\.read'/);
  assert.doesNotMatch(
    aware.slice(aware.indexOf('export function canAccessLocation'), aware.indexOf('export function hasLocationAssignment')),
    /customers\.read/
  );

  const hook = readFileSync(join(here, 'useOrganizationLocationState.ts'), 'utf8');
  assert.match(hook, /role: MemberRole \| null/);
  assert.match(hook, /catalogFailed/);
  assert.doesNotMatch(hook, /useApp/);
  assert.doesNotMatch(hook, /currentUser\.role/);

  const capability = readFileSync(join(here, 'locationCapability.ts'), 'utf8');
  assert.match(capability, /organizationLocationScope/);
  assert.doesNotMatch(capability, /from '@\/modules\//);

  console.log('locationCapability.test.ts: ok');
}

run();
