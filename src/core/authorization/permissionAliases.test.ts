import assert from 'node:assert/strict';
import {
  matrixKeySatisfiesCanonical,
  resolveCanonicalPermission,
  resolveCanonicalPermissionKey,
} from './permissionAliases';

assert.equal(resolveCanonicalPermissionKey('billing_invoices'), 'finance.read');
assert.equal(resolveCanonicalPermissionKey('billing:invoices:read'), 'finance.read');
assert.equal(resolveCanonicalPermissionKey('statistics'), 'reports.read');
assert.equal(resolveCanonicalPermissionKey('members_manage'), 'staff.manage');
assert.equal(resolveCanonicalPermissionKey('inventory.manage'), 'inventory.write');
assert.equal(resolveCanonicalPermissionKey('finance.read'), 'finance.read');
assert.equal(resolveCanonicalPermissionKey(null), null);

assert.equal(resolveCanonicalPermission('billing_invoices'), 'finance.read');
assert.equal(resolveCanonicalPermission('hack.all'), null);

assert.equal(
  matrixKeySatisfiesCanonical({ billing_invoices: true }, 'finance.read'),
  true
);
assert.equal(
  matrixKeySatisfiesCanonical({ finance: true }, 'finance.read'),
  true
);
assert.equal(
  matrixKeySatisfiesCanonical({ statistics: false }, 'reports.read'),
  false
);
assert.equal(
  matrixKeySatisfiesCanonical({ 'finance.read': true }, 'finance.read'),
  true
);

console.log('permissionAliases.test.ts: ok');
