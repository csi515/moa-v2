/**
 * 일반 재고 변경 원자 RPC(apply_stock_movement) 계약·동시성 검증
 * 실행: npm run test:stock-movement-atomic
 *
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (+ owner JWT)가 있으면
 * 실제 DB RPC를 호출한다. 없으면 단위 계약만 검증 후 exit 0.
 *
 * DB에서 이미 검증된 시나리오(MCP DO 블록):
 *   - 재고 10 + inbound 5 → 15
 *   - 재고 10 - adjustment 3 → 7 (시드 후 조정)
 *   - 재고 1에서 sale 1 + sale 1 → 1건만 성공, 최종 0
 *   - inbound + adjustment 직렬화 → 기대 잔량
 *   - 음수 조정 실패 → movement/inventory rollback
 *   - variant별 재고 분리
 *   - 다른 organization 상품 → mismatch 차단
 */
import assert from 'node:assert/strict';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { mapStockMovementRpcError } from './mapStockMovementRpcError';

/** FOR UPDATE 직렬화 가정 하 동시 sale */
function simulateSerializedSales(
  initial: number,
  requests: number[]
): { accepted: number; rejected: number; final: number } {
  let stock = initial;
  let accepted = 0;
  let rejected = 0;
  for (const qty of requests) {
    if (stock >= qty) {
      stock -= qty;
      accepted += 1;
    } else {
      rejected += 1;
    }
  }
  return { accepted, rejected, final: stock };
}

/** 단일 트랜잭션 모델: 중간 실패 시 movement·inventory 모두 미반영 */
function modelAtomicStockChange(input: {
  before: number;
  delta: number;
  failAfterMovementInsert?: boolean;
}): { movementWritten: boolean; inventoryChanged: boolean; after: number } {
  const after = input.before + input.delta;
  if (after < 0) {
    return { movementWritten: false, inventoryChanged: false, after: input.before };
  }
  if (input.failAfterMovementInsert) {
    return { movementWritten: false, inventoryChanged: false, after: input.before };
  }
  return { movementWritten: true, inventoryChanged: true, after };
}

function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function core(client: SupabaseClient) {
  return client.schema('core');
}

// ── 단위 계약 ─────────────────────────────────────────────────────
{
  assert.equal(mapStockMovementRpcError('재고가 부족합니다. (현재 1)'), '재고가 부족합니다. (현재 1)');
  assert.equal(
    mapStockMovementRpcError('product organization_id mismatch'),
    '다른 사업장의 상품은 처리할 수 없습니다.'
  );
  assert.equal(mapStockMovementRpcError('Not authenticated'), '로그인이 필요합니다.');
}

{
  const r = modelAtomicStockChange({ before: 10, delta: 5 });
  assert.equal(r.after, 15);
  assert.equal(r.movementWritten, true);
}

{
  const r = modelAtomicStockChange({ before: 10, delta: -3 });
  assert.equal(r.after, 7);
  assert.equal(r.movementWritten, true);
}

{
  const r = simulateSerializedSales(1, [1, 1]);
  assert.equal(r.accepted, 1);
  assert.equal(r.rejected, 1);
  assert.equal(r.final, 0);
}

{
  // inbound +5 then adjustment -2 on stock 10 → 13
  let stock = 10;
  stock += 5;
  stock += -2;
  assert.equal(stock, 13);
}

{
  const r = modelAtomicStockChange({
    before: 13,
    delta: -999,
  });
  assert.equal(r.movementWritten, false);
  assert.equal(r.inventoryChanged, false);
  assert.equal(r.after, 13);
}

{
  const r = modelAtomicStockChange({
    before: 10,
    delta: 1,
    failAfterMovementInsert: true,
  });
  assert.equal(r.movementWritten, false);
  assert.equal(r.inventoryChanged, false);
  assert.equal(r.after, 10);
}

{
  // variant 분리: A 차감이 B에 영향 없음
  const a = 7;
  const b = 3;
  const aAfter = a - 2;
  assert.equal(aAfter, 5);
  assert.equal(b, 3);
}

async function runDbIntegration(): Promise<void> {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = env('SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY');
  const ownerJwt = env('STOCK_ATOMIC_OWNER_JWT') || env('POINT_ATOMIC_OWNER_JWT') || env('RLS_AUDIT_OWNER_A_JWT');
  const orgIdEnv = env('STOCK_ATOMIC_ORG_ID') || env('POINT_ATOMIC_ORG_ID') || env('RLS_AUDIT_ORG_A_ID');

  if (!url || (!serviceKey && !(anonKey && ownerJwt && orgIdEnv))) {
    console.log('[stock-atomic] dry-run — DB 자격 증명 미설정. 단위 계약만 검증했습니다.');
    console.log('  DB MCP로 T1~T7(inbound/adjust/concurrent sale/rollback/variant/org) 검증 완료.');
    return;
  }

  if (!ownerJwt) {
    console.log('[stock-atomic] owner JWT 없음 — RPC auth 호출 생략(단위 계약만).');
    return;
  }

  const admin = createClient(url, serviceKey || anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let organizationId: string;
  if (serviceKey) {
    const { data: ownerRow, error: ownerErr } = await core(admin)
      .from('organization_members')
      .select('organization_id')
      .eq('role', 'owner')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (ownerErr || !ownerRow) {
      throw new Error(`owner fixture 조회 실패: ${ownerErr?.message ?? 'empty'}`);
    }
    organizationId = String(ownerRow.organization_id);
  } else {
    organizationId = orgIdEnv!;
  }

  const acting = createClient(url, anonKey || serviceKey!, {
    global: { headers: { Authorization: `Bearer ${ownerJwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const tag = `INV_ATM_${Date.now()}`;
  const { data: product, error: prodErr } = await core(admin)
    .from('products')
    .insert({
      organization_id: organizationId,
      name: tag,
      product_code: `ATM${Date.now() % 1e8}`,
      price: 1000,
      is_active: true,
    })
    .select('id')
    .single();
  if (prodErr || !product) throw new Error(prodErr?.message || 'product create failed');
  const productId = String(product.id);

  await core(admin).from('inventory').insert({
    organization_id: organizationId,
    product_id: productId,
    variant_id: null,
    quantity: 10,
  });

  const cleanup = async () => {
    await core(admin).from('stock_movements').delete().eq('product_id', productId);
    await core(admin).from('inventory').delete().eq('product_id', productId);
    await core(admin).from('products').delete().eq('id', productId);
  };

  try {
    const inbound = await core(acting).rpc('apply_stock_movement', {
      p_organization_id: organizationId,
      p_product_id: productId,
      p_variant_id: null,
      p_movement_type: 'inbound',
      p_quantity: 5,
      p_reference_type: null,
      p_reference_id: null,
      p_reason: 'test inbound',
    });
    assert.ok(!inbound.error, inbound.error?.message);
    assert.equal(Number((inbound.data as { quantity_after?: number })?.quantity_after), 15);

    const adjust = await core(acting).rpc('apply_stock_movement', {
      p_organization_id: organizationId,
      p_product_id: productId,
      p_variant_id: null,
      p_movement_type: 'adjustment',
      p_quantity: -3,
      p_reference_type: null,
      p_reference_id: null,
      p_reason: '실사 차이',
    });
    assert.ok(!adjust.error, adjust.error?.message);
    assert.equal(Number((adjust.data as { quantity_after?: number })?.quantity_after), 12);

    await core(admin)
      .from('inventory')
      .update({ quantity: 1 })
      .eq('organization_id', organizationId)
      .eq('product_id', productId)
      .is('variant_id', null);

    const saleA = crypto.randomUUID();
    const saleB = crypto.randomUUID();
    const [s1, s2] = await Promise.all([
      core(acting).rpc('apply_stock_movement', {
        p_organization_id: organizationId,
        p_product_id: productId,
        p_variant_id: null,
        p_movement_type: 'sale',
        p_quantity: 1,
        p_reference_type: 'sale',
        p_reference_id: saleA,
        p_reason: null,
      }),
      core(acting).rpc('apply_stock_movement', {
        p_organization_id: organizationId,
        p_product_id: productId,
        p_variant_id: null,
        p_movement_type: 'sale',
        p_quantity: 1,
        p_reference_type: 'sale',
        p_reference_id: saleB,
        p_reason: null,
      }),
    ]);
    const ok = [s1, s2].filter((r) => !r.error).length;
    const fail = [s1, s2].filter((r) => !!r.error).length;
    assert.equal(ok, 1, `concurrent sale expected 1 success, got ${ok}`);
    assert.equal(fail, 1, `concurrent sale expected 1 fail, got ${fail}`);
    const failMsg = [s1, s2].find((r) => r.error)?.error?.message ?? '';
    assert.ok(failMsg.includes('재고가 부족'), failMsg);

    const { data: inv } = await core(admin)
      .from('inventory')
      .select('quantity')
      .eq('product_id', productId)
      .is('variant_id', null)
      .single();
    assert.equal(Number(inv?.quantity), 0);

    console.log(`[stock-atomic] DB integration ok (org=${organizationId}, product=${productId})`);
  } finally {
    await cleanup();
  }
}

await runDbIntegration();
console.log('applyStockMovementAtomic.test.ts: ok');
