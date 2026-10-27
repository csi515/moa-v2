/**
 * Core Commerce/Loyalty/Inventory/multi-role — 실제 Supabase DB 통합 테스트
 * 실행: npm run test:commerce-db-it
 *
 * live 실행 (모두 필요):
 *   MOA_DB_INTEGRATION=1
 *   MOA_DB_IT_ALLOW_PROJECT_REFS=<supabase project ref>
 *   SUPABASE_URL | VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_ANON_KEY | VITE_SUPABASE_ANON_KEY
 *   MOA_DB_IT_OWNER_JWT | RLS_AUDIT_OWNER_A_JWT | POINT_ATOMIC_OWNER_JWT
 *   (선택) MOA_DB_IT_ORG_ID
 *
 * 게이트 없으면 dry-run(exit 0). allowlist 불일치면 exit 1로 차단.
 *
 * 기존 unit/model 테스트(createSaleAtomic 등)는 별도 유지.
 */
import assert from 'node:assert/strict';
import {
  core,
  getInventoryQty,
  resolveDbItContext,
  saleLine,
  seedCommerceFixture,
  type DbItMode,
} from './dbIntegration/harness';

type LiveCtx = Extract<DbItMode, { mode: 'live' }>;

const verifiedLive: string[] = [];
const modelOnly: string[] = [
  'createSaleAtomic.test.ts — modelAtomicCreateSale / simulateSerializedConcurrentSales',
  'createSaleReturnAtomic.test.ts — modelAtomicCreateReturn / simulateSerializedConcurrentReturns',
  'saleRedeemConsistency.test.ts — migration/static boundary (no RPC)',
  'multiRolePermissionHelpers.test.ts unit model (hasAny/getOrgRoleDeterministic)',
];

function mark(name: string) {
  verifiedLive.push(name);
  console.log(`  PASS ${name}`);
}

async function runLive(ctx: LiveCtx): Promise<void> {
  console.log(
    `[commerce-db-it] live project=${ctx.projectRef} org=${ctx.organizationId} user=${ctx.ownerUserId}`
  );

  const fx = await seedCommerceFixture(ctx, { stock: 10 });
  try {
    // ── 1. create_sale 정상 ───────────────────────────────────────
    {
      const { data, error } = await core(ctx.acting).rpc('create_sale', {
        p_organization_id: fx.organizationId,
        p_customer_id: fx.customerId,
        p_payment_method: 'cash',
        p_points_used: 0,
        p_items: [saleLine(fx.productId, 2)],
      });
      assert.ok(!error, error?.message);
      assert.ok((data as { id?: string })?.id);
      assert.equal(await getInventoryQty(ctx.admin, fx.organizationId, fx.productId), 8);
      mark('create_sale happy path (stock 10→8)');
    }

    // ── 2. create_sale 재고 부족 rollback ─────────────────────────
    {
      const before = await getInventoryQty(ctx.admin, fx.organizationId, fx.productId);
      const { data: salesBefore } = await core(ctx.admin)
        .from('sales')
        .select('id')
        .eq('organization_id', fx.organizationId);
      const saleCountBefore = salesBefore?.length ?? 0;

      const { error } = await core(ctx.acting).rpc('create_sale', {
        p_organization_id: fx.organizationId,
        p_customer_id: null,
        p_payment_method: 'cash',
        p_points_used: 0,
        p_items: [saleLine(fx.productId, 999)],
      });
      assert.ok(error, 'expected insufficient stock error');
      assert.match(error.message, /재고가 부족/);
      assert.equal(await getInventoryQty(ctx.admin, fx.organizationId, fx.productId), before);
      const { data: salesAfter } = await core(ctx.admin)
        .from('sales')
        .select('id')
        .eq('organization_id', fx.organizationId);
      assert.equal(salesAfter?.length ?? 0, saleCountBefore);
      mark('create_sale insufficient stock → full rollback');
    }

    // ── 3. 동일 SKU duplicate line 합산 ───────────────────────────
    {
      await core(ctx.admin)
        .from('inventory')
        .update({ quantity: 5 })
        .eq('organization_id', fx.organizationId)
        .eq('product_id', fx.productId)
        .is('variant_id', null);

      const { data, error } = await core(ctx.acting).rpc('create_sale', {
        p_organization_id: fx.organizationId,
        p_customer_id: null,
        p_payment_method: 'cash',
        p_points_used: 0,
        p_items: [saleLine(fx.productId, 2, { name: 'A' }), saleLine(fx.productId, 3, { name: 'A' })],
      });
      assert.ok(!error, error?.message);
      const saleId = String((data as { id: string }).id);
      assert.equal(await getInventoryQty(ctx.admin, fx.organizationId, fx.productId), 0);
      const { data: items } = await core(ctx.admin)
        .from('sale_items')
        .select('quantity')
        .eq('sale_id', saleId);
      assert.equal(items?.length, 2);
      assert.equal(
        (items ?? []).reduce((s, r) => s + Number(r.quantity), 0),
        5
      );
      mark('create_sale duplicate SKU lines aggregated for stock');
    }

    // ── 4. concurrent sale oversubscription ─────────────────────
    {
      await core(ctx.admin)
        .from('inventory')
        .update({ quantity: 1 })
        .eq('organization_id', fx.organizationId)
        .eq('product_id', fx.productId)
        .is('variant_id', null);

      const [a, b] = await Promise.all([
        core(ctx.acting).rpc('create_sale', {
          p_organization_id: fx.organizationId,
          p_customer_id: null,
          p_payment_method: 'cash',
          p_points_used: 0,
          p_items: [saleLine(fx.productId, 1)],
        }),
        core(ctx.acting).rpc('create_sale', {
          p_organization_id: fx.organizationId,
          p_customer_id: null,
          p_payment_method: 'cash',
          p_points_used: 0,
          p_items: [saleLine(fx.productId, 1)],
        }),
      ]);
      const ok = [a, b].filter((r) => !r.error).length;
      const fail = [a, b].filter((r) => !!r.error).length;
      assert.equal(ok, 1, `expected 1 success got ${ok}`);
      assert.equal(fail, 1, `expected 1 fail got ${fail}`);
      assert.equal(await getInventoryQty(ctx.admin, fx.organizationId, fx.productId), 0);
      mark('concurrent create_sale oversubscription → one wins');
    }

    // ── 5–6. create_sale_return + concurrent return ───────────────
    {
      await core(ctx.admin)
        .from('inventory')
        .update({ quantity: 10 })
        .eq('organization_id', fx.organizationId)
        .eq('product_id', fx.productId)
        .is('variant_id', null);

      const { data: salePayload, error: saleErr } = await core(ctx.acting).rpc('create_sale', {
        p_organization_id: fx.organizationId,
        p_customer_id: null,
        p_payment_method: 'cash',
        p_points_used: 0,
        p_items: [saleLine(fx.productId, 2)],
      });
      assert.ok(!saleErr, saleErr?.message);
      const saleId = String((salePayload as { id: string }).id);
      const { data: saleItems } = await core(ctx.admin)
        .from('sale_items')
        .select('id')
        .eq('sale_id', saleId);
      const saleItemId = String(saleItems![0].id);

      const { data: ret1, error: retErr } = await core(ctx.acting).rpc('create_sale_return', {
        p_organization_id: fx.organizationId,
        p_sale_id: saleId,
        p_reason: 'IT return',
        p_items: [{ sale_item_id: saleItemId, quantity: 1 }],
      });
      assert.ok(!retErr, retErr?.message);
      assert.ok((ret1 as { id?: string })?.id);
      assert.equal(await getInventoryQty(ctx.admin, fx.organizationId, fx.productId), 9);
      mark('create_sale_return happy path');

      const [r1, r2] = await Promise.all([
        core(ctx.acting).rpc('create_sale_return', {
          p_organization_id: fx.organizationId,
          p_sale_id: saleId,
          p_reason: 'IT concurrent A',
          p_items: [{ sale_item_id: saleItemId, quantity: 1 }],
        }),
        core(ctx.acting).rpc('create_sale_return', {
          p_organization_id: fx.organizationId,
          p_sale_id: saleId,
          p_reason: 'IT concurrent B',
          p_items: [{ sale_item_id: saleItemId, quantity: 1 }],
        }),
      ]);
      const rok = [r1, r2].filter((r) => !r.error).length;
      const rfail = [r1, r2].filter((r) => !!r.error).length;
      assert.equal(rok, 1, `return concurrent expected 1 ok got ${rok}`);
      assert.equal(rfail, 1, `return concurrent expected 1 fail got ${rfail}`);
      assert.equal(await getInventoryQty(ctx.admin, fx.organizationId, fx.productId), 10);
      mark('concurrent create_sale_return oversubscription → one wins');
    }

    // ── 7–8. point concurrent redeem / earn ───────────────────────
    {
      await core(ctx.admin).from('point_accounts').delete().eq('customer_id', fx.customerId);
      await core(ctx.admin).from('point_transactions').delete().eq('customer_id', fx.customerId);
      const { error: accErr } = await core(ctx.admin).from('point_accounts').insert({
        organization_id: fx.organizationId,
        customer_id: fx.customerId,
        balance: 100,
      });
      assert.ok(!accErr, accErr?.message);

      const saleA = crypto.randomUUID();
      const saleB = crypto.randomUUID();
      const [p1, p2] = await Promise.all([
        core(ctx.acting).rpc('apply_point_redeem_for_sale', {
          p_organization_id: fx.organizationId,
          p_customer_id: fx.customerId,
          p_sale_id: saleA,
          p_points_to_use: 80,
          p_sale_total_amount: 1000,
        }),
        core(ctx.acting).rpc('apply_point_redeem_for_sale', {
          p_organization_id: fx.organizationId,
          p_customer_id: fx.customerId,
          p_sale_id: saleB,
          p_points_to_use: 80,
          p_sale_total_amount: 1000,
        }),
      ]);
      assert.equal([p1, p2].filter((r) => !r.error).length, 1);
      assert.equal([p1, p2].filter((r) => !!r.error).length, 1);
      const { data: bal1 } = await core(ctx.admin)
        .from('point_accounts')
        .select('balance')
        .eq('customer_id', fx.customerId)
        .single();
      assert.equal(Number(bal1?.balance), 20);
      mark('point concurrent redeem 80+80 on bal100 → one success, bal=20');

      await core(ctx.admin).from('point_transactions').delete().eq('customer_id', fx.customerId);
      await core(ctx.admin)
        .from('point_accounts')
        .update({ balance: 0 })
        .eq('customer_id', fx.customerId);
      const [e1, e2] = await Promise.all([
        core(ctx.acting).rpc('apply_point_earn_for_sale', {
          p_organization_id: fx.organizationId,
          p_customer_id: fx.customerId,
          p_sale_id: crypto.randomUUID(),
          p_points_earned: 100,
          p_earn_rate_percent: 1,
          p_base_amount: 10000,
        }),
        core(ctx.acting).rpc('apply_point_earn_for_sale', {
          p_organization_id: fx.organizationId,
          p_customer_id: fx.customerId,
          p_sale_id: crypto.randomUUID(),
          p_points_earned: 100,
          p_earn_rate_percent: 1,
          p_base_amount: 10000,
        }),
      ]);
      assert.ok(!e1.error && !e2.error, `${e1.error?.message} ${e2.error?.message}`);
      const { data: bal2 } = await core(ctx.admin)
        .from('point_accounts')
        .select('balance')
        .eq('customer_id', fx.customerId)
        .single();
      assert.equal(Number(bal2?.balance), 200);
      mark('point concurrent earn 100+100 → bal=200');
    }

    // ── 9. sale/point failure consistency (insufficient redeem) ───
    {
      await core(ctx.admin)
        .from('inventory')
        .update({ quantity: 10 })
        .eq('organization_id', fx.organizationId)
        .eq('product_id', fx.productId)
        .is('variant_id', null);
      await core(ctx.admin)
        .from('point_accounts')
        .update({ balance: 50 })
        .eq('customer_id', fx.customerId);
      const beforeQty = await getInventoryQty(ctx.admin, fx.organizationId, fx.productId);
      const { data: txBefore } = await core(ctx.admin)
        .from('point_transactions')
        .select('id')
        .eq('customer_id', fx.customerId);
      const txCount = txBefore?.length ?? 0;

      const { error } = await core(ctx.acting).rpc('create_sale', {
        p_organization_id: fx.organizationId,
        p_customer_id: fx.customerId,
        p_payment_method: 'cash',
        p_points_used: 80,
        p_items: [saleLine(fx.productId, 1)],
      });
      assert.ok(error, 'expected redeem failure inside create_sale');
      assert.equal(await getInventoryQty(ctx.admin, fx.organizationId, fx.productId), beforeQty);
      const { data: bal } = await core(ctx.admin)
        .from('point_accounts')
        .select('balance')
        .eq('customer_id', fx.customerId)
        .single();
      assert.equal(Number(bal?.balance), 50);
      const { data: txAfter } = await core(ctx.admin)
        .from('point_transactions')
        .select('id')
        .eq('customer_id', fx.customerId);
      assert.equal(txAfter?.length ?? 0, txCount);
      mark('create_sale + insufficient points → sale/inventory/ledger rollback');
    }

    // ── 10. organization cross-access denial ─────────────────────
    {
      const { data: otherOrgs } = await core(ctx.admin)
        .from('organizations')
        .select('id')
        .neq('id', fx.organizationId)
        .limit(1);
      if (otherOrgs?.[0]?.id) {
        const otherOrg = String(otherOrgs[0].id);
        const { error } = await core(ctx.acting).rpc('create_sale', {
          p_organization_id: otherOrg,
          p_customer_id: null,
          p_payment_method: 'cash',
          p_points_used: 0,
          p_items: [saleLine(fx.productId, 1)],
        });
        assert.ok(error, 'expected cross-org denial');
        // Permission denied OR product mismatch — either is correct denial
        assert.ok(
          /Permission denied|organization_id mismatch|상품/i.test(error.message),
          error.message
        );
        mark('cross-organization create_sale denied');
      } else {
        // product from this org but claim other — skip if only one org
        console.log('  SKIP cross-org (only one organization in project)');
      }

      // inventory RPC: foreign product if second org has a product
      if (otherOrgs?.[0]?.id) {
        const { data: foreignProduct } = await core(ctx.admin)
          .from('products')
          .select('id')
          .eq('organization_id', otherOrgs[0].id)
          .limit(1)
          .maybeSingle();
        if (foreignProduct?.id) {
          const { error } = await core(ctx.acting).rpc('apply_stock_movement', {
            p_organization_id: fx.organizationId,
            p_product_id: foreignProduct.id,
            p_variant_id: null,
            p_movement_type: 'inbound',
            p_quantity: 1,
            p_reference_type: null,
            p_reference_id: null,
            p_reason: null,
          });
          assert.ok(error);
          assert.match(error.message, /mismatch|Permission|상품/i);
          mark('cross-org inventory mutation denied');
        }
      }
    }

    // ── 11. inventory atomic + multi-role helper ─────────────────
    {
      await core(ctx.admin)
        .from('inventory')
        .update({ quantity: 10 })
        .eq('organization_id', fx.organizationId)
        .eq('product_id', fx.productId)
        .is('variant_id', null);
      const { data: inbound, error: inErr } = await core(ctx.acting).rpc('apply_stock_movement', {
        p_organization_id: fx.organizationId,
        p_product_id: fx.productId,
        p_variant_id: null,
        p_movement_type: 'inbound',
        p_quantity: 5,
        p_reference_type: null,
        p_reference_id: null,
        p_reason: 'IT inbound',
      });
      assert.ok(!inErr, inErr?.message);
      assert.equal(Number((inbound as { quantity_after?: number })?.quantity_after), 15);

      const [s1, s2] = await Promise.all([
        core(ctx.acting).rpc('apply_stock_movement', {
          p_organization_id: fx.organizationId,
          p_product_id: fx.productId,
          p_variant_id: null,
          p_movement_type: 'sale',
          p_quantity: 1,
          p_reference_type: 'sale',
          p_reference_id: crypto.randomUUID(),
          p_reason: null,
        }),
        core(ctx.acting).rpc('apply_stock_movement', {
          p_organization_id: fx.organizationId,
          p_product_id: fx.productId,
          p_variant_id: null,
          p_movement_type: 'sale',
          p_quantity: 20,
          p_reference_type: 'sale',
          p_reference_id: crypto.randomUUID(),
          p_reason: null,
        }),
      ]);
      // one may succeed (qty 1), one must fail (20)
      assert.ok([s1, s2].some((r) => !!r.error));
      mark('inventory apply_stock_movement atomic + oversubscription reject');

      const { data: adminOk, error: aErr } = await core(ctx.acting).rpc('is_org_admin', {
        org_id: fx.organizationId,
      });
      assert.ok(!aErr, aErr?.message);
      assert.equal(adminOk, true);

      // owner + instructor multi-role: admin still true, get_org_role=owner
      const { data: inserted } = await core(ctx.admin)
        .from('organization_members')
        .insert({
          organization_id: fx.organizationId,
          user_id: ctx.ownerUserId,
          role: 'instructor',
          is_active: true,
        })
        .select('id')
        .maybeSingle();
      let instrId = inserted?.id ? String(inserted.id) : null;
      if (!instrId) {
        const { data: existing } = await core(ctx.admin)
          .from('organization_members')
          .select('id')
          .eq('organization_id', fx.organizationId)
          .eq('user_id', ctx.ownerUserId)
          .eq('role', 'instructor')
          .maybeSingle();
        instrId = existing?.id ? String(existing.id) : null;
      }
      try {
        const { data: stillAdmin } = await core(ctx.acting).rpc('is_org_admin', {
          org_id: fx.organizationId,
        });
        assert.equal(stillAdmin, true);
        const { data: role } = await core(ctx.acting).rpc('get_org_role', {
          org_id: fx.organizationId,
        });
        assert.equal(role, 'owner');
        const { data: hasInst } = await core(ctx.acting).rpc('has_org_role', {
          org_id: fx.organizationId,
          want_role: 'instructor',
        });
        assert.equal(hasInst, true);
        mark('multi-role owner+instructor authorization deterministic');
      } finally {
        if (inserted?.id) {
          await core(ctx.admin).from('organization_members').delete().eq('id', inserted.id);
        }
      }
    }
  } finally {
    await fx.cleanup();
  }
}

function printReport(mode: 'dry-run' | 'live', reason?: string) {
  console.log('\n=== commerce-db-it report ===');
  console.log(`mode: ${mode}${reason ? ` (${reason})` : ''}`);
  console.log('DB-verified (this run):');
  if (verifiedLive.length === 0) {
    console.log('  (none — dry-run or skipped)');
  } else {
    for (const v of verifiedLive) console.log(`  ✓ ${v}`);
  }
  console.log('Still model/static-only (unit suites, kept):');
  for (const m of modelOnly) console.log(`  · ${m}`);
  console.log('============================\n');
}

const ctx = await resolveDbItContext();
if (ctx.mode === 'dry-run') {
  console.log(`[commerce-db-it] dry-run — ${ctx.reason}`);
  console.log('Would verify:');
  console.log('  create_sale happy / insufficient rollback / duplicate SKU / concurrent sale');
  console.log('  create_sale_return happy / concurrent return');
  console.log('  point concurrent redeem / earn');
  console.log('  sale+point failure consistency');
  console.log('  cross-org denial / inventory atomic / multi-role helpers');
  printReport('dry-run', ctx.reason);
} else {
  await runLive(ctx);
  printReport('live');
}

console.log('commerceDbIntegration.test.ts: ok');
