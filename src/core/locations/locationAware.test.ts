/**
 * LocationAware 분류·호환 규칙.
 * 실행: npm run test:location-aware
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LOCATION_SCOPE_POLICY,
  NEW_LOCATION_SCOPED_TABLE_RULES,
  ORGANIZATION_SCOPE_POLICY,
  canAccessLocation,
  filterAccessibleLocations,
  locationBusinessDate,
  pickOrganizationTimezone,
  resolveLocationTimezone,
  toLocationAware,
} from './locationAware';
import type { LocationAccessContext } from './types';
import {
  domainScopeKind,
  LOCATION_AWARE_ENTITIES,
  LOCATION_SCOPED_ENTITY_KEYS,
  ORGANIZATION_SCOPED_ENTITY_KEYS,
  policyForEntity,
} from './locationAwareRegistry';
import {
  assertLocationInOrganization,
  locationAwareVisible,
  locationBelongsToOrganization,
  LocationAwareError,
  policyForExistingDomain,
  policyForNewDomain,
  resolveWriteLocationId,
} from './locationAwareRules';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');

function run() {
  assert.equal(domainScopeKind('customers'), 'organization');
  assert.equal(domainScopeKind('products'), 'organization');
  assert.equal(domainScopeKind('service_catalog'), 'organization');
  assert.equal(domainScopeKind('staff'), 'organization');
  assert.equal(domainScopeKind('price_catalog'), 'organization');
  assert.equal(domainScopeKind('visits'), 'location');
  assert.equal(domainScopeKind('bookings'), 'location');
  assert.equal(domainScopeKind('rooms'), 'location');
  assert.equal(domainScopeKind('resources'), 'location');
  assert.equal(domainScopeKind('sales'), 'location');
  assert.equal(domainScopeKind('inventory'), 'location');
  assert.equal(domainScopeKind('schedules'), 'location');
  assert.equal(domainScopeKind('operational_tasks'), 'location');
  assert.equal(domainScopeKind('unknown'), null);

  for (const entity of LOCATION_AWARE_ENTITIES) {
    assert.equal(entity.hasLocationColumn, false);
  }
  assert.equal(ORGANIZATION_SCOPED_ENTITY_KEYS.length, 5);
  assert.equal(LOCATION_SCOPED_ENTITY_KEYS.length, 8);

  const org = toLocationAware('org-a');
  assert.equal(org.organizationId, 'org-a');
  assert.equal(org.locationId, null);

  const sales = LOCATION_AWARE_ENTITIES.find((row) => row.key === 'sales');
  assert.ok(sales);
  assert.equal(policyForEntity(sales).requireLocationOnWrite, false);
  assert.equal(resolveWriteLocationId(sales, 'loc-a'), null);
  assert.equal(resolveWriteLocationId(ORGANIZATION_SCOPE_POLICY, 'loc-a'), null);
  assert.equal(resolveWriteLocationId(policyForNewDomain('location'), 'loc-a'), 'loc-a');
  assert.throws(
    () => resolveWriteLocationId(policyForNewDomain('location'), null),
    (err: unknown) => err instanceof LocationAwareError && err.code === 'location_required'
  );
  assert.equal(policyForExistingDomain('location').requireLocationOnWrite, false);

  const locations = [
    { id: 'loc-a', organizationId: 'org-a' },
    { id: 'loc-b', organizationId: 'org-b' },
  ];
  assert.equal(locationBelongsToOrganization(locations, 'org-a', 'loc-a'), true);
  assert.equal(locationBelongsToOrganization(locations, 'org-a', 'loc-b'), false);
  assert.equal(locationBelongsToOrganization(locations, 'org-a', null), false);
  assert.equal(assertLocationInOrganization(locations, 'org-a', null, false), null);
  assert.throws(
    () => assertLocationInOrganization(locations, 'org-a', null, true),
    (err: unknown) => err instanceof LocationAwareError && err.code === 'location_required'
  );
  assert.throws(
    () => assertLocationInOrganization(locations, 'org-a', 'loc-b', true),
    (err: unknown) => err instanceof LocationAwareError && err.code === 'org_mismatch'
  );

  const legacy = toLocationAware('org-a', null);
  const assigned = toLocationAware('org-a', 'loc-a');
  assert.equal(locationAwareVisible(legacy, null), true);
  assert.equal(locationAwareVisible(assigned, null), true);
  assert.equal(locationAwareVisible(legacy, 'loc-a'), true);
  assert.equal(locationAwareVisible(assigned, 'loc-a'), true);
  assert.equal(locationAwareVisible(assigned, 'loc-b'), false);
  assert.equal(locationAwareVisible(legacy, 'loc-a', { ...LOCATION_SCOPE_POLICY, includeUnassignedOnRead: false }), false);

  assert.equal(NEW_LOCATION_SCOPED_TABLE_RULES.locationNullable, false);
  assert.equal(NEW_LOCATION_SCOPED_TABLE_RULES.replaceOrganizationId, false);

  const sql = readFileSync(
    join(root, 'supabase/migrations/20260924290000_location_aware_domain_strategy.sql'),
    'utf8'
  );
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.location_belongs_to_organization/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.assert_location_in_organization/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.location_aware_visible/);
  assert.doesNotMatch(sql, /ALTER TABLE/);
  assert.doesNotMatch(sql, /ADD COLUMN\s+location_id/);
  assert.doesNotMatch(sql, /DROP POLICY/);
  assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION core\.(create_sale|create_organization|request_reservation)/);

  assert.equal(resolveLocationTimezone(null), 'Asia/Seoul');
  assert.equal(resolveLocationTimezone('  '), 'Asia/Seoul');
  assert.equal(resolveLocationTimezone('Not/AZone'), 'Asia/Seoul');
  assert.equal(resolveLocationTimezone('America/Los_Angeles'), 'America/Los_Angeles');

  const nearMidnight = '2026-09-23T15:30:00.000Z';
  assert.equal(new Date(nearMidnight).toISOString().slice(0, 10), '2026-09-23');
  assert.equal(locationBusinessDate(nearMidnight, 'Asia/Seoul'), '2026-09-24');
  assert.equal(locationBusinessDate(nearMidnight, 'America/Los_Angeles'), '2026-09-23');
  assert.notEqual(
    locationBusinessDate(nearMidnight, 'Asia/Seoul'),
    locationBusinessDate(nearMidnight, 'America/Los_Angeles')
  );

  const branches = [
    { id: 'la', code: 'main', active: true, timezone: 'America/Los_Angeles' },
    { id: 'se', code: 'east', active: true, timezone: 'Asia/Seoul' },
  ];
  assert.equal(pickOrganizationTimezone(branches, 'se'), 'Asia/Seoul');
  assert.equal(pickOrganizationTimezone(branches, null), 'America/Los_Angeles');
  assert.equal(pickOrganizationTimezone([], null), 'Asia/Seoul');

  for (const rel of [
    'supabase/migrations/20260822160000_attendance_module.sql',
    'supabase/migrations/20260826250000_attendance_notifications.sql',
    'supabase/migrations/20260924140000_attendance_key_notify_makeup.sql',
  ]) {
    const attendanceSql = readFileSync(join(root, rel), 'utf8');
    assert.doesNotMatch(attendanceSql, /AT TIME ZONE 'Asia\/Seoul'/);
    assert.match(attendanceSql, /core\.(location_business_date|resolve_location_timezone|timestamptz_from_business_local|business_time_text)/);
  }

  const catalogA = [
    { id: 'a1', organizationId: 'org-a' },
    { id: 'a2', organizationId: 'org-a' },
  ];
  const catalogB = [{ id: 'b1', organizationId: 'org-b' }];
  const staffAGrant = {
    organizationId: 'org-a',
    permission: 'locations.read',
    scopeType: 'location' as const,
    scopeId: 'a1',
    active: true,
  };
  const staffBGrant = {
    organizationId: 'org-b',
    permission: 'locations.read',
    scopeType: 'location' as const,
    scopeId: 'b1',
    active: true,
  };
  const customersOnlyGrant = {
    organizationId: 'org-a',
    permission: 'customers.read',
    scopeType: 'organization' as const,
    active: true,
  };

  const ownerA: LocationAccessContext = { organizationId: 'org-a', role: 'owner' };
  const staffA: LocationAccessContext = {
    organizationId: 'org-a',
    role: 'staff',
    extraGrants: [staffAGrant],
  };
  const staffB: LocationAccessContext = {
    organizationId: 'org-b',
    role: 'staff',
    extraGrants: [staffBGrant],
  };
  const undecided: LocationAccessContext = { organizationId: 'org-a', role: null };

  assert.deepEqual(
    filterAccessibleLocations(catalogA, ownerA).map((row) => row.id),
    ['a1', 'a2']
  );
  assert.deepEqual(
    filterAccessibleLocations(catalogA, staffA).map((row) => row.id),
    ['a1']
  );
  assert.deepEqual(
    filterAccessibleLocations([...catalogA, ...catalogB], staffB).map((row) => row.id),
    ['b1']
  );
  assert.deepEqual(filterAccessibleLocations(catalogA, staffB), []);
  assert.deepEqual(filterAccessibleLocations(catalogA, undecided), []);
  assert.equal(canAccessLocation(undecided, 'a1'), false);
  assert.equal(
    canAccessLocation(
      { organizationId: 'org-a', role: 'member', extraGrants: [customersOnlyGrant] },
      'a1'
    ),
    false
  );
  assert.equal(canAccessLocation(ownerA, 'a1'), true);
  assert.equal(canAccessLocation({ organizationId: 'org-a', role: 'staff' }, 'a2'), true);
  assert.deepEqual(
    filterAccessibleLocations(catalogA, { ...ownerA, role: 'staff', extraGrants: [staffAGrant] }).map(
      (row) => row.id
    ),
    ['a1']
  );

  const locSql = readFileSync(
    join(root, 'supabase/migrations/20260924270000_organization_locations.sql'),
    'utf8'
  );
  assert.doesNotMatch(
    locSql,
    /ALTER TABLE core\.(customers|staff|schedules|reservations|bookable_resources|sales|inventory) .*location_id/
  );

  console.log('locationAware.test.ts: ok');
}

run();
