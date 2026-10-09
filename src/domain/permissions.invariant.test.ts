import assert from 'node:assert/strict';
import {
  canAuthorize,
  compatibilityRoleContractsHold,
  compatIsOrgAdmin,
  compatIsOrgStaffActor,
  evaluatePermission,
  organizationScope,
} from '@/core/authorization';
import {
  isOrgAdmin,
  isStaffRole,
  resolveRoleAccessKind,
} from '@/core/auth/permissionsRole';
import { evaluateCustomPermission } from './permissions';

console.log('[TEST] permissions.invariant.test running...');

// ── 1. Unknown role -> admin 없음 ─────────────────────────────────────
{
  assert.equal(isOrgAdmin('unknown'), false);
  assert.equal(isStaffRole('unknown'), false);
  assert.equal(resolveRoleAccessKind('unknown'), 'none');
  assert.equal(resolveRoleAccessKind('superadmin'), 'none');
  assert.equal(evaluateCustomPermission([], 'any:action', 'unknown'), false);
}

// ── 2. Customer -> staff/admin 기능 등급 불가 ─────────────────────────
{
  assert.equal(isOrgAdmin('customer'), false);
  assert.equal(isStaffRole('customer'), false);
  assert.equal(resolveRoleAccessKind('customer'), 'none');
  assert.equal(evaluateCustomPermission([], 'passes:deduct', 'customer'), false);
}

// ── 3. Member / null -> admin 폴백 금지 ───────────────────────────────
{
  assert.equal(resolveRoleAccessKind('member'), 'none');
  assert.equal(resolveRoleAccessKind(null), 'none');
  assert.equal(resolveRoleAccessKind(undefined), 'none');
  assert.equal(isOrgAdmin(null), false);
  assert.equal(evaluateCustomPermission(null, 'passes:view', null), false);
}

// ── 4. Parent는 admin/staff 아님 ─────────────────────────────────────
{
  assert.equal(resolveRoleAccessKind('parent'), 'parent');
  assert.equal(isOrgAdmin('parent'), false);
  assert.equal(isStaffRole('parent'), false);
  assert.equal(evaluateCustomPermission([], 'staff:manage', 'parent'), false);
}

// ── 5. Owner / Staff 등급 ───────────────────────────────────────────
{
  assert.equal(resolveRoleAccessKind('owner'), 'admin');
  assert.equal(resolveRoleAccessKind('admin'), 'admin');
  assert.equal(resolveRoleAccessKind('manager'), 'admin');
  assert.equal(resolveRoleAccessKind('staff'), 'staff');
  assert.equal(resolveRoleAccessKind('instructor'), 'staff');
  assert.equal(isOrgAdmin('owner'), true);
  assert.equal(isOrgAdmin('staff'), false);
}

// ── 6. 호환 레이어 계약 ──────────────────────────────────────────────
{
  assert.equal(compatibilityRoleContractsHold(), true);
  assert.equal(compatIsOrgAdmin('owner'), isOrgAdmin('owner'));
  assert.equal(compatIsOrgAdmin('admin'), true);
  assert.equal(compatIsOrgAdmin('manager'), true);
  assert.equal(compatIsOrgAdmin('staff'), false);
  assert.equal(compatIsOrgAdmin('instructor'), false);
  assert.equal(compatIsOrgStaffActor('owner'), true);
  assert.equal(compatIsOrgStaffActor('staff'), true);
  assert.equal(compatIsOrgStaffActor('instructor'), true);
  assert.equal(compatIsOrgStaffActor('parent'), false);
  assert.equal(compatIsOrgStaffActor('customer'), false);
  assert.equal(compatIsOrgStaffActor('unknown'), false);
}

// ── 7. Permission+Scope fail-closed ──────────────────────────────────
{
  const org = organizationScope('org-a');
  assert.equal(evaluatePermission({ role: 'unknown', permission: 'customers.read', scope: org }), false);
  assert.equal(evaluatePermission({ role: 'customer', permission: 'sales.create', scope: org }), false);
  assert.equal(evaluatePermission({ role: 'member', permission: 'staff.manage', scope: org }), false);
  assert.equal(evaluatePermission({ role: 'owner', permission: 'not.a.permission', scope: org }), false);
  assert.equal(canAuthorize('owner', 'customers.read', org), true);
  assert.equal(canAuthorize('staff', 'customers.read', org), true);
  assert.equal(canAuthorize('staff', 'staff.manage', org), false);
  assert.equal(canAuthorize('parent', 'reports.read', org), false);
}

console.log('src/domain/permissions.invariant.test.ts: ok');
