import assert from 'node:assert/strict';
import {
  buildDepartmentPath,
  depthFromPath,
  planOwnershipTransfer,
  rewriteSubtreePath,
  scopeAllowsResource,
  shouldAskDepartmentSetup,
  filterRowsByDepartmentScope,
  filterRowsByMemberDepartmentScope,
} from './departmentScope';

const root = buildDepartmentPath(null, 'hq');
const line = buildDepartmentPath(root, 'line');
assert.equal(root, '/hq/');
assert.equal(line, '/hq/line/');
assert.equal(depthFromPath(line), 2);

const moved = rewriteSubtreePath('/hq/', '/plant/', '/hq/line/');
assert.equal(moved, '/plant/line/');

assert.equal(
  scopeAllowsResource({
    scopeType: 'GLOBAL',
    memberDepartmentId: 'a',
    memberPath: '/a/',
    resourceDepartmentId: 'b',
    resourcePath: '/b/',
  }),
  true,
);
assert.equal(
  scopeAllowsResource({
    scopeType: 'DESCENDANTS',
    memberDepartmentId: 'hq',
    memberPath: '/hq/',
    resourceDepartmentId: 'line',
    resourcePath: '/hq/line/',
  }),
  true,
);
assert.equal(
  scopeAllowsResource({
    scopeType: 'SELF_ONLY',
    memberDepartmentId: 'hq',
    memberPath: '/hq/',
    resourceDepartmentId: 'line',
    resourcePath: '/hq/line/',
  }),
  false,
);
assert.equal(
  scopeAllowsResource({
    scopeType: 'SELF_ONLY',
    memberDepartmentId: null,
    memberPath: null,
    resourceDepartmentId: null,
    resourcePath: null,
  }),
  true,
);

const plan = planOwnershipTransfer(true, false);
assert.equal(plan.auditAction, 'OWNERSHIP_TRANSFERRED');
assert.equal(plan.previousOwnerRole, 'member');
assert.throws(() => planOwnershipTransfer(false, false), /42501/);

assert.equal(shouldAskDepartmentSetup('piano', 'education'), false);
assert.equal(shouldAskDepartmentSetup('manufacturing_light', 'manufacturing'), true);
assert.equal(shouldAskDepartmentSetup('general_enterprise', 'other'), true);

const scoped = filterRowsByDepartmentScope(
  [
    { id: '1', department_id: null },
    { id: '2', department_id: 'hq' },
    { id: '3', department_id: 'line' },
  ],
  true,
  'hq',
);
assert.deepEqual(scoped.map((row) => row.id), ['1', '2']);

const pathMap = new Map<string, string>([['hq', '/hq/'], ['line', '/hq/line/']]);
const descendantFiltered = filterRowsByMemberDepartmentScope(
  [
    { id: 'shared', department_id: null },
    { id: 'hq-only', department_id: 'hq' },
    { id: 'line-only', department_id: 'line' },
    { id: 'other', department_id: 'other' },
  ],
  {
    scopeType: 'DESCENDANTS',
    memberDepartmentId: 'hq',
    memberPath: '/hq/',
    departmentPathById: pathMap,
  },
);
assert.deepEqual(
  descendantFiltered.map((row) => row.id).sort(),
  ['hq-only', 'line-only', 'shared'].sort(),
);

assert.equal(shouldAskDepartmentSetup('manufacturing_light', 'manufacturing'), true);

console.log('departmentScope.invariant.test.ts: ok');
