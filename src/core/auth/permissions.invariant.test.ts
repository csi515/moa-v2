/**
 * [권한] UX 권한 fail-closed 불변식
 * 실행: npm run test:permissions-invariant
 *
 * Invariant:
 *   - unknown role → admin 권한 없음
 *   - customer → staff/admin 등급 아님 (탭 none)
 *   - null/member → admin 폴백 금지
 *   - Role+Permission+Scope 가 기존 isOrgAdmin / staff actor 계약을 유지
 *
 * 순수 role 헬퍼만 검사 (plugin/supabase 로드 없음).
 * 탭 목록 조립은 getAllowedTabs → resolveRoleAccessKind('none')이면 [].
 * DB 권한: test:rls-* / test:multi-role-helpers / test:authorization
 */
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
} from './permissionsRole';

// ── unknown role → admin 없음 ─────────────────────────────────────
{
  assert.equal(isOrgAdmin('unknown'), false);
  assert.equal(isStaffRole('unknown'), false);
  assert.equal(resolveRoleAccessKind('unknown'), 'none');
  assert.equal(resolveRoleAccessKind('superadmin'), 'none');
}

// ── customer → staff/admin 기능 등급 불가 ─────────────────────────
{
  assert.equal(isOrgAdmin('customer'), false);
  assert.equal(isStaffRole('customer'), false);
  assert.equal(resolveRoleAccessKind('customer'), 'none');
}

// ── member / null → admin 폴백 금지 ───────────────────────────────
{
  assert.equal(resolveRoleAccessKind('member'), 'none');
  assert.equal(resolveRoleAccessKind(null), 'none');
  assert.equal(resolveRoleAccessKind(undefined), 'none');
  assert.equal(isOrgAdmin(null), false);
}

// ── parent는 admin/staff 아님 (포털 전용) ─────────────────────────
{
  assert.equal(resolveRoleAccessKind('parent'), 'parent');
  assert.equal(isOrgAdmin('parent'), false);
  assert.equal(isStaffRole('parent'), false);
}

// ── 대조: owner/staff 등급 ───────────────────────────────────────
{
  assert.equal(resolveRoleAccessKind('owner'), 'admin');
  assert.equal(resolveRoleAccessKind('admin'), 'admin');
  assert.equal(resolveRoleAccessKind('manager'), 'admin');
  assert.equal(resolveRoleAccessKind('staff'), 'staff');
  assert.equal(resolveRoleAccessKind('instructor'), 'staff');
  assert.equal(isOrgAdmin('owner'), true);
  assert.equal(isOrgAdmin('staff'), false);
}

// ── 호환 레이어: 기존 helper와 동일 ────────────────────────────────
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

// ── Permission+Scope: 기존 등급과 동일한 fail-closed ───────────────
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

console.log('permissions.invariant.test.ts: ok');
