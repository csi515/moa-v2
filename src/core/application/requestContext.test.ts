/**
 * Request Context 생성 경계.
 * 실행: npm run test:request-context
 */
import assert from 'node:assert/strict';
import {
  assertOrganizationLocationPair,
  createRequestContext,
  resolveTrustedLocationId,
} from './requestContext';
import { RequestContextError } from './types';

const locations = [
  { id: 'loc-a', organizationId: 'org-a' },
  { id: 'loc-b', organizationId: 'org-b' },
];

function run() {
  const ctx = createRequestContext({
    userId: 'user-1',
    organizationId: 'org-a',
    role: 'admin',
    locationId: 'loc-a',
    staffId: 'staff-1',
    locations,
  });
  assert.equal(ctx.userId, 'user-1');
  assert.equal(ctx.organizationId, 'org-a');
  assert.equal(ctx.locationId, 'loc-a');
  assert.equal(ctx.staffId, 'staff-1');
  assert.equal(ctx.role, 'admin');
  assert.equal(ctx.scope.type, 'location');
  assert.equal(ctx.scope.locationId, 'loc-a');

  const orgOnly = createRequestContext({
    userId: 'user-1',
    organizationId: 'org-a',
    role: 'admin',
    locationId: 'loc-a',
  });
  assert.equal(orgOnly.locationId, null);
  assert.equal(orgOnly.scope.type, 'organization');

  const mismatched = createRequestContext({
    userId: 'user-1',
    organizationId: 'org-a',
    role: 'admin',
    locationId: 'loc-b',
    locations,
  });
  assert.equal(mismatched.locationId, null);
  assert.equal(resolveTrustedLocationId({
    organizationId: 'org-a',
    locationId: 'loc-b',
    role: 'admin',
    locations,
  }), null);

  assert.throws(
    () =>
      assertOrganizationLocationPair({
        organizationId: 'org-a',
        locationId: 'loc-b',
        role: 'admin',
        locations,
      }),
    (err: unknown) => err instanceof RequestContextError && err.code === 'org_location_mismatch'
  );

  assert.throws(
    () => createRequestContext({ organizationId: 'org-a', role: 'admin' }),
    (err: unknown) => err instanceof RequestContextError && err.code === 'missing_user'
  );

  console.log('requestContext.test.ts: ok');
}

run();
