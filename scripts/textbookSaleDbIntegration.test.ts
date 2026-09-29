/**
 * Piano textbook_sales / textbook_payments — 실제 Supabase DB 통합 테스트
 * 실행: npm run test:textbook-sale-db-it
 *
 * live: MOA_DB_INTEGRATION=1 + allowlist + SERVICE_ROLE + OWNER JWT
 * 게이트 없으면 dry-run(exit 0)
 */
import assert from 'node:assert/strict';
import {
  core,
  getInventoryQty,
  IT_TAG,
  resolveDbItContext,
  saleLine,
  type DbItMode,
} from './dbIntegration/harness';
import type { SupabaseClient } from '@supabase/supabase-js';

type LiveCtx = Extract<DbItMode, { mode: 'live' }>;

function piano(client: SupabaseClient) {
  return client.schema('piano');
}

function mark(name: string) {
  console.log(`  PASS ${name}`);
}

async function runLive(ctx: LiveCtx): Promise<void> {
  console.log(
    `[textbook-sale-db-it] live project=${ctx.projectRef} org=${ctx.organizationId}`
  );

  const stamp = `${IT_TAG}_TB_${Date.now()}`;
  const textbookId = crypto.randomUUID();
  const productId = textbookId;
  const customerId = crypto.randomUUID();
  const paymentId = crypto.randomUUID();
  const pay2Id = crypto.randomUUID();
  let linkedSaleId: string | null = null;

  const cleanup = async () => {
    if (linkedSaleId) {
      await piano(ctx.admin).from('textbook_payments').delete().eq('textbook_sale_id', linkedSaleId);
      await piano(ctx.admin).from('textbook_sales').delete().eq('id', linkedSaleId);
      const { data: returns } = await core(ctx.admin)
        .from('sale_returns')
        .select('id')
        .eq('sale_id', linkedSaleId);
      for (const ret of returns ?? []) {
        await core(ctx.admin).from('sale_return_items').delete().eq('sale_return_id', ret.id);
        await core(ctx.admin).from('stock_movements').delete().eq('reference_id', ret.id);
        await core(ctx.admin).from('sale_returns').delete().eq('id', ret.id);
      }
      await core(ctx.admin).from('stock_movements').delete().eq('reference_id', linkedSaleId);
      await core(ctx.admin).from('sale_items').delete().eq('sale_id', linkedSaleId);
      await core(ctx.admin).from('sales').delete().eq('id', linkedSaleId);
    }
    await piano(ctx.admin).from('textbook_payments').delete().eq('id', paymentId);
    await piano(ctx.admin).from('textbook_payments').delete().eq('id', pay2Id);
    await piano(ctx.admin).from('textbooks').delete().eq('id', textbookId);
    await core(ctx.admin)
      .from('inventory')
      .delete()
      .eq('organization_id', ctx.organizationId)
      .eq('product_id', productId);
    await core(ctx.admin).from('stock_movements').delete().eq('product_id', productId);
    await core(ctx.admin).from('products').delete().eq('id', productId);
    await core(ctx.admin).from('customers').delete().eq('id', customerId);
  };

  try {
    const { error: custErr } = await core(ctx.admin).from('customers').insert({
      id: customerId,
      organization_id: ctx.organizationId,
      name: stamp,
      status: 'active',
    });
    assert.ok(!custErr, custErr?.message);

    const { error: tbErr } = await piano(ctx.admin).from('textbooks').insert({
      id: textbookId,
      organization_id: ctx.organizationId,
      title: stamp,
      publisher: 'IT',
      level: '기초',
      sale_price: 20000,
      cost_price: 10000,
      stock: 5,
      min_stock: 1,
      is_for_sale: true,
      metadata: { productId },
    });
    assert.ok(!tbErr, tbErr?.message);

    const { error: prodErr } = await core(ctx.admin).from('products').insert({
      id: productId,
      organization_id: ctx.organizationId,
      name: stamp,
      price: 20000,
      is_active: true,
    });
    assert.ok(!prodErr, prodErr?.message);

    await core(ctx.admin).from('inventory').insert({
      organization_id: ctx.organizationId,
      product_id: productId,
      variant_id: null,
      quantity: 5,
    });

    // A. Core create_sale → piano.textbook_sales + payment
    const { data: coreSale, error: saleRpcErr } = await core(ctx.acting).rpc('create_sale', {
      p_organization_id: ctx.organizationId,
      p_customer_id: customerId,
      p_payment_method: 'card',
      p_points_used: 0,
      p_items: [saleLine(productId, 1, { unitPrice: 20000, name: stamp })],
    });
    assert.ok(!saleRpcErr, saleRpcErr?.message);
    linkedSaleId = String((coreSale as { id?: string })?.id);
    assert.ok(linkedSaleId);

    const { error: tsErr } = await piano(ctx.acting).from('textbook_sales').insert({
      id: linkedSaleId,
      organization_id: ctx.organizationId,
      customer_id: customerId,
      textbook_id: textbookId,
      sale_date: '2026-09-22',
      quantity: 1,
      unit_price: 20000,
      discount: 0,
      total_amount: 20000,
      paid_amount: 10000,
      status: 'partial',
      payment_method: 'card',
      core_sale_id: linkedSaleId,
      metadata: {
        studentName: stamp,
        textbookTitle: stamp,
        coreSaleId: linkedSaleId,
      },
    });
    assert.ok(!tsErr, tsErr?.message);

    const { error: payErr } = await piano(ctx.acting).from('textbook_payments').insert({
      id: paymentId,
      organization_id: ctx.organizationId,
      textbook_sale_id: linkedSaleId,
      payment_date: '2026-09-22',
      amount: 10000,
      payment_method: 'card',
      memo: 'IT partial',
      metadata: { studentName: stamp, textbookTitle: stamp },
    });
    assert.ok(!payErr, payErr?.message);

    assert.equal(await getInventoryQty(ctx.admin, ctx.organizationId, productId), 4);
    mark('create Core sale + piano.textbook_sales + payment (stock 5→4)');

    {
      const { data: rows } = await piano(ctx.acting)
        .from('textbook_sales')
        .select('id')
        .eq('organization_id', ctx.organizationId)
        .eq('id', linkedSaleId);
      assert.equal(rows?.length, 1);
      mark('org-scoped select finds sale');
    }

    // B. additional payment → paid
    const { error: pay2Err } = await piano(ctx.acting).from('textbook_payments').insert({
      id: pay2Id,
      organization_id: ctx.organizationId,
      textbook_sale_id: linkedSaleId,
      payment_date: '2026-09-22',
      amount: 10000,
      payment_method: 'cash',
      memo: 'IT settle',
    });
    assert.ok(!pay2Err, pay2Err?.message);

    const { error: updErr } = await piano(ctx.acting)
      .from('textbook_sales')
      .update({ paid_amount: 20000, status: 'paid' })
      .eq('organization_id', ctx.organizationId)
      .eq('id', linkedSaleId);
    assert.ok(!updErr, updErr?.message);

    const { data: paidRow } = await piano(ctx.admin)
      .from('textbook_sales')
      .select('paid_amount, status')
      .eq('id', linkedSaleId)
      .single();
    assert.equal(Number(paidRow?.paid_amount), 20000);
    assert.equal(paidRow?.status, 'paid');
    mark('additional payment → paid_amount/status');

    // C. cancel: Core return + delete textbook sale (payments CASCADE)
    const { data: saleItems } = await core(ctx.admin)
      .from('sale_items')
      .select('id, quantity')
      .eq('sale_id', linkedSaleId);
    assert.ok(saleItems && saleItems.length > 0);

    const { error: retErr } = await core(ctx.acting).rpc('create_sale_return', {
      p_organization_id: ctx.organizationId,
      p_sale_id: linkedSaleId,
      p_reason: 'IT textbook cancel',
      p_items: (saleItems || []).map((it) => ({
        sale_item_id: it.id,
        quantity: Number(it.quantity),
      })),
    });
    assert.ok(!retErr, retErr?.message);

    const { error: delErr } = await piano(ctx.acting)
      .from('textbook_sales')
      .delete()
      .eq('organization_id', ctx.organizationId)
      .eq('id', linkedSaleId);
    assert.ok(!delErr, delErr?.message);

    const { data: gone } = await piano(ctx.admin)
      .from('textbook_sales')
      .select('id')
      .eq('id', linkedSaleId)
      .maybeSingle();
    assert.equal(gone, null);

    const { data: paysGone } = await piano(ctx.admin)
      .from('textbook_payments')
      .select('id')
      .eq('textbook_sale_id', linkedSaleId);
    assert.equal((paysGone || []).length, 0);

    assert.equal(await getInventoryQty(ctx.admin, ctx.organizationId, productId), 5);
    mark('cancel: Core return + textbook_sale delete (CASCADE payments, stock restored)');

    await cleanup();
  } catch (err) {
    await cleanup().catch(() => undefined);
    throw err;
  }
}

async function main() {
  const ctx = await resolveDbItContext();
  if (ctx.mode === 'dry-run') {
    console.log(`[textbook-sale-db-it] dry-run: ${ctx.reason}`);
    process.exit(0);
  }
  await runLive(ctx);
  console.log('[textbook-sale-db-it] all live checks passed');
}

main().catch((err) => {
  console.error('[textbook-sale-db-it] FAIL', err);
  process.exit(1);
});
