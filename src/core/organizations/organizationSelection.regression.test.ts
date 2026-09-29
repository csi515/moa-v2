/**
 * 사업장 선택/복원/전환 회귀.
 * 실행: npm run test:org-selection
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Organization } from '../../lib/supabase';
import type { OrganizationMembership } from './services/organizationService';
import { resolveIndustryAppKind } from '../industry/industryAppResolve';
import {
  applyBootstrapToSession,
  assertSelectionInvariant,
  deriveSelectionFields,
  nextOrganizationLocalStateAction,
  resolveMembershipAfterRefresh,
  resolveMembershipByOrganizationId,
} from './resolveOrganizationContext';

function org(id: string, name: string, industryType: string): Organization {
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

function mem(partial: {
  id: string;
  organizationId: string;
  role: OrganizationMembership['role'];
  industry?: string;
  name?: string;
  isCurrentContext?: boolean;
}): OrganizationMembership {
  const industry = partial.industry ?? 'piano';
  return {
    id: partial.id,
    organizationId: partial.organizationId,
    role: partial.role,
    staffId: null,
    parentCustomerId: null,
    isCurrentContext: partial.isCurrentContext,
    organization: org(partial.organizationId, partial.name ?? partial.organizationId, industry),
  };
}

function login(input: {
  memberships: OrganizationMembership[];
  storedOrganizationId?: string | null;
  parentPortalModeActive?: boolean;
  portalChildren?: number;
  parentId?: string | null;
  blockedOwnerOrgIds?: string[];
}) {
  return applyBootstrapToSession({
    memberships: input.memberships,
    blockedOwnerOrgIds: input.blockedOwnerOrgIds ?? [],
    portalChildren: input.portalChildren ?? 0,
    parentId: input.parentId ?? null,
    parentPortalModeActive: input.parentPortalModeActive ?? false,
    storedOrganizationId: input.storedOrganizationId ?? null,
  });
}

function assertOrg(
  membership: OrganizationMembership | null,
  organizationId: string,
  industryType: string
) {
  assertSelectionInvariant(membership);
  assert.equal(membership?.organizationId, organizationId);
  assert.equal(membership?.organization.id, organizationId);
  assert.equal(membership?.organization.industry_type, industryType);
  const fields = deriveSelectionFields(membership);
  assert.equal(fields.currentOrganization?.id, organizationId);
  assert.equal(fields.currentOrganization?.industry_type, industryType);
}

function selectOrg(memberships: OrganizationMembership[], organizationId: string) {
  const result = resolveMembershipByOrganizationId(memberships, organizationId);
  assertSelectionInvariant(result.membership);
  return result;
}

const piano = mem({
  id: 'm-piano',
  organizationId: 'org-piano',
  role: 'owner',
  industry: 'piano',
  name: '행복피아노',
});
const academy = mem({
  id: 'm-academy',
  organizationId: 'org-academy',
  role: 'admin',
  industry: 'academy',
  name: '영어학원',
});
const gym = mem({
  id: 'm-gym',
  organizationId: 'org-gym',
  role: 'staff',
  industry: 'gym',
  name: '강남체육관',
});
const unknown = mem({
  id: 'm-unknown',
  organizationId: 'org-unknown',
  role: 'admin',
  industry: 'english_academy',
  name: '신규학원',
});

function run() {
  const here = dirname(fileURLToPath(import.meta.url));
  const contextSrc = readFileSync(join(here, 'resolveOrganizationContext.ts'), 'utf8');
  assert.equal(contextSrc.includes('industry_type'), false, '선택 로직이 industry_type에 의존하면 안 된다');
  const providerSrc = readFileSync(join(here, 'OrganizationProvider.tsx'), 'utf8');
  assert.match(providerSrc, /applyBootstrapToSession/);
  assert.match(providerSrc, /deriveSelectionFields\(selectedMembership\)/);
  assert.match(providerSrc, /nextOrganizationLocalStateAction/);
  assert.match(providerSrc, /clearStoredOrganizationId\(\)/);
  assert.match(providerSrc, /resolveMembershipAfterRefresh/);
  assert.match(providerSrc, /fetchUserMembershipsWithContext/);
  const wizardSrc = readFileSync(join(here, 'CreateOrganizationWizard.tsx'), 'utf8');
  assert.match(wizardSrc, /selectOrganization\(createdOrgId\)/);
  assert.equal(
    /refreshOrganizations[\s\S]*selectOrganization\(createdOrgId\)/.test(wizardSrc),
    false,
    '생성 직후 refresh→select 순서는 stale membership으로 실패한다'
  );

  // 1. 피아노만 — 로그인 자동 진입
  {
    const session = login({ memberships: [piano] });
    assert.equal(session.portalMode, 'none');
    assertOrg(session.selectedMembership, 'org-piano', 'piano');
    assert.equal(session.storedOrganizationId, 'org-piano');
    assert.equal(resolveIndustryAppKind(session.selectedMembership?.organization.industry_type), 'module');
  }

  // 2. 피아노 + 영어학원 — 복원 / 전환 / 앱 종류
  {
    const both = [piano, academy];
    const restored = login({ memberships: both, storedOrganizationId: 'org-academy' });
    assertOrg(restored.selectedMembership, 'org-academy', 'academy');
    assert.equal(resolveIndustryAppKind('academy'), 'generic');

    const toPiano = selectOrg(both, 'org-piano');
    assertOrg(toPiano.membership, 'org-piano', 'piano');
    assert.equal(toPiano.storage.action, 'store');
    if (toPiano.storage.action === 'store') {
      assert.equal(toPiano.storage.organizationId, 'org-piano');
    }
    assert.equal(resolveIndustryAppKind(toPiano.membership?.organization.industry_type), 'module');
    assert.equal(
      nextOrganizationLocalStateAction(restored.selectedMembership?.organizationId, 'org-piano'),
      'clear'
    );

    const back = selectOrg(both, 'org-academy');
    assertOrg(back.membership, 'org-academy', 'academy');
    assert.notEqual(back.membership?.organizationId, 'org-piano');
  }

  // 3. 서로 다른 업종 3개 — id/업종이 뒤섞이지 않음
  {
    const three = [piano, gym, unknown];
    const picks: Array<{ id: string; industry: string }> = [
      { id: 'org-piano', industry: 'piano' },
      { id: 'org-gym', industry: 'gym' },
      { id: 'org-unknown', industry: 'english_academy' },
    ];
    let previousId: string | null = null;
    for (const pick of picks) {
      const result = selectOrg(three, pick.id);
      assertOrg(result.membership, pick.id, pick.industry);
      const other = three.filter((m) => m.organizationId !== pick.id);
      for (const m of other) {
        assert.notEqual(result.membership?.organization.industry_type, m.organization.industry_type);
        assert.notEqual(result.membership?.organizationId, m.organizationId);
      }
      if (previousId) {
        assert.equal(nextOrganizationLocalStateAction(previousId, pick.id), 'clear');
      }
      previousId = pick.id;
    }
    const loginUnknown = login({ memberships: three, storedOrganizationId: 'org-unknown' });
    assertOrg(loginUnknown.selectedMembership, 'org-unknown', 'english_academy');
    assert.equal(loginUnknown.selectedMembership?.organizationId, 'org-unknown');
  }

  // 4. stored id는 있는데 membership이 사라짐
  {
    const staleSingle = login({
      memberships: [piano],
      storedOrganizationId: 'org-gone',
    });
    assertOrg(staleSingle.selectedMembership, 'org-piano', 'piano');

    const staleMulti = login({
      memberships: [piano, gym],
      storedOrganizationId: 'org-gone',
    });
    assert.equal(staleMulti.selectedMembership, null);
    assertSelectionInvariant(staleMulti.selectedMembership);
    assert.equal(deriveSelectionFields(staleMulti.selectedMembership).currentOrganization, null);
  }

  // 5. stored id가 다른 사업장 ID
  {
    const other = login({
      memberships: [piano, gym],
      storedOrganizationId: 'org-gym',
    });
    assertOrg(other.selectedMembership, 'org-gym', 'gym');
    assert.notEqual(other.selectedMembership?.organizationId, 'org-piano');
  }

  // 6. current context membership
  {
    const contextGym = { ...gym, isCurrentContext: true };
    const session = login({
      memberships: [piano, contextGym],
      storedOrganizationId: 'org-piano',
    });
    assert.equal(session.decision.kind, 'select_membership');
    assertOrg(session.selectedMembership, 'org-gym', 'gym');
  }

  // 7. active membership RPC ≠ localStorage
  {
    const rpcWins = login({
      memberships: [
        { ...piano, isCurrentContext: false },
        { ...academy, isCurrentContext: true },
      ],
      storedOrganizationId: 'org-piano',
    });
    assertOrg(rpcWins.selectedMembership, 'org-academy', 'academy');
    assert.equal(rpcWins.storedOrganizationId, 'org-academy');
  }

  // 8. 로그아웃 후 다른 계정
  {
    const accountA = login({ memberships: [piano] });
    assertOrg(accountA.selectedMembership, 'org-piano', 'piano');
    const loggedOut = {
      selectedMembership: null,
      storedOrganizationId: null as string | null,
      portalMode: 'none' as const,
    };
    assertSelectionInvariant(loggedOut.selectedMembership);
    const accountB = login({
      memberships: [gym],
      storedOrganizationId: loggedOut.storedOrganizationId,
    });
    assertOrg(accountB.selectedMembership, 'org-gym', 'gym');
    assert.notEqual(accountB.selectedMembership?.organizationId, 'org-piano');

    const leakedStored = login({
      memberships: [gym],
      storedOrganizationId: 'org-piano',
    });
    assertOrg(leakedStored.selectedMembership, 'org-gym', 'gym');
  }

  // 9. 부모 포털 후 staff 복귀
  {
    const dual = [piano];
    const inPortal = login({
      memberships: dual,
      storedOrganizationId: 'org-piano',
      parentPortalModeActive: true,
      parentId: 'parent-1',
      portalChildren: 1,
    });
    assert.equal(inPortal.portalMode, 'parent');
    assert.equal(inPortal.selectedMembership, null);
    assert.equal(inPortal.storedOrganizationId, null);
    assertSelectionInvariant(inPortal.selectedMembership);

    const backToStaff = login({
      memberships: dual,
      storedOrganizationId: inPortal.storedOrganizationId,
      parentPortalModeActive: false,
      parentId: 'parent-1',
      portalChildren: 1,
    });
    assert.equal(backToStaff.portalMode, 'none');
    assertOrg(backToStaff.selectedMembership, 'org-piano', 'piano');

    const dualStaff = [piano, gym];
    const portalThenPicker = login({
      memberships: dualStaff,
      parentPortalModeActive: false,
      parentId: 'parent-1',
      portalChildren: 1,
      storedOrganizationId: null,
    });
    assert.equal(portalThenPicker.portalMode, 'none');
    assert.equal(portalThenPicker.selectedMembership, null);
    const picked = selectOrg(dualStaff, 'org-gym');
    assertOrg(picked.membership, 'org-gym', 'gym');
  }

  // 10. unknown industry_type — 선택은 안전, 업종을 piano로 바꾸지 않음
  {
    const session = login({ memberships: [unknown] });
    assertOrg(session.selectedMembership, 'org-unknown', 'english_academy');
    assert.equal(resolveIndustryAppKind('english_academy'), 'generic');
    const switched = selectOrg([unknown, piano], 'org-unknown');
    assertOrg(switched.membership, 'org-unknown', 'english_academy');
    assert.equal(switched.membership?.organizationId, 'org-unknown');
  }

  // 11. 신규 생성 직후 — 현재 목록에 없어도 최신 membership으로 진입
  {
    const created = mem({
      id: 'm-new',
      organizationId: 'org-new',
      role: 'owner',
      industry: 'piano',
      name: '신규학원',
    });
    const stale = resolveMembershipByOrganizationId([], 'org-new');
    assert.equal(stale.membership, null);
    const afterRefresh = resolveMembershipAfterRefresh([], [created], 'org-new');
    assertOrg(afterRefresh.membership, 'org-new', 'piano');
    assert.equal(afterRefresh.storage.action, 'store');
    const missing = resolveMembershipAfterRefresh([], [piano], 'org-new');
    assert.equal(missing.membership, null);
  }

  // 같은 org를 다시 고르면 local state를 지우지 않음
  assert.equal(nextOrganizationLocalStateAction('org-piano', 'org-piano'), 'keep');

  console.log('organizationSelection.regression.test.ts: ok');
}

run();
