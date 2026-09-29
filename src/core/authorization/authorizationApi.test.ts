/** UI authorization adapter must preserve authorizationService semantics. */
import assert from 'node:assert/strict';
import { createAuthorizationApi } from './authorizationApi';
import { evaluatePermission } from './authorizationService';
import { locationScope, organizationScope } from './scopes';

const ORG = 'org-a';
const LOCATION = 'loc-a';

{
  const api = createAuthorizationApi({ organizationId: ORG, role: 'staff', locationId: LOCATION });

  assert.equal(
    api.can({ permission: 'customers.read' }),
    evaluatePermission({ role: 'staff', permission: 'customers.read', scope: organizationScope(ORG) })
  );
  assert.equal(api.can({ permission: 'staff.manage' }), false);
  assert.equal(api.can({ permission: 'rooms.read', scopeType: 'location' }), true);
  assert.equal(
    api.can({ permission: 'rooms.read', scopeType: 'location', scopeId: 'loc-b' }),
    evaluatePermission({ role: 'staff', permission: 'rooms.read', scope: locationScope(ORG, 'loc-b') })
  );
}

{
  const extraGrants = [
    {
      organizationId: ORG,
      permission: 'finance.read',
      scopeType: 'organization' as const,
      active: true,
    },
  ];
  const api = createAuthorizationApi({ organizationId: ORG, role: 'staff', extraGrants });
  assert.equal(api.can({ permission: 'finance.read' }), true);
  assert.equal(
    api.can({ permission: 'finance.read' }),
    evaluatePermission({
      role: 'staff',
      permission: 'finance.read',
      scope: organizationScope(ORG),
      extraGrants,
    })
  );
  assert.equal(api.can({ permission: 'not.a.permission' }), false);
}

{
  const extraGrants = [
    { organizationId: ORG, permission: 'locations.read', scopeType: 'location' as const, scopeId: LOCATION, active: true },
    { organizationId: ORG, permission: 'rooms.read', scopeType: 'location' as const, scopeId: LOCATION, active: true },
  ];
  const api = createAuthorizationApi({ organizationId: ORG, role: 'unknown', extraGrants });
  assert.equal(api.can({ permission: 'rooms.read', scopeType: 'location', scopeId: LOCATION }), true);
  assert.equal(api.can({ permission: 'rooms.read', scopeType: 'location', scopeId: 'loc-b' }), false);
}

{
  const api = createAuthorizationApi({ organizationId: ORG, role: 'owner', locationId: LOCATION });
  assert.equal(api.canAccessLocation(LOCATION), true);
  assert.equal(
    api.can({ permission: 'locations.read', scopeType: 'location', scopeId: LOCATION }),
    evaluatePermission({ role: 'owner', permission: 'locations.read', scope: locationScope(ORG, LOCATION) })
  );
}

console.log('authorizationApi.test.ts: ok');
