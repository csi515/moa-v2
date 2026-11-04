import assert from 'node:assert/strict';
import {
  readLoginReturnPath,
  resolvePostLoginPath,
  shouldEnterCustomerPortal,
} from './postLoginNavigation';

function params(query: string) {
  return new URLSearchParams(query);
}

assert.equal(readLoginReturnPath(params('returnUrl=%2Finvite%2Fstaff%2Fabc')), '/invite/staff/abc');
assert.equal(readLoginReturnPath(params('to=%2Fadmin%2Ftenants')), '/admin/tenants');
assert.equal(readLoginReturnPath(params('to=https://evil.example')), null);
assert.equal(readLoginReturnPath(params('to=//evil.example')), null);
assert.equal(readLoginReturnPath(params('')), null);

assert.equal(
  resolvePostLoginPath({
    returnPath: '/admin/tenants',
    loginTargetGroup: 'customer',
    redirectTo: '/',
  }),
  '/admin/tenants'
);
assert.equal(
  resolvePostLoginPath({
    returnPath: null,
    loginTargetGroup: 'customer',
    redirectTo: '/',
  }),
  '/customer/pass'
);
assert.equal(
  resolvePostLoginPath({
    returnPath: null,
    loginTargetGroup: 'workplace',
    redirectTo: '/',
  }),
  '/workspace'
);
assert.equal(
  resolvePostLoginPath({
    returnPath: null,
    loginTargetGroup: 'workplace',
    redirectTo: '/workspace/approvals',
  }),
  '/workspace/approvals'
);
assert.equal(shouldEnterCustomerPortal('/customer/pass', 'customer'), true);
assert.equal(shouldEnterCustomerPortal('/workspace', 'customer'), false);
assert.equal(shouldEnterCustomerPortal('/customer/pass', 'workplace'), false);

console.log('postLoginNavigation.test.ts: ok');
