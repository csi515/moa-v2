/**
 * session_passes 조직 정합성 — 실제 Supabase DB 통합 테스트
 * 실행: npm run test:session-pass-org-integrity-db
 *
 * live 실행 (모두 필요):
 *   MOA_DB_INTEGRATION=1
 *   MOA_DB_IT_ALLOW_PROJECT_REFS
 *   SUPABASE_URL | VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_ANON_KEY | VITE_SUPABASE_ANON_KEY
 *   MOA_DB_IT_OWNER_JWT | RLS_AUDIT_OWNER_A_JWT
 *
 * 게이트 없으면 dry-run(exit 0).
 * CI quality에는 정적 계약(test:session-pass-org-integrity)만 넣는다.
 * security-db 잡에는 SERVICE_ROLE이 없어 live FK 검증을 돌리지 않는다.
 */
import assert from 'node:assert/strict';
import { core, IT_TAG, resolveDbItContext, type DbItMode } from './dbIntegration/harness';

type LiveCtx = Extract<DbItMode, { mode: 'live' }>;

const verifiedLive: string[] = [];

function mark(name: string) {
  verifiedLive.push(name);
  console.log(`  PASS ${name}`);
}

function isFkViolation(message: string): boolean {
  return /session_passes_customer_org_fkey|foreign key/i.test(message);
}

async function runLive(ctx: LiveCtx): Promise<void> {
  console.log(
    `[session-pass-org-it] live project=${ctx.projectRef} org=${ctx.organizationId}`
  );

  const stamp = `${IT_TAG}_SP_${Date.now()}`;
  const sameOrgCustomerId = crypto.randomUUID();
  const otherOrgCustomerId = crypto.randomUUID();
  const passId = crypto.randomUUID();
  const bookingId = crypto.randomUUID();
  let createdOtherOrgId: string | null = null;
  let otherOrgId: string | null = null;

  const cleanup = async () => {
    await core(ctx.admin).from('schedules').delete().eq('id', bookingId);
    await core(ctx.admin).from('session_passes').delete().eq('id', passId);
    await core(ctx.admin).from('session_passes').delete().eq('customer_id', sameOrgCustomerId);
    await core(ctx.admin).from('customers').delete().eq('id', sameOrgCustomerId);
    await core(ctx.admin).from('customers').delete().eq('id', otherOrgCustomerId);
    if (createdOtherOrgId) {
      await core(ctx.admin).from('organizations').delete().eq('id', createdOtherOrgId);
    }
  };

  try {
    const { error: custErr } = await core(ctx.admin).from('customers').insert({
      id: sameOrgCustomerId,
      organization_id: ctx.organizationId,
      name: stamp,
      status: 'active',
    });
    assert.ok(!custErr, custErr?.message);

    const { data: existingOtherOrg } = await core(ctx.admin)
      .from('organizations')
      .select('id')
      .neq('id', ctx.organizationId)
      .limit(1)
      .maybeSingle();

    if (existingOtherOrg?.id) {
      otherOrgId = String(existingOtherOrg.id);
    } else {
      const { data: createdOrg, error: orgErr } = await core(ctx.admin)
        .from('organizations')
        .insert({ name: `${stamp}_ORG`, industry_type: 'piano' })
        .select('id')
        .single();
      assert.ok(!orgErr && createdOrg, orgErr?.message ?? 'other org seed failed');
      createdOtherOrgId = String(createdOrg.id);
      otherOrgId = createdOtherOrgId;
    }

    const { error: otherCustErr } = await core(ctx.admin).from('customers').insert({
      id: otherOrgCustomerId,
      organization_id: otherOrgId,
      name: `${stamp}_B`,
      status: 'active',
    });
    assert.ok(!otherCustErr, otherCustErr?.message);

    // 1. 같은 org customer → session pass 생성 성공
    {
      const { error } = await core(ctx.admin).from('session_passes').insert({
        id: passId,
        organization_id: ctx.organizationId,
        customer_id: sameOrgCustomerId,
        customer_name: stamp,
        label: 'IT 10회',
        total_sessions: 10,
        used_sessions: 0,
        status: 'active',
      });
      assert.ok(!error, error?.message);
      mark('same-org customer → session_pass INSERT ok');
    }

    // 2. 다른 org customer → INSERT 실패
    {
      const { error } = await core(ctx.admin).from('session_passes').insert({
        organization_id: ctx.organizationId,
        customer_id: otherOrgCustomerId,
        customer_name: 'cross',
        label: 'cross',
        total_sessions: 5,
        used_sessions: 0,
        status: 'active',
      });
      assert.ok(error, 'expected cross-org INSERT to fail');
      assert.ok(isFkViolation(error.message), error.message);
      mark('cross-org customer → INSERT rejected');
    }

    // 3. 기존 pass의 customer를 다른 org로 UPDATE → 실패
    {
      const { error } = await core(ctx.admin)
        .from('session_passes')
        .update({ customer_id: otherOrgCustomerId })
        .eq('id', passId);
      assert.ok(error, 'expected customer_id cross-org UPDATE to fail');
      assert.ok(isFkViolation(error.message), error.message);
      mark('UPDATE customer_id to other org rejected');
    }

    // 4. organization_id 변경으로 다른 org customer를 연결 → 실패
    {
      const { error } = await core(ctx.admin)
        .from('session_passes')
        .update({ organization_id: otherOrgId })
        .eq('id', passId);
      assert.ok(error, 'expected organization_id mismatch UPDATE to fail');
      assert.ok(isFkViolation(error.message), error.message);
      mark('UPDATE organization_id away from customer org rejected');
    }

    // 5. atomic booking RPC 정상 (used_sessions만 갱신, org 컬럼 유지)
    {
      const { error: bookErr } = await core(ctx.admin).from('schedules').insert({
        id: bookingId,
        organization_id: ctx.organizationId,
        customer_id: sameOrgCustomerId,
        starts_at: new Date(Date.now() + 60_000).toISOString(),
        ends_at: new Date(Date.now() + 3_600_000).toISOString(),
        status: 'scheduled',
        title: stamp,
        is_bookable: false,
        max_capacity: 1,
        metadata: {},
      });
      assert.ok(!bookErr, bookErr?.message);

      const { data, error } = await core(ctx.acting).rpc('update_booking_status_with_pass', {
        p_organization_id: ctx.organizationId,
        p_booking_id: bookingId,
        p_new_status: 'completed',
        p_consume_on_no_show: false,
      });
      assert.ok(!error, error?.message);
      assert.equal((data as { action?: string } | null)?.action, 'consume');

      const { data: passRow, error: passErr } = await core(ctx.admin)
        .from('session_passes')
        .select('used_sessions, status, customer_id, organization_id')
        .eq('id', passId)
        .single();
      assert.ok(!passErr, passErr?.message);
      assert.equal(Number(passRow?.used_sessions), 1);
      assert.equal(passRow?.customer_id, sameOrgCustomerId);
      assert.equal(passRow?.organization_id, ctx.organizationId);
      mark('update_booking_status_with_pass consume still works');
    }
  } finally {
    await cleanup();
  }
}

function printReport(mode: 'dry-run' | 'live', reason?: string) {
  console.log('\n=== session-pass-org-integrity-db report ===');
  console.log(`mode: ${mode}${reason ? ` (${reason})` : ''}`);
  if (verifiedLive.length === 0) {
    console.log('DB-verified (this run): (none — dry-run or skipped)');
  } else {
    for (const v of verifiedLive) console.log(`  ✓ ${v}`);
  }
  console.log('============================\n');
}

const ctx = await resolveDbItContext();
if (ctx.mode === 'dry-run') {
  console.log(`[session-pass-org-it] dry-run — ${ctx.reason}`);
  console.log('Would verify:');
  console.log('  1. same-org customer → session_pass INSERT ok');
  console.log('  2. cross-org customer → INSERT rejected by session_passes_customer_org_fkey');
  console.log('  3. UPDATE customer_id to other org rejected');
  console.log('  4. UPDATE organization_id away from customer org rejected');
  console.log('  5. update_booking_status_with_pass consume still works');
  printReport('dry-run', ctx.reason);
} else {
  await runLive(ctx);
  printReport('live');
}

console.log('sessionPassOrgIntegrityDb.test.ts: ok');
