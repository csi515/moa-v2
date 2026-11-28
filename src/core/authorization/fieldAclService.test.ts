import assert from 'node:assert/strict';
import { canViewSensitiveColumn, maskPhoneLocal } from './fieldAclService';
import { organizationScope } from './scopes';

assert.equal(maskPhoneLocal(null), '****');
assert.equal(maskPhoneLocal('12'), '****');
assert.equal(maskPhoneLocal('01012345678'), '*******5678');

const org = organizationScope('org-1');
assert.equal(
  canViewSensitiveColumn('owner', org, 'customers.write'),
  true
);
assert.equal(
  canViewSensitiveColumn('staff', org, 'finance.read'),
  false
);
assert.equal(
  canViewSensitiveColumn('staff', org, 'customers.write'),
  true
);

console.log('fieldAclService.test.ts: ok');
