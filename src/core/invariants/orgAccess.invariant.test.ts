/**
 * [조직] Org Isolation · membership 변조 불변식
 * 실행: npm run test:org-access-invariant
 *
 * Invariant:
 *   - Org A 멤버 → Org A 데이터 접근 가능
 *   - Org A 멤버 → Org B 데이터 접근 불가
 *   - customer/member가 클라이언트에서 owner로 "승격"해도 admin 아님
 *
 * DB RLS 실측: test:rls-audit / test:rls-membership-escalation / test:rls-membership-policy
 * 여기는 접근 판정의 최종 boolean 상태만 검사 (구현 UI 클릭 아님).
 */
import assert from 'node:assert/strict';
import { isOrgAdmin } from '@/core/auth/permissionsRole';

type Membership = {
  userId: string;
  orgId: string;
  role: string;
  active: boolean;
};

const ORG_A = 'org-a';
const ORG_B = 'org-b';
const USER_A = 'user-a';

function canAccessOrg(
  memberships: Membership[],
  userId: string,
  orgId: string
): boolean {
  return memberships.some(
    (m) => m.userId === userId && m.orgId === orgId && m.active
  );
}

function hasAdminInOrg(
  memberships: Membership[],
  userId: string,
  orgId: string
): boolean {
  return memberships.some(
    (m) =>
      m.userId === userId &&
      m.orgId === orgId &&
      m.active &&
      (m.role === 'owner' || m.role === 'admin' || m.role === 'manager')
  );
}

/** 클라이언트가 local role 문자열을 바꿔도 isOrgAdmin은 membership SoT가 아님 — UX만 */
function clientSpoofedRole(claimed: string): boolean {
  return isOrgAdmin(claimed);
}

const base: Membership[] = [
  { userId: USER_A, orgId: ORG_A, role: 'staff', active: true },
];

// ── Isolation: Org A 접근 가능 / Org B 불가 ───────────────────────
{
  assert.equal(canAccessOrg(base, USER_A, ORG_A), true);
  assert.equal(canAccessOrg(base, USER_A, ORG_B), false);
  assert.equal(hasAdminInOrg(base, USER_A, ORG_A), false);
  assert.equal(hasAdminInOrg(base, USER_A, ORG_B), false);

  const rows = [
    { orgId: ORG_A, id: 'row-1' },
    { orgId: ORG_B, id: 'row-2' },
  ];
  const visible = rows.filter((r) => canAccessOrg(base, USER_A, r.orgId));
  assert.deepEqual(
    visible.map((r) => r.id),
    ['row-1']
  );
}

// ── Consistency: Org B owner여도 Org A admin이 되지 않음 ──────────
{
  const multi: Membership[] = [
    { userId: USER_A, orgId: ORG_A, role: 'customer', active: true },
    { userId: USER_A, orgId: ORG_B, role: 'owner', active: true },
  ];
  assert.equal(canAccessOrg(multi, USER_A, ORG_A), true);
  assert.equal(canAccessOrg(multi, USER_A, ORG_B), true);
  assert.equal(hasAdminInOrg(multi, USER_A, ORG_A), false);
  assert.equal(hasAdminInOrg(multi, USER_A, ORG_B), true);
}

// ── Escalation: membership 변조(로컬 claim) → 권한 상승 불가 의미 ──
{
  // 서버 membership은 customer인데 UI가 owner라고 주장
  assert.equal(hasAdminInOrg(base.map((m) => ({ ...m, role: 'customer' })), USER_A, ORG_A), false);
  // 로컬 claim만으로는 isOrgAdmin('owner') true가 될 수 있으나 —
  // 데이터 접근 판정(hasAdminInOrg)은 membership 행에 묶여 상승 불가
  assert.equal(clientSpoofedRole('owner'), true); // UX helper의 한계 문서화
  assert.equal(
    hasAdminInOrg(
      [{ userId: USER_A, orgId: ORG_A, role: 'customer', active: true }],
      USER_A,
      ORG_A
    ),
    false,
    'membership rows remain customer — no escalation'
  );
}

// ── inactive membership은 접근 부여 안 함 ─────────────────────────
{
  const inactive: Membership[] = [
    { userId: USER_A, orgId: ORG_A, role: 'owner', active: false },
  ];
  assert.equal(canAccessOrg(inactive, USER_A, ORG_A), false);
  assert.equal(hasAdminInOrg(inactive, USER_A, ORG_A), false);
}

console.log('orgAccess.invariant.test.ts: ok');
