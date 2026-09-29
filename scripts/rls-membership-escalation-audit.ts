/**
 * organization_members INSERT RLS — 권한 상승(self-join) 차단 감사
 *
 * 시나리오:
 *   M1 비멤버가 타 org에 자신을 owner로 INSERT → 거부
 *   M2 비멤버가 타 org에 자신을 admin으로 INSERT → 거부
 *   M3 비멤버가 타 org에 자신을 manager로 INSERT → 거부
 *   M4 (선택) 기존 customer 멤버가 동일 org에 owner 추가 INSERT → 거부
 *   M5 (선택) owner가 다른 user_id로 staff 멤버 INSERT → 허용(또는 FK/제약만)
 *
 * 환경변수:
 *   SUPABASE_URL | VITE_SUPABASE_URL
 *   SUPABASE_ANON_KEY | VITE_SUPABASE_ANON_KEY
 *   RLS_AUDIT_ORG_B_ID                 — 공격 대상 조직 (멤버가 아니어야 함)
 *   RLS_AUDIT_ATTACKER_JWT             — 비멤버(또는 OrgA만 소속) JWT
 *   RLS_AUDIT_OWNER_A_JWT (선택)       — OrgA owner (M5)
 *   RLS_AUDIT_ORG_A_ID (선택)          — M5 대상 org
 *   RLS_AUDIT_STAFF_USER_ID (선택)     — M5에 추가할 profiles.id
 *   RLS_AUDIT_CUSTOMER_JWT (선택)      — OrgB customer (M4)
 *
 * 시드 없으면 dry-run 후 exit 0.
 * 실행: npm run test:rls-membership-escalation
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function makeAuthedClient(jwt: string, url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function core(client: SupabaseClient) {
  return client.schema('core');
}

function isRlsDenied(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return (
    error.code === '42501' ||
    /row-level security|permission denied|violates row-level security/i.test(msg)
  );
}

async function trySelfInsert(
  client: SupabaseClient,
  orgId: string,
  role: string
): Promise<{ blocked: boolean; detail: string }> {
  const {
    data: { user },
    error: userErr,
  } = await client.auth.getUser();
  if (userErr || !user?.id) {
    return { blocked: false, detail: `auth.getUser failed: ${userErr?.message ?? 'no user'}` };
  }

  const { data, error } = await core(client)
    .from('organization_members')
    .insert({
      organization_id: orgId,
      user_id: user.id,
      role,
      is_active: true,
    })
    .select('id')
    .maybeSingle();

  if (isRlsDenied(error)) {
    return { blocked: true, detail: error?.message || 'RLS denied' };
  }
  if (error) {
    // unique 충돌 등은 "이미 있음"이지 정책 통과일 수 있음 → FAIL로 취급
    return { blocked: false, detail: `unexpected error: ${error.message}` };
  }
  if (data?.id) {
    // 정책이 뚫린 경우 — 테스트 잔여물 정리 시도(실패해도 기록)
    await core(client).from('organization_members').delete().eq('id', data.id);
    return { blocked: false, detail: `INSERT succeeded id=${data.id} (cleaned up)` };
  }
  return { blocked: false, detail: 'INSERT returned no error and no row' };
}

async function main(): Promise<void> {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const anonKey = env('SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY');
  const orgB = env('RLS_AUDIT_ORG_B_ID');
  const attackerJwt = env('RLS_AUDIT_ATTACKER_JWT') || env('RLS_AUDIT_STAFF_A_JWT');
  const ownerJwt = env('RLS_AUDIT_OWNER_A_JWT');
  const orgA = env('RLS_AUDIT_ORG_A_ID');
  const staffUserId = env('RLS_AUDIT_STAFF_USER_ID');
  const customerJwt = env('RLS_AUDIT_CUSTOMER_JWT');

  const titles = [
    'M1 Attacker → OrgB self INSERT role=owner = DENIED',
    'M2 Attacker → OrgB self INSERT role=admin = DENIED',
    'M3 Attacker → OrgB self INSERT role=manager = DENIED',
    'M4 Customer → same org self INSERT role=owner = DENIED (optional)',
    'M5 Owner → INSERT other user as staff = ALLOWED (optional)',
  ];

  if (!url || !anonKey || !orgB || !attackerJwt) {
    console.log(
      '[rls-membership-escalation] dry-run — 시드/JWT 미설정. 시나리오만 안내합니다.'
    );
    for (const line of titles) console.log(`  ${line}`);
    console.log(
      '필요 env: SUPABASE_URL, SUPABASE_ANON_KEY, RLS_AUDIT_ORG_B_ID, RLS_AUDIT_ATTACKER_JWT'
    );
    console.log(
      '선택: RLS_AUDIT_CUSTOMER_JWT, RLS_AUDIT_OWNER_A_JWT, RLS_AUDIT_ORG_A_ID, RLS_AUDIT_STAFF_USER_ID'
    );
    console.log(
      '정책 기대: organization_members_insert WITH CHECK (is_org_owner_or_admin(organization_id))'
    );
    process.exit(0);
  }

  const attacker = makeAuthedClient(attackerJwt, url, anonKey);
  let failed = 0;

  for (const role of ['owner', 'admin', 'manager'] as const) {
    const id = role === 'owner' ? 'M1' : role === 'admin' ? 'M2' : 'M3';
    const result = await trySelfInsert(attacker, orgB, role);
    const mark = result.blocked ? 'PASS' : 'FAIL';
    console.log(`[${mark}] ${id} self-INSERT ${role} on OrgB (${result.detail})`);
    if (!result.blocked) failed += 1;
  }

  if (customerJwt) {
    const customer = makeAuthedClient(customerJwt, url, anonKey);
    const result = await trySelfInsert(customer, orgB, 'owner');
    const mark = result.blocked ? 'PASS' : 'FAIL';
    console.log(`[${mark}] M4 customer self-INSERT owner on OrgB (${result.detail})`);
    if (!result.blocked) failed += 1;
  } else {
    console.log('[SKIP] M4 RLS_AUDIT_CUSTOMER_JWT 미설정');
  }

  if (ownerJwt && orgA && staffUserId) {
    const owner = makeAuthedClient(ownerJwt, url, anonKey);
    const { data, error } = await core(owner)
      .from('organization_members')
      .insert({
        organization_id: orgA,
        user_id: staffUserId,
        role: 'staff',
        is_active: true,
      })
      .select('id')
      .maybeSingle();

    if (data?.id) {
      await core(owner).from('organization_members').delete().eq('id', data.id);
      console.log(`[PASS] M5 owner can INSERT staff membership (${data.id}, cleaned up)`);
    } else if (error && /duplicate|unique|already/i.test(error.message)) {
      console.log(`[PASS] M5 owner INSERT reached table (constraint: ${error.message})`);
    } else if (isRlsDenied(error)) {
      console.log(`[FAIL] M5 owner INSERT denied by RLS (${error?.message})`);
      failed += 1;
    } else {
      console.log(`[FAIL] M5 unexpected: ${error?.message ?? 'no row'}`);
      failed += 1;
    }
  } else {
    console.log('[SKIP] M5 owner invite-style INSERT (optional env 미설정)');
  }

  if (failed > 0) {
    console.error(`[rls-membership-escalation] ${failed} scenario(s) failed`);
    process.exit(1);
  }
  console.log('[rls-membership-escalation] ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
