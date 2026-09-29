/**
 * 판매 재고 합산·부족 판정·원자 RPC 계약·동시성 모델 단위 테스트
 * 실행: npx tsx src/core/sales/createSaleAtomic.test.ts
 *
 * 실제 DB 트랜잭션은 core.create_sale(FOR UPDATE)가 담당.
 * 여기서는 합산/shortfall/rollback·직렬화 계약을 검증한다.
 */
import assert from 'node:assert/strict';
import {
  aggregateSaleStockLines,
  findStockShortfalls,
  saleStockAggKey,
} from '@/capabilities/commerce/stock/saleStockAggregate';
import { mapCreateSaleRpcError } from './mapCreateSaleRpcError';
import type { SaleStockDeductLine } from '@/capabilities/commerce/stock';

function line(
  productId: string,
  quantity: number,
  opts?: { variantId?: string | null; label?: string }
): SaleStockDeductLine {
  return {
    productId,
    variantId: opts?.variantId ?? null,
    quantity,
    label: opts?.label ?? productId,
  };
}

/**
 * create_sale RPC 원자성 모델:
 * shortfall이면 sales/inventory 모두 미반영.
 * 중간 실패(EXCEPTION)면 전체 rollback → saleCreated=false, inventoryChanged=false.
 */
function modelAtomicCreateSale(input: {
  available: number;
  required: number;
  failAfterSaleInsert?: boolean;
}): { saleCreated: boolean; inventoryChanged: boolean; finalStock: number } {
  if (input.available < input.required) {
    return {
      saleCreated: false,
      inventoryChanged: false,
      finalStock: input.available,
    };
  }
  if (input.failAfterSaleInsert) {
    // PL/pgSQL EXCEPTION → 트랜잭션 rollback
    return {
      saleCreated: false,
      inventoryChanged: false,
      finalStock: input.available,
    };
  }
  return {
    saleCreated: true,
    inventoryChanged: true,
    finalStock: input.available - input.required,
  };
}

/**
 * FOR UPDATE 직렬화 가정 하 동시 판매.
 * 재고를 초과하는 요청은 거부되어 음수 재고가 되지 않는다.
 */
function simulateSerializedConcurrentSales(
  initialStock: number,
  requestQuantities: number[]
): { accepted: number[]; rejected: number[]; finalStock: number } {
  let stock = initialStock;
  const accepted: number[] = [];
  const rejected: number[] = [];
  for (const qty of requestQuantities) {
    if (stock >= qty) {
      stock -= qty;
      accepted.push(qty);
    } else {
      rejected.push(qty);
    }
  }
  return { accepted, rejected, finalStock: stock };
}

// ── [판매/재고] Consistency: 판매 전 − 수량 = 판매 후 ─────────────
{
  const lines = [line('p1', 2, { label: '양말' })];
  const available = new Map([[saleStockAggKey('p1', null), 10]]);
  assert.equal(findStockShortfalls(available, lines).length, 0);

  const result = modelAtomicCreateSale({ available: 10, required: 2 });
  assert.equal(result.saleCreated, true);
  assert.equal(result.inventoryChanged, true);
  assert.equal(result.finalStock, 8);
}

// ── [판매/재고] Atomicity: 재고 부족 → 판매·재고 모두 미반영 ──────
{
  const lines = [line('p1', 6, { label: '양말' }), line('p1', 5, { label: '양말' })];
  const available = new Map([[saleStockAggKey('p1', null), 10]]);
  const shortfalls = findStockShortfalls(available, lines);
  assert.equal(shortfalls.length, 1);
  assert.equal(shortfalls[0].required, 11);
  assert.equal(shortfalls[0].available, 10);

  const result = modelAtomicCreateSale({ available: 10, required: 11 });
  assert.equal(result.saleCreated, false);
  assert.equal(result.inventoryChanged, false);
  assert.equal(result.finalStock, 10);
}

// ── 동일 상품 중복 line 합산 ───────────────────────────────────────
{
  const agg = aggregateSaleStockLines([
    line('p1', 3, { label: '운동복' }),
    line('p1', 4, { label: '운동복' }),
  ]);
  assert.equal(agg.length, 1);
  assert.equal(agg[0].quantity, 7);

  const shortfalls = findStockShortfalls(
    new Map([[saleStockAggKey('p1', null), 7]]),
    [line('p1', 3), line('p1', 4)]
  );
  assert.equal(shortfalls.length, 0);

  const over = findStockShortfalls(
    new Map([[saleStockAggKey('p1', null), 6]]),
    [line('p1', 3), line('p1', 4)]
  );
  assert.equal(over.length, 1);
  assert.equal(over[0].required, 7);
}

// ── 옵션(variant)은 별도 SKU ───────────────────────────────────────
{
  const agg = aggregateSaleStockLines([
    line('p1', 2, { variantId: 'v-s', label: '운동복/S' }),
    line('p1', 3, { variantId: 'v-m', label: '운동복/M' }),
    line('p1', 1, { variantId: 'v-s', label: '운동복/S' }),
  ]);
  assert.equal(agg.length, 2);
  const s = agg.find((a) => a.variantId === 'v-s');
  const m = agg.find((a) => a.variantId === 'v-m');
  assert.ok(s && m);
  assert.equal(s.quantity, 3);
  assert.equal(m.quantity, 3);
}

// ── 옵션 재고 부족 ─────────────────────────────────────────────────
{
  const lines = [line('p1', 2, { variantId: 'v1', label: '양말/L' })];
  const available = new Map([
    [saleStockAggKey('p1', null), 100],
    [saleStockAggKey('p1', 'v1'), 1],
  ]);
  const shortfalls = findStockShortfalls(available, lines);
  assert.equal(shortfalls.length, 1);
  assert.equal(shortfalls[0].variantId, 'v1');
  assert.equal(shortfalls[0].available, 1);
  assert.equal(shortfalls[0].required, 2);
}

// ── 재고 행 없음 = 0 → 음수 방지(판매 거부) ────────────────────────
{
  const lines = [line('p1', 1)];
  const shortfalls = findStockShortfalls(new Map(), lines);
  assert.equal(shortfalls.length, 1);
  assert.equal(shortfalls[0].available, 0);
  assert.equal(shortfalls[0].required, 1);
}

// ── 판매 중간 단계 실패 → 전체 rollback ────────────────────────────
{
  const rolled = modelAtomicCreateSale({
    available: 5,
    required: 2,
    failAfterSaleInsert: true,
  });
  assert.equal(rolled.saleCreated, false, 'sales INSERT 이후 실패해도 sale 잔존 금지');
  assert.equal(rolled.inventoryChanged, false, 'inventory 부분 반영 금지');
  assert.equal(rolled.finalStock, 5);
}

// ── [판매/재고] Isolation: 동시 판매 → 음수 재고 금지 ─────────────
{
  const sim = simulateSerializedConcurrentSales(1, [1, 1]);
  assert.deepEqual(sim.accepted, [1]);
  assert.deepEqual(sim.rejected, [1]);
  assert.equal(sim.finalStock, 0);
  assert.ok(sim.finalStock >= 0);
}

// ── 동시 판매: 재고 5에 3+3 → 하나만 성공(합산 초과 방지) ─────────
{
  const sim = simulateSerializedConcurrentSales(5, [3, 3]);
  assert.deepEqual(sim.accepted, [3]);
  assert.deepEqual(sim.rejected, [3]);
  assert.equal(sim.finalStock, 2);
}

// ── 동시 판매: 재고 5에 2+2+1 → 전부 성공 ─────────────────────────
{
  const sim = simulateSerializedConcurrentSales(5, [2, 2, 1]);
  assert.deepEqual(sim.accepted, [2, 2, 1]);
  assert.equal(sim.rejected.length, 0);
  assert.equal(sim.finalStock, 0);
}

// ── RPC 에러 메시지 계약(중간 실패/권한/타조직) ─────────────────────
{
  assert.match(mapCreateSaleRpcError('재고가 부족합니다: 양말(필요 3, 재고 1)'), /재고가 부족/);
  assert.equal(mapCreateSaleRpcError('Permission denied'), '판매 권한이 없습니다.');
  assert.equal(
    mapCreateSaleRpcError('product organization_id mismatch'),
    '다른 사업장의 상품은 판매할 수 없습니다.'
  );
  assert.equal(mapCreateSaleRpcError('Not authenticated'), '로그인이 필요합니다.');
  assert.ok(mapCreateSaleRpcError('재고가 부족합니다').includes('재고가 부족'));
}

console.log('createSaleAtomic.test.ts: ok');
