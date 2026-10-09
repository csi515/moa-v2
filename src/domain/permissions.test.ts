import assert from 'node:assert/strict';
import { evaluateCustomPermission } from './permissions';

console.log('[TEST] evaluateCustomPermission pure domain logic running...');

// 1. Global wildcard '*' grants all actions
{
  assert.equal(evaluateCustomPermission(['*'], 'passes:view'), true);
  assert.equal(evaluateCustomPermission(['*'], 'attendance:checkin'), true);
  assert.equal(evaluateCustomPermission(['*'], 'settlement:manage'), true);
}

// 2. Domain wildcard 'domain:*' grants all actions within the domain
{
  const perms = ['passes:*', 'attendance:view'];

  // Passes domain actions - all true
  assert.equal(evaluateCustomPermission(perms, 'passes:view'), true);
  assert.equal(evaluateCustomPermission(perms, 'passes:deduct'), true);
  assert.equal(evaluateCustomPermission(perms, 'passes:create'), true);
  assert.equal(evaluateCustomPermission(perms, 'passes:delete'), true);

  // Cross-domain checks
  assert.equal(evaluateCustomPermission(perms, 'attendance:view'), true);
  assert.equal(evaluateCustomPermission(perms, 'attendance:checkin'), false); // not in perms
  assert.equal(evaluateCustomPermission(perms, 'lockers:view'), false); // other domain
}

// 3. Exact action match
{
  const perms = ['passes:view', 'lockers:assign'];

  assert.equal(evaluateCustomPermission(perms, 'passes:view'), true);
  assert.equal(evaluateCustomPermission(perms, 'lockers:assign'), true);

  // Mismatched actions in same domain blocked
  assert.equal(evaluateCustomPermission(perms, 'passes:deduct'), false);
  assert.equal(evaluateCustomPermission(perms, 'lockers:view'), false);
}

// 4. Empty permissions or null/undefined blocked (fail-closed)
{
  assert.equal(evaluateCustomPermission([], 'passes:view'), false);
  assert.equal(evaluateCustomPermission(null, 'passes:view'), false);
  assert.equal(evaluateCustomPermission(undefined, 'passes:view'), false);
  assert.equal(evaluateCustomPermission([''], 'passes:view'), false);
}

// 5. Backward compatibility: owner and admin unconditionally pass
{
  assert.equal(evaluateCustomPermission([], 'passes:deduct', 'owner'), true);
  assert.equal(evaluateCustomPermission(null, 'settlement:view', 'admin'), true);
  assert.equal(evaluateCustomPermission([], 'passes:deduct', 'staff'), false);
  assert.equal(evaluateCustomPermission([], 'passes:deduct', 'customer'), false);
}

// 6. Dot & colon format normalization interoperability
{
  assert.equal(evaluateCustomPermission(['passes.view'], 'passes:view'), true);
  assert.equal(evaluateCustomPermission(['passes:view'], 'passes.view'), true);
  assert.equal(evaluateCustomPermission(['attendance.*'], 'attendance:checkin'), true);
}

console.log('[TEST] evaluateCustomPermission ALL PASSED!');
