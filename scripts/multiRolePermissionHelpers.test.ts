/**
 * multi-role 권한 helper 계약 테스트
 * 실행: npm run test:multi-role-helpers
 *
 * - 정적: 마이그레이션이 get_org_role 단일값 의존을 제거했는지
 * - DB: SUPABASE_* + owner JWT 있으면 실제 helper 결과 검증
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migPath = join(
  root,
  'supabase/migrations/20260921170000_multi_role_permission_helpers.sql'
);
const mig = readFileSync(migPath, 'utf8');

assert.match(mig, /CREATE OR REPLACE FUNCTION core\.has_any_org_role/);
assert.match(mig, /CREATE OR REPLACE FUNCTION core\.has_org_role/);
assert.match(
  mig,
  /is_org_admin[\s\S]*has_any_org_role[\s\S]*owner[\s\S]*admin[\s\S]*manager/
);
assert.match(mig, /is_org_owner_or_admin[\s\S]*has_any_org_role/);
assert.match(mig, /is_org_owner[\s\S]*has_org_role[\s\S]*owner/);
assert.match(mig, /is_org_staff[\s\S]*has_org_role[\s\S]*staff/);
assert.match(mig, /is_org_parent[\s\S]*has_org_role[\s\S]*parent/);
assert.match(mig, /ORDER BY[\s\S]*WHEN 'owner'::core\.member_role THEN 1/);
assert.match(mig, /has_any_org_role\([\s\S]*instructor/);
assert.doesNotMatch(
  mig,
  /CREATE OR REPLACE FUNCTION core\.is_org_admin[\s\S]*get_org_role\(org_id\) IN/
);

/** JS 모델: EXISTS any role (SQL has_any_org_role과 동일) */
function hasAny(
  memberships: Array<{ orgId: string; role: string; active: boolean; userId: string }>,
  authUserId: string,
  orgId: string,
  roles: string[]
): boolean {
  return memberships.some(
    (m) =>
      m.userId === authUserId &&
      m.orgId === orgId &&
      m.active &&
      roles.includes(m.role)
  );
}

function getOrgRoleDeterministic(
  memberships: Array<{ orgId: string; role: string; active: boolean; userId: string; id: string }>,
  authUserId: string,
  orgId: string
): string | null {
  const rank: Record<string, number> = {
    owner: 1,
    admin: 2,
    manager: 3,
    staff: 4,
    instructor: 5,
    parent: 6,
    guardian: 7,
    member: 8,
    customer: 9,
  };
  const rows = memberships
    .filter((m) => m.userId === authUserId && m.orgId === orgId && m.active)
    .sort((a, b) => (rank[a.role] ?? 99) - (rank[b.role] ?? 99) || a.id.localeCompare(b.id));
  return rows[0]?.role ?? null;
}

const ORG_A = 'org-a';
const ORG_B = 'org-b';
const USER = 'user-1';
const OTHER = 'user-2';

// ── owner 단일 ────────────────────────────────────────────────────
{
  const m = [{ orgId: ORG_A, role: 'owner', active: true, userId: USER, id: '1' }];
  assert.equal(hasAny(m, USER, ORG_A, ['owner', 'admin', 'manager']), true);
  assert.equal(hasAny(m, USER, ORG_A, ['staff']), false);
  assert.equal(getOrgRoleDeterministic(m, USER, ORG_A), 'owner');
}

// ── staff 단일 ────────────────────────────────────────────────────
{
  const m = [{ orgId: ORG_A, role: 'staff', active: true, userId: USER, id: '1' }];
  assert.equal(hasAny(m, USER, ORG_A, ['owner', 'admin', 'manager']), false);
  assert.equal(hasAny(m, USER, ORG_A, ['staff']), true);
  assert.equal(getOrgRoleDeterministic(m, USER, ORG_A), 'staff');
}

// ── owner + instructor → admin true, get_org_role=owner ───────────
{
  const m = [
    { orgId: ORG_A, role: 'instructor', active: true, userId: USER, id: 'a' },
    { orgId: ORG_A, role: 'owner', active: true, userId: USER, id: 'b' },
  ];
  assert.equal(hasAny(m, USER, ORG_A, ['owner', 'admin', 'manager']), true);
  assert.equal(hasAny(m, USER, ORG_A, ['instructor']), true);
  assert.equal(getOrgRoleDeterministic(m, USER, ORG_A), 'owner');
}

// ── staff + instructor → staff true, admin false ──────────────────
{
  const m = [
    { orgId: ORG_A, role: 'instructor', active: true, userId: USER, id: 'a' },
    { orgId: ORG_A, role: 'staff', active: true, userId: USER, id: 'b' },
  ];
  assert.equal(hasAny(m, USER, ORG_A, ['owner', 'admin', 'manager']), false);
  assert.equal(hasAny(m, USER, ORG_A, ['staff']), true);
  assert.equal(hasAny(m, USER, ORG_A, ['instructor']), true);
  assert.equal(
    hasAny(m, USER, ORG_A, ['owner', 'admin', 'manager', 'staff', 'instructor']),
    true
  );
  assert.equal(getOrgRoleDeterministic(m, USER, ORG_A), 'staff');
}

// ── member + customer → staff point 역할 아님 ─────────────────────
{
  const m = [
    { orgId: ORG_A, role: 'member', active: true, userId: USER, id: 'a' },
    { orgId: ORG_A, role: 'customer', active: true, userId: USER, id: 'b' },
  ];
  assert.equal(
    hasAny(m, USER, ORG_A, ['owner', 'admin', 'manager', 'staff', 'instructor']),
    false
  );
  assert.equal(hasAny(m, USER, ORG_A, ['member', 'customer']), true);
  assert.equal(getOrgRoleDeterministic(m, USER, ORG_A), 'member');
}

// ── 다른 organization role 혼합 ───────────────────────────────────
{
  const m = [
    { orgId: ORG_A, role: 'staff', active: true, userId: USER, id: 'a' },
    { orgId: ORG_B, role: 'owner', active: true, userId: USER, id: 'b' },
  ];
  assert.equal(hasAny(m, USER, ORG_A, ['owner', 'admin', 'manager']), false);
  assert.equal(hasAny(m, USER, ORG_B, ['owner', 'admin', 'manager']), true);
  assert.equal(hasAny(m, USER, ORG_A, ['staff']), true);
}

// ── inactive membership 무시 ──────────────────────────────────────
{
  const m = [
    { orgId: ORG_A, role: 'owner', active: false, userId: USER, id: 'a' },
    { orgId: ORG_A, role: 'instructor', active: true, userId: USER, id: 'b' },
  ];
  assert.equal(hasAny(m, USER, ORG_A, ['owner', 'admin', 'manager']), false);
  assert.equal(hasAny(m, USER, ORG_A, ['instructor']), true);
  assert.equal(getOrgRoleDeterministic(m, USER, ORG_A), 'instructor');
}

// ── 다른 사용자 membership 접근 불가 ─────────────────────────────
{
  const m = [{ orgId: ORG_A, role: 'owner', active: true, userId: OTHER, id: 'a' }];
  assert.equal(hasAny(m, USER, ORG_A, ['owner', 'admin', 'manager']), false);
  assert.equal(getOrgRoleDeterministic(m, USER, ORG_A), null);
}

function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function core(client: SupabaseClient) {
  return client.schema('core');
}

async function runDbIntegration(): Promise<void> {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = env('SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY');
  const ownerJwt =
    env('MULTI_ROLE_OWNER_JWT') || env('POINT_ATOMIC_OWNER_JWT') || env('RLS_AUDIT_OWNER_A_JWT');

  if (!url || !serviceKey || !ownerJwt) {
    console.log('[multi-role] dry-run — DB 자격 증명 미설정. 단위 계약만 검증.');
    return;
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const acting = createClient(url, anonKey || serviceKey, {
    global: { headers: { Authorization: `Bearer ${ownerJwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
  } = await acting.auth.getUser();
  if (!user?.id) throw new Error('owner JWT invalid');

  const { data: ownerRow, error: ownerErr } = await core(admin)
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  if (ownerErr || !ownerRow) {
    throw new Error(`owner membership missing: ${ownerErr?.message ?? 'empty'}`);
  }
  const orgId = String(ownerRow.organization_id);

  // owner 단일(또는 기존) → is_org_admin true
  const { data: adminOk, error: e1 } = await core(acting).rpc('is_org_admin', {
    org_id: orgId,
  });
  assert.ok(!e1, e1?.message);
  assert.equal(adminOk, true);

  // instructor 추가 후 owner+instructor 에서도 admin true / get_org_role=owner
  const { data: inserted, error: insErr } = await core(admin)
    .from('organization_members')
    .insert({
      organization_id: orgId,
      user_id: user.id,
      role: 'instructor',
      is_active: true,
    })
    .select('id')
    .maybeSingle();

  // unique 충돌이면 이미 있음
  const instructorId = inserted?.id
    ? String(inserted.id)
    : (
        await core(admin)
          .from('organization_members')
          .select('id')
          .eq('organization_id', orgId)
          .eq('user_id', user.id)
          .eq('role', 'instructor')
          .maybeSingle()
      ).data?.id;

  if (insErr && !/duplicate|unique/i.test(insErr.message)) {
    throw insErr;
  }

  try {
    const { data: adminStill, error: e2 } = await core(acting).rpc('is_org_admin', {
      org_id: orgId,
    });
    assert.ok(!e2, e2?.message);
    assert.equal(adminStill, true, 'owner+instructor must remain is_org_admin');

    const { data: role, error: e3 } = await core(acting).rpc('get_org_role', {
      org_id: orgId,
    });
    assert.ok(!e3, e3?.message);
    assert.equal(role, 'owner', 'get_org_role must prefer owner over instructor');

    const { data: hasInst, error: e4 } = await core(acting).rpc('has_org_role', {
      org_id: orgId,
      want_role: 'instructor',
    });
    assert.ok(!e4, e4?.message);
    assert.equal(hasInst, true);

    // 타 org: false
    const { data: otherOrgs } = await core(admin)
      .from('organizations')
      .select('id')
      .neq('id', orgId)
      .limit(1);
    if (otherOrgs?.[0]?.id) {
      const { data: cross, error: e5 } = await core(acting).rpc('is_org_admin', {
        org_id: otherOrgs[0].id,
      });
      assert.ok(!e5, e5?.message);
      assert.equal(cross, false);
    }

    console.log(`[multi-role] DB integration ok (org=${orgId})`);
  } finally {
    if (instructorId && inserted?.id) {
      await core(admin).from('organization_members').delete().eq('id', instructorId);
    }
  }
}

await runDbIntegration();
console.log('multiRolePermissionHelpers.test.ts: ok');
