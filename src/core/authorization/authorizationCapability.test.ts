/**
 * Role + Permission + Scope foundation.
 * 실행: npm run test:authorization
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canAuthorize,
  evaluatePermission,
} from './authorizationService';
import {
  compatibilityRoleContractsHold,
  compatIsOrgAdmin,
  compatIsOrgStaffActor,
} from './compatibility';
import {
  PERMISSION_DEFINITIONS,
  PERMISSION_KEYS,
  isKnownPermission,
} from './registry';
import {
  defaultPermissionsForRole,
  roleHasDefaultPermission,
  STAFF_DEFAULT_PERMISSIONS,
} from './roleDefaults';
import { locationScope, organizationScope } from './scopes';
import { isOrgAdmin, isStaffRole, resolveRoleAccessKind } from '@/core/auth/permissionsRole';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const ORG = 'org-a';
const LOC_A = 'loc-a';
const LOC_B = 'loc-b';

function run() {
  assert.equal(compatibilityRoleContractsHold(), true);
  assert.equal(compatIsOrgAdmin('owner'), isOrgAdmin('owner'));
  assert.equal(compatIsOrgAdmin('manager'), isOrgAdmin('manager'));
  assert.equal(compatIsOrgAdmin('staff'), isOrgAdmin('staff'));
  assert.equal(compatIsOrgStaffActor('staff'), true);
  assert.equal(compatIsOrgStaffActor('instructor'), true);
  assert.equal(compatIsOrgStaffActor('parent'), false);
  assert.equal(compatIsOrgStaffActor('customer'), false);
  assert.equal(isStaffRole('instructor'), true);

  const org = organizationScope(ORG);
  const locA = locationScope(ORG, LOC_A);
  const locB = locationScope(ORG, LOC_B);

  assert.equal(isKnownPermission('hack.all'), false);
  assert.equal(evaluatePermission({ role: 'owner', permission: 'hack.all', scope: org }), false);
  assert.equal(evaluatePermission({ role: 'customer', permission: 'customers.read', scope: org }), false);
  assert.equal(evaluatePermission({ role: 'member', permission: 'sales.read', scope: org }), false);
  assert.equal(evaluatePermission({ role: 'parent', permission: 'reports.read', scope: org }), false);
  assert.equal(evaluatePermission({ role: 'unknown', permission: 'staff.manage', scope: org }), false);
  assert.equal(evaluatePermission({ role: 'owner', permission: 'customers.read', scope: { type: 'organization', organizationId: '' } }), false);

  for (const permission of PERMISSION_KEYS) {
    assert.equal(evaluatePermission({ role: 'owner', permission, scope: org }), true);
    assert.equal(evaluatePermission({ role: 'admin', permission, scope: locA }), true);
    assert.equal(evaluatePermission({ role: 'manager', permission, scope: locB }), true);
  }

  assert.equal(isKnownPermission('locations.read'), true);
  assert.equal(roleHasDefaultPermission('staff', 'locations.read'), true);
  assert.equal(roleHasDefaultPermission('staff', 'customers.read'), true);
  assert.equal(roleHasDefaultPermission('staff', 'sales.refund'), true);
  assert.equal(roleHasDefaultPermission('staff', 'staff.manage'), false);
  assert.equal(roleHasDefaultPermission('staff', 'rooms.manage'), false);
  assert.equal(roleHasDefaultPermission('staff', 'finance.read'), false);
  assert.equal(
    evaluatePermission({
      role: 'member',
      permission: 'locations.read',
      scope: locA,
    }),
    false
  );
  assert.equal(
    evaluatePermission({
      role: 'staff',
      permission: 'locations.read',
      scope: locA,
    }),
    true
  );
  assert.equal(
    evaluatePermission({
      role: 'member',
      permission: 'locations.read',
      scope: locA,
      extraGrants: [
        {
          organizationId: ORG,
          permission: 'customers.read',
          scopeType: 'organization',
          active: true,
        },
      ],
    }),
    false
  );
  assert.equal(evaluatePermission({ role: 'staff', permission: 'customers.read', scope: org }), true);
  assert.equal(evaluatePermission({ role: 'owner', permission: 'locations.read', scope: locA }), true);
  assert.equal(evaluatePermission({ role: 'instructor', permission: 'customers.read', scope: org }), true);
  assert.equal(evaluatePermission({ role: 'staff', permission: 'staff.manage', scope: org }), false);
  assert.equal(evaluatePermission({ role: 'staff', permission: 'finance.read', scope: org }), false);
  assert.equal(canAuthorize('staff', 'rooms.read', locA), true);
  assert.equal(
    evaluatePermission({
      role: 'staff',
      permission: 'rooms.read',
      scope: locB,
      assignedLocationIds: [LOC_A],
    }),
    false
  );
  assert.equal(
    evaluatePermission({
      role: 'staff',
      permission: 'rooms.read',
      scope: locA,
      assignedLocationIds: [LOC_A],
    }),
    true
  );
  assert.equal(
    evaluatePermission({
      role: 'owner',
      permission: 'rooms.manage',
      scope: locB,
      assignedLocationIds: [LOC_A],
    }),
    true
  );

  assert.equal(
    evaluatePermission({
      role: 'staff',
      permission: 'finance.read',
      scope: org,
      extraGrants: [
        {
          organizationId: ORG,
          permission: 'finance.read',
          scopeType: 'organization',
          active: true,
        },
      ],
    }),
    true
  );
  assert.equal(
    evaluatePermission({
      role: 'staff',
      permission: 'rooms.manage',
      scope: org,
      extraGrants: [
        {
          organizationId: 'org-b',
          permission: 'rooms.manage',
          scopeType: 'organization',
          active: true,
        },
      ],
    }),
    false
  );

  assert.deepEqual(defaultPermissionsForRole('customer'), []);
  assert.equal(defaultPermissionsForRole('admin').length, PERMISSION_KEYS.length);
  assert.equal(STAFF_DEFAULT_PERMISSIONS.includes('staff.manage'), false);

  const sql = [
    readFileSync(
      join(root, 'supabase/migrations/20260924280000_authorization_permission_scope.sql'),
      'utf8'
    ),
    readFileSync(
      join(root, 'supabase/migrations/20260924380000_locations_read_permission.sql'),
      'utf8'
    ),
  ].join('\n');
  assert.match(sql, /CREATE TABLE core\.permission_catalog/);
  assert.match(sql, /CREATE TABLE core\.authorization_grants/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.has_permission/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.is_known_permission/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.role_has_default_permission/);
  assert.match(sql, /is_org_admin\(p_organization_id\)/);
  assert.match(sql, /is_org_staff_actor\(p_organization_id\)/);
  assert.doesNotMatch(sql, /DROP FUNCTION core\.is_org_admin/);
  assert.doesNotMatch(sql, /DROP FUNCTION core\.is_org_staff_actor/);
  assert.doesNotMatch(sql, /DROP FUNCTION core\.rls_staff_or_admin/);
  assert.doesNotMatch(sql, /DROP POLICY IF EXISTS/);
  for (const row of PERMISSION_DEFINITIONS) {
    assert.match(sql, new RegExp(`'${row.key}'`));
  }
  for (const permission of STAFF_DEFAULT_PERMISSIONS) {
    assert.match(sql, new RegExp(`'${permission}'`));
  }

  const helpers = readFileSync(
    join(root, 'supabase/migrations/20260921170000_multi_role_permission_helpers.sql'),
    'utf8'
  );
  assert.match(helpers, /CREATE OR REPLACE FUNCTION core\.is_org_admin/);
  assert.match(helpers, /ARRAY\['owner', 'admin', 'manager'\]/);

  const actor = readFileSync(
    join(root, 'supabase/migrations/20260922180000_retail_staff_sale_permissions.sql'),
    'utf8'
  );
  assert.match(actor, /CREATE OR REPLACE FUNCTION core\.is_org_staff_actor/);

  assert.equal(resolveRoleAccessKind('owner'), 'admin');
  assert.equal(resolveRoleAccessKind('staff'), 'staff');
  assert.equal(resolveRoleAccessKind('customer'), 'none');

  console.log('authorizationCapability.test.ts: ok');
}

run();
