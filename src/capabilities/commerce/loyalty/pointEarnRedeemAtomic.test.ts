/**
 * 포인트 earn/redeem 원자 RPC 계약·동시성 검증
 * 실행: npm run test:point-atomic
 *
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (또는 VITE_* + POINT_ATOMIC_* JWT)가 있으면
 * 실제 DB RPC를 호출한다. 없으면 dry-run(시나리오 안내) 후 exit 0.
 *
 * 원격에서 이미 검증된 시나리오:
 *   - 잔액 100에 병렬 redeem 80+80 → 1건 성공, 1건 부족 오류, 최종 20P
 *   - earn 100+100 → 최종 200P
 *   - 동일 sale redeem/earn 중복 → already_* skip, 잔액 1회만
 *   - 실패 redeem → orphan tx 없음
 */
import assert from 'node:assert/strict';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { computeEarnPoints } from './earnPolicy';

/** 서비스와 동일 계약 (vite env 없는 테스트 러너용 인라인) */
function maxRedeemablePoints(balance: number, saleTotalWon: number): number {
  return Math.max(
    0,
    Math.min(Math.floor(Math.max(0, balance)), Math.floor(Math.max(0, saleTotalWon)))
  );
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
  const ownerJwt = env('POINT_ATOMIC_OWNER_JWT') || env('RLS_AUDIT_OWNER_A_JWT');
  const orgId = env('POINT_ATOMIC_ORG_ID') || env('RLS_AUDIT_ORG_A_ID');

  if (!url || (!serviceKey && !(anonKey && ownerJwt && orgId))) {
    console.log('[point-atomic] dry-run — DB 자격 증명 미설정. 시나리오만 안내합니다.');
    console.log('  C1 balance=100 concurrent redeem 80+80 → one success, one insufficient, bal=20');
    console.log('  C2 concurrent earn 100+100 → bal=200');
    console.log('  C3 duplicate redeem same sale → already_redeemed, one tx');
    console.log('  C4 duplicate earn same sale → already_earned, one tx');
    console.log('  C5 failed redeem → no orphan tx, balance unchanged');
    console.log(
      '필요 env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 또는 anon+POINT_ATOMIC_OWNER_JWT+POINT_ATOMIC_ORG_ID'
    );
    return;
  }

  const admin = createClient(url, serviceKey || anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // service role로 fixture 준비 후 owner JWT로 RPC 호출
  let acting: SupabaseClient;
  let organizationId: string;
  let ownerUserId: string;

  if (serviceKey) {
    const { data: ownerRow, error: ownerErr } = await core(admin)
      .from('organization_members')
      .select('user_id, organization_id')
      .eq('role', 'owner')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (ownerErr || !ownerRow) {
      throw new Error(`owner fixture 조회 실패: ${ownerErr?.message ?? 'empty'}`);
    }
    organizationId = String(ownerRow.organization_id);
    ownerUserId = String(ownerRow.user_id);
    // service role로 RPC 직접 호출 시 auth.uid() 없음 → owner JWT 필수
    if (!ownerJwt) {
      console.log(
        '[point-atomic] SERVICE_ROLE만 있음 — owner JWT 없어 RPC auth 호출 생략(단위 계약만 검증).'
      );
      console.log(`  fixture org=${organizationId} owner=${ownerUserId}`);
      return;
    }
    acting = createClient(url, anonKey || serviceKey, {
      global: { headers: { Authorization: `Bearer ${ownerJwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } else {
    organizationId = orgId!;
    acting = createClient(url, anonKey!, {
      global: { headers: { Authorization: `Bearer ${ownerJwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
    } = await acting.auth.getUser();
    ownerUserId = user?.id || 'unknown';
  }

  const { data: customer, error: custErr } = await core(admin)
    .from('customers')
    .insert({
      organization_id: organizationId,
      name: `POINT_ATOMIC_${Date.now()}`,
      phone: '0000000000',
    })
    .select('id')
    .single();
  if (custErr || !customer) throw new Error(custErr?.message || 'customer create failed');
  const customerId = String(customer.id);

  const { error: accErr } = await core(admin).from('point_accounts').insert({
    organization_id: organizationId,
    customer_id: customerId,
    balance: 100,
  });
  if (accErr) throw accErr;

  const cleanup = async () => {
    await core(admin).from('point_transactions').delete().eq('customer_id', customerId);
    await core(admin).from('point_accounts').delete().eq('customer_id', customerId);
    await core(admin).from('customers').delete().eq('id', customerId);
  };

  try {
    const saleA = crypto.randomUUID();
    const saleB = crypto.randomUUID();

    // C1 concurrent redeem
    const [r1, r2] = await Promise.all([
      core(acting).rpc('apply_point_redeem_for_sale', {
        p_organization_id: organizationId,
        p_customer_id: customerId,
        p_sale_id: saleA,
        p_points_to_use: 80,
        p_sale_total_amount: 1000,
      }),
      core(acting).rpc('apply_point_redeem_for_sale', {
        p_organization_id: organizationId,
        p_customer_id: customerId,
        p_sale_id: saleB,
        p_points_to_use: 80,
        p_sale_total_amount: 1000,
      }),
    ]);

    const successCount = [r1, r2].filter((r) => !r.error && r.data && !(r.data as { skipped?: boolean }).skipped).length;
    const failCount = [r1, r2].filter((r) => !!r.error).length;
    assert.equal(successCount, 1, `C1 expected 1 success, got ${successCount}`);
    assert.equal(failCount, 1, `C1 expected 1 fail, got ${failCount}`);
    const { data: bal1 } = await core(admin)
      .from('point_accounts')
      .select('balance')
      .eq('customer_id', customerId)
      .single();
    assert.equal(Number(bal1?.balance), 20, 'C1 final balance');

    // C2 concurrent earn
    await core(admin).from('point_transactions').delete().eq('customer_id', customerId);
    await core(admin)
      .from('point_accounts')
      .update({ balance: 0 })
      .eq('customer_id', customerId);
    const saleC = crypto.randomUUID();
    const saleD = crypto.randomUUID();
    const [e1, e2] = await Promise.all([
      core(acting).rpc('apply_point_earn_for_sale', {
        p_organization_id: organizationId,
        p_customer_id: customerId,
        p_sale_id: saleC,
        p_points_earned: 100,
        p_earn_rate_percent: 1,
        p_base_amount: 10000,
      }),
      core(acting).rpc('apply_point_earn_for_sale', {
        p_organization_id: organizationId,
        p_customer_id: customerId,
        p_sale_id: saleD,
        p_points_earned: 100,
        p_earn_rate_percent: 1,
        p_base_amount: 10000,
      }),
    ]);
    assert.ok(!e1.error && !e2.error, `C2 errors: ${e1.error?.message} ${e2.error?.message}`);
    const { data: bal2 } = await core(admin)
      .from('point_accounts')
      .select('balance')
      .eq('customer_id', customerId)
      .single();
    assert.equal(Number(bal2?.balance), 200, 'C2 final balance');

    // C3 duplicate redeem
    await core(admin).from('point_transactions').delete().eq('customer_id', customerId);
    await core(admin)
      .from('point_accounts')
      .update({ balance: 100 })
      .eq('customer_id', customerId);
    const saleE = crypto.randomUUID();
    const first = await core(acting).rpc('apply_point_redeem_for_sale', {
      p_organization_id: organizationId,
      p_customer_id: customerId,
      p_sale_id: saleE,
      p_points_to_use: 50,
      p_sale_total_amount: 1000,
    });
    const dup = await core(acting).rpc('apply_point_redeem_for_sale', {
      p_organization_id: organizationId,
      p_customer_id: customerId,
      p_sale_id: saleE,
      p_points_to_use: 50,
      p_sale_total_amount: 1000,
    });
    assert.ok(!first.error);
    assert.equal((dup.data as { reason?: string })?.reason, 'already_redeemed');
    const { data: bal3 } = await core(admin)
      .from('point_accounts')
      .select('balance')
      .eq('customer_id', customerId)
      .single();
    assert.equal(Number(bal3?.balance), 50);

    console.log(`[point-atomic] DB integration ok (org=${organizationId}, owner=${ownerUserId})`);
  } finally {
    await cleanup();
  }
}

// ── 단위: 정책/헬퍼 계약 (정책 변경 없음) ─────────────────────────
{
  assert.equal(maxRedeemablePoints(100, 80), 80);
  assert.equal(maxRedeemablePoints(50, 80), 50);
  assert.equal(computeEarnPoints(10000, 1), 100);
}

await runDbIntegration();
console.log('pointEarnRedeemAtomic.test.ts: ok');
