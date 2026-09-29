/**
 * OrganizationProvider 선택/부트스트랩 순수 로직 unit test
 * 실행: npm run test:org-context-resolve
 */
import assert from 'node:assert/strict';
import type { Organization } from '../../lib/supabase';
import type { OrganizationMembership } from './services/organizationService';
import {
  deriveSelectionFields,
  planBootstrapApply,
  resolveActiveUserRole,
  resolveMembershipById,
  resolveMembershipByOrganizationId,
  resolveOrganizationBootstrap,
  computePortalAccessFlags,
} from './resolveOrganizationContext';

function org(id: string, name = id, industryType = 'piano'): Organization {
  return {
    id,
    name,
    industry_type: industryType,
    slug: null,
    settings: {},
    is_active: true,
    public_code: '',
    created_at: '',
    updated_at: '',
  } as Organization;
}

function mem(
  partial: Partial<OrganizationMembership> &
    Pick<OrganizationMembership, 'id' | 'organizationId' | 'role'>
): OrganizationMembership {
  return {
    staffId: null,
    parentCustomerId: null,
    organization: partial.organization ?? org(partial.organizationId),
    ...partial,
  };
}

// ── resolveMembershipById ─────────────────────────────────────────
{
  const list = [mem({ id: 'm1', organizationId: 'o1', role: 'admin' })];
  assert.deepEqual(resolveMembershipById(list, null).storage, { action: 'unchanged' });
  assert.equal(resolveMembershipById(list, null).membership, null);
  assert.equal(resolveMembershipById([], 'm1').membership, null);
  assert.equal(resolveMembershipById(list, 'm1').membership?.id, 'm1');
  assert.deepEqual(resolveMembershipById(list, 'm1').storage, {
    action: 'store',
    organizationId: 'o1',
  });
  assert.deepEqual(resolveMembershipById(list, 'missing').storage, { action: 'clear' });
}

// ── resolveMembershipByOrganizationId ─────────────────────────────
{
  const list = [mem({ id: 'm1', organizationId: 'o1', role: 'staff' })];
  assert.equal(resolveMembershipByOrganizationId(list, 'o1').membership?.id, 'm1');
  assert.deepEqual(resolveMembershipByOrganizationId(list, 'nope').storage, {
    action: 'clear',
  });
  assert.deepEqual(resolveMembershipByOrganizationId(list, null).storage, {
    action: 'unchanged',
  });
}

// ── deriveSelectionFields ─────────────────────────────────────────
{
  const m = mem({
    id: 'm1',
    organizationId: 'o1',
    role: 'owner',
    staffId: 'st1',
    parentCustomerId: 'pc1',
  });
  const d = deriveSelectionFields(m);
  assert.equal(d.currentOrganization?.id, 'o1');
  assert.equal(d.currentRole, 'owner');
  assert.equal(d.currentStaffId, 'st1');
  assert.equal(d.currentParentCustomerId, 'pc1');
  assert.equal(deriveSelectionFields(null).currentOrganization, null);
}

// ── bootstrap: parent portal mode ─────────────────────────────────
{
  const { decision } = resolveOrganizationBootstrap({
    memberships: [mem({ id: 'm1', organizationId: 'o1', role: 'admin' })],
    blockedOwnerOrgIds: [],
    portalChildren: 0,
    parentId: 'p1',
    parentPortalModeActive: true,
    storedOrganizationId: null,
  });
  assert.equal(decision.kind, 'enter_parent');
}

// ── bootstrap: customer-only (no staff) ───────────────────────────
{
  const { decision, flags } = resolveOrganizationBootstrap({
    memberships: [mem({ id: 'c1', organizationId: 'o1', role: 'customer' })],
    blockedOwnerOrgIds: [],
    portalChildren: 0,
    parentId: null,
    parentPortalModeActive: false,
    storedOrganizationId: null,
  });
  assert.equal(flags.isCustomerOnly, true);
  assert.equal(decision.kind, 'enter_customer');
  if (decision.kind === 'enter_customer') assert.equal(decision.membershipId, 'c1');
}

// ── bootstrap: single staff auto-select ───────────────────────────
{
  const { decision } = resolveOrganizationBootstrap({
    memberships: [mem({ id: 's1', organizationId: 'o1', role: 'admin' })],
    blockedOwnerOrgIds: [],
    portalChildren: 0,
    parentId: null,
    parentPortalModeActive: false,
    storedOrganizationId: null,
  });
  assert.equal(decision.kind, 'select_organization_or_clear');
  if (decision.kind === 'select_organization_or_clear') {
    assert.equal(decision.organizationId, 'o1');
  }
}

// ── bootstrap: multi staff → clear (need picker) ──────────────────
{
  const { decision } = resolveOrganizationBootstrap({
    memberships: [
      mem({ id: 's1', organizationId: 'o1', role: 'admin' }),
      mem({ id: 's2', organizationId: 'o2', role: 'staff' }),
    ],
    blockedOwnerOrgIds: [],
    portalChildren: 0,
    parentId: null,
    parentPortalModeActive: false,
    storedOrganizationId: null,
  });
  assert.equal(decision.kind, 'select_organization_or_clear');
  if (decision.kind === 'select_organization_or_clear') {
    assert.equal(decision.organizationId, null);
  }
}

// ── bootstrap: stored org preferred ───────────────────────────────
{
  const { decision } = resolveOrganizationBootstrap({
    memberships: [
      mem({ id: 's1', organizationId: 'o1', role: 'admin' }),
      mem({ id: 's2', organizationId: 'o2', role: 'staff' }),
    ],
    blockedOwnerOrgIds: [],
    portalChildren: 0,
    parentId: null,
    parentPortalModeActive: false,
    storedOrganizationId: 'o2',
  });
  assert.equal(decision.kind, 'select_organization_or_clear');
  if (decision.kind === 'select_organization_or_clear') {
    assert.equal(decision.organizationId, 'o2');
  }
}

// ── bootstrap: current context membership ─────────────────────────
{
  const { decision } = resolveOrganizationBootstrap({
    memberships: [
      mem({ id: 's1', organizationId: 'o1', role: 'admin' }),
      mem({ id: 's2', organizationId: 'o2', role: 'staff', isCurrentContext: true }),
    ],
    blockedOwnerOrgIds: [],
    portalChildren: 0,
    parentId: null,
    parentPortalModeActive: false,
    storedOrganizationId: 'o1',
  });
  assert.equal(decision.kind, 'select_membership');
  if (decision.kind === 'select_membership') assert.equal(decision.membershipId, 's2');
}

// ── bootstrap: empty membership ≠ parent ──────────────────────────
{
  const { decision, flags } = resolveOrganizationBootstrap({
    memberships: [],
    blockedOwnerOrgIds: [],
    portalChildren: 0,
    parentId: null,
    parentPortalModeActive: false,
    storedOrganizationId: null,
  });
  assert.equal(flags.isParentOnly, false);
  assert.equal(flags.canAccessParentPortal, false);
  assert.equal(decision.kind, 'select_organization_or_clear');
  if (decision.kind === 'select_organization_or_clear') {
    assert.equal(decision.organizationId, null);
  }
}

// ── bootstrap: blocked owner only ─────────────────────────────────
{
  const { decision } = resolveOrganizationBootstrap({
    memberships: [mem({ id: 'o1m', organizationId: 'o1', role: 'owner' })],
    blockedOwnerOrgIds: ['o1'],
    portalChildren: 0,
    parentId: null,
    parentPortalModeActive: false,
    storedOrganizationId: null,
  });
  assert.equal(decision.kind, 'select_organization');
  if (decision.kind === 'select_organization') {
    assert.equal(decision.organizationId, 'o1');
  }
}

// ── planBootstrapApply: portal mode ≠ selection ───────────────────
{
  const parentPlan = planBootstrapApply({ kind: 'enter_parent' });
  assert.equal(parentPlan.portalMode, 'parent');
  assert.equal(parentPlan.selection.by, 'membership');
  if (parentPlan.selection.by === 'membership') {
    assert.equal(parentPlan.selection.membershipId, null);
  }
  assert.equal(parentPlan.clearStoredOrganizationId, true);

  const staffPlan = planBootstrapApply({
    kind: 'select_membership',
    membershipId: 'm1',
  });
  assert.equal(staffPlan.portalMode, 'none');
}

// ── computePortalAccessFlags: children without parentId ───────────
{
  const flags = computePortalAccessFlags([], {
    blockedOwnerOrgIds: [],
    portalChildren: 2,
    parentId: null,
  });
  assert.equal(flags.hasParentAccess, true);
  assert.equal(flags.canAccessParentPortal, false); // parentId 필요
  assert.equal(flags.isParentOnly, true);
}

// ── resolveActiveUserRole: membership 없음 ≠ parent ───────────────
{
  assert.equal(
    resolveActiveUserRole({ loading: true, currentRole: null, portalMode: 'none' }),
    null
  );
  assert.equal(
    resolveActiveUserRole({ loading: false, currentRole: null, portalMode: 'none' }),
    'member'
  );
  assert.equal(
    resolveActiveUserRole({ loading: false, currentRole: null, portalMode: 'parent' }),
    'parent'
  );
  assert.equal(
    resolveActiveUserRole({ loading: false, currentRole: 'owner', portalMode: 'none' }),
    'owner'
  );
}

// ── bootstrap: 업종이 달라도 저장된 org id로 복원 (industry로 필터하지 않음) ──
{
  const piano = mem({
    id: 's1',
    organizationId: 'piano-org',
    role: 'owner',
    organization: org('piano-org', '피아노', 'piano'),
  });
  const academy = mem({
    id: 's2',
    organizationId: 'academy-org',
    role: 'admin',
    organization: org('academy-org', '영어학원', 'academy'),
  });
  const { decision } = resolveOrganizationBootstrap({
    memberships: [piano, academy],
    blockedOwnerOrgIds: [],
    portalChildren: 0,
    parentId: null,
    parentPortalModeActive: false,
    storedOrganizationId: 'academy-org',
  });
  assert.equal(decision.kind, 'select_organization_or_clear');
  if (decision.kind === 'select_organization_or_clear') {
    assert.equal(decision.organizationId, 'academy-org');
  }

  const byId = resolveMembershipByOrganizationId([piano, academy], 'academy-org');
  assert.equal(byId.membership?.organization.industry_type, 'academy');
  assert.equal(deriveSelectionFields(byId.membership).currentOrganization?.id, 'academy-org');
}

{
  const piano = mem({
    id: 's1',
    organizationId: 'piano-org',
    role: 'owner',
    organization: org('piano-org', '피아노', 'piano'),
  });
  const unknown = mem({
    id: 's2',
    organizationId: 'unknown-org',
    role: 'admin',
    organization: org('unknown-org', '신규학원', 'english_academy'),
  });
  const pickUnknown = resolveMembershipByOrganizationId([piano, unknown], 'unknown-org');
  assert.equal(pickUnknown.membership?.organization.industry_type, 'english_academy');
  const backToPiano = resolveMembershipByOrganizationId([piano, unknown], 'piano-org');
  assert.equal(backToPiano.membership?.organization.industry_type, 'piano');
}

console.log('resolveOrganizationContext.test.ts: ok');
