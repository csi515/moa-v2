/**
 * 반품 합산·수량 검증·금액·원자 RPC 계약·동시성 모델 단위 테스트
 * 실행: npx tsx src/core/sales/createSaleReturnAtomic.test.ts
 *
 * 실제 DB 트랜잭션은 core.create_sale_return(sales/sale_items FOR UPDATE)가 담당.
 * 부분 반품 금액은 computeReturnLineAmount ≡ core.compute_return_line_amount.
 */
import assert from 'node:assert/strict';
import { computeReturnLineAmount } from './types';
import {
  aggregateReturnRequestLines,
  assertReturnQuantitiesAllowed,
  computeReturnTotalAmount,
  mapCreateSaleReturnRpcError,
} from './saleReturnPlan';

/**
 * create_sale_return 원자성 모델:
 * 초과 반품·중간 실패 시 return 문서/inventory 모두 미반영.
 */
function modelAtomicCreateReturn(input: {
  soldQty: number;
  alreadyReturned: number;
  requestQty: number;
  failAfterReturnInsert?: boolean;
}): {
  returnCreated: boolean;
  inventoryRestored: boolean;
  returnedAfter: number;
} {
  const remaining = Math.max(0, input.soldQty - input.alreadyReturned);
  if (input.requestQty > remaining) {
    return {
      returnCreated: false,
      inventoryRestored: false,
      returnedAfter: input.alreadyReturned,
    };
  }
  if (input.failAfterReturnInsert) {
    return {
      returnCreated: false,
      inventoryRestored: false,
      returnedAfter: input.alreadyReturned,
    };
  }
  return {
    returnCreated: true,
    inventoryRestored: true,
    returnedAfter: input.alreadyReturned + input.requestQty,
  };
}

/**
 * FOR UPDATE 직렬화 가정 하 동시 반품.
 * soldQty를 넘는 누적 반품은 거부된다.
 */
function simulateSerializedConcurrentReturns(
  soldQty: number,
  requestQuantities: number[]
): { accepted: number[]; rejected: number[]; totalReturned: number } {
  let returned = 0;
  const accepted: number[] = [];
  const rejected: number[] = [];
  for (const qty of requestQuantities) {
    if (returned + qty <= soldQty) {
      returned += qty;
      accepted.push(qty);
    } else {
      rejected.push(qty);
    }
  }
  return { accepted, rejected, totalReturned: returned };
}

/** 부분 반품을 순차 적용한 금액 합계 */
function sumSequentialReturns(
  soldQty: number,
  unitPrice: number,
  discountAmount: number,
  chunks: number[]
): { parts: number[]; total: number; original: number } {
  const original = Math.max(0, soldQty * unitPrice - discountAmount);
  let already = 0;
  const parts: number[] = [];
  for (const qty of chunks) {
    const amt = computeReturnLineAmount({
      returnQty: qty,
      soldQty,
      unitPrice,
      discountAmount,
      alreadyReturned: already,
    });
    parts.push(amt);
    already += qty;
  }
  return {
    parts,
    total: parts.reduce((s, n) => s + n, 0),
    original,
  };
}

/** PostgreSQL FLOOR 누적 배분과 동일 식 (검증용 인라인) */
function sqlStyleReturnLineAmount(
  returnQty: number,
  soldQty: number,
  unitPrice: number,
  discountAmount: number,
  alreadyReturned: number
): number {
  const vReturn = Math.max(0, returnQty);
  const vSold = Math.max(0, soldQty);
  const vAlready = Math.max(0, alreadyReturned);
  if (vReturn <= 0 || vSold <= 0) return 0;
  const vOrig = Math.max(0, vSold * Math.max(0, unitPrice) - Math.max(0, discountAmount));
  const alloc = (qty: number) => {
    if (qty <= 0) return 0;
    if (qty >= vSold) return vOrig;
    return Math.floor((vOrig * qty) / vSold);
  };
  return Math.max(0, alloc(vAlready + vReturn) - alloc(vAlready));
}

// ── 전액 반품 ─────────────────────────────────────────────────────
{
  const amount = computeReturnLineAmount({
    returnQty: 2,
    soldQty: 2,
    unitPrice: 10000,
    discountAmount: 2000,
  });
  assert.equal(amount, 18000);

  const full = modelAtomicCreateReturn({
    soldQty: 5,
    alreadyReturned: 0,
    requestQty: 5,
  });
  assert.equal(full.returnCreated, true);
  assert.equal(full.inventoryRestored, true);
  assert.equal(full.returnedAfter, 5);
}

// ── 부분 반품 ─────────────────────────────────────────────────────
{
  const amount = computeReturnLineAmount({
    returnQty: 1,
    soldQty: 2,
    unitPrice: 10000,
    discountAmount: 2000,
  });
  assert.equal(amount, 9000);

  assert.doesNotThrow(() =>
    assertReturnQuantitiesAllowed([
      {
        saleItemId: 'si-1',
        productNameSnapshot: '양말',
        soldQuantity: 5,
        alreadyReturned: 0,
        requestQuantity: 2,
      },
    ])
  );

  const partial = modelAtomicCreateReturn({
    soldQty: 5,
    alreadyReturned: 0,
    requestQty: 2,
  });
  assert.equal(partial.returnedAfter, 2);
}

// ── 3개×10,000원 할인 1원 — 1개씩 세 번 ─────────────────────────
{
  const seq = sumSequentialReturns(3, 10000, 1, [1, 1, 1]);
  assert.equal(seq.original, 29999);
  assert.equal(seq.total, 29999);
  assert.deepEqual(seq.parts, [9999, 10000, 10000]);
}

// ── 7개 중 2+2+3 반품 (할인 1원) ─────────────────────────────────
{
  const seq = sumSequentialReturns(7, 10000, 1, [2, 2, 3]);
  assert.equal(seq.original, 69999);
  assert.equal(seq.total, 69999);
}

// ── 할인액이 soldQty로 나누어지지 않는 값 ─────────────────────────
{
  const seq = sumSequentialReturns(3, 1000, 100, [1, 1, 1]);
  assert.equal(seq.original, 2900);
  assert.equal(seq.total, 2900);

  const seq2 = sumSequentialReturns(5, 7777, 3, [1, 1, 1, 1, 1]);
  assert.equal(seq2.total, seq2.original);
}

// ── 전량 반품 한 번 ───────────────────────────────────────────────
{
  const once = computeReturnLineAmount({
    returnQty: 3,
    soldQty: 3,
    unitPrice: 10000,
    discountAmount: 1,
  });
  assert.equal(once, 29999);
}

// ── 부분 반품 후 마지막 전량 반품 ─────────────────────────────────
{
  const first = computeReturnLineAmount({
    returnQty: 1,
    soldQty: 3,
    unitPrice: 10000,
    discountAmount: 1,
    alreadyReturned: 0,
  });
  const rest = computeReturnLineAmount({
    returnQty: 2,
    soldQty: 3,
    unitPrice: 10000,
    discountAmount: 1,
    alreadyReturned: 1,
  });
  assert.equal(first + rest, 29999);
}

// ── TS ≡ SQL 스타일 식 ───────────────────────────────────────────
{
  const cases: Array<{
    returnQty: number;
    soldQty: number;
    unitPrice: number;
    discountAmount: number;
    alreadyReturned: number;
  }> = [
    { returnQty: 1, soldQty: 3, unitPrice: 10000, discountAmount: 1, alreadyReturned: 0 },
    { returnQty: 1, soldQty: 3, unitPrice: 10000, discountAmount: 1, alreadyReturned: 1 },
    { returnQty: 1, soldQty: 3, unitPrice: 10000, discountAmount: 1, alreadyReturned: 2 },
    { returnQty: 2, soldQty: 7, unitPrice: 10000, discountAmount: 1, alreadyReturned: 0 },
    { returnQty: 2, soldQty: 7, unitPrice: 10000, discountAmount: 1, alreadyReturned: 2 },
    { returnQty: 3, soldQty: 7, unitPrice: 10000, discountAmount: 1, alreadyReturned: 4 },
    { returnQty: 3, soldQty: 3, unitPrice: 10000, discountAmount: 1, alreadyReturned: 0 },
    { returnQty: 2, soldQty: 5, unitPrice: 7777, discountAmount: 3, alreadyReturned: 1 },
  ];
  for (const c of cases) {
    assert.equal(
      computeReturnLineAmount(c),
      sqlStyleReturnLineAmount(
        c.returnQty,
        c.soldQty,
        c.unitPrice,
        c.discountAmount,
        c.alreadyReturned
      ),
      JSON.stringify(c)
    );
  }
}

// ── 부분 반품 2회 ─────────────────────────────────────────────────
{
  const first = modelAtomicCreateReturn({
    soldQty: 5,
    alreadyReturned: 0,
    requestQty: 2,
  });
  assert.equal(first.returnedAfter, 2);

  const second = modelAtomicCreateReturn({
    soldQty: 5,
    alreadyReturned: first.returnedAfter,
    requestQty: 3,
  });
  assert.equal(second.returnCreated, true);
  assert.equal(second.returnedAfter, 5);

  assert.doesNotThrow(() =>
    assertReturnQuantitiesAllowed([
      {
        saleItemId: 'si-1',
        productNameSnapshot: '양말',
        soldQuantity: 5,
        alreadyReturned: 2,
        requestQuantity: 3,
      },
    ])
  );
}

// ── 초과 반품 거부 ─────────────────────────────────────────────────
{
  assert.throws(
    () =>
      assertReturnQuantitiesAllowed([
        {
          saleItemId: 'si-1',
          productNameSnapshot: '양말',
          soldQuantity: 5,
          alreadyReturned: 5,
          requestQuantity: 1,
        },
      ]),
    /반품 가능 수량은 0개/
  );

  assert.throws(
    () =>
      assertReturnQuantitiesAllowed([
        {
          saleItemId: 'si-1',
          productNameSnapshot: '양말',
          soldQuantity: 5,
          alreadyReturned: 2,
          requestQuantity: 4,
        },
      ]),
    /반품 가능 수량은 3개/
  );

  const over = modelAtomicCreateReturn({
    soldQty: 5,
    alreadyReturned: 2,
    requestQty: 4,
  });
  assert.equal(over.returnCreated, false);
  assert.equal(over.inventoryRestored, false);
  assert.equal(over.returnedAfter, 2);
}

// ── [재고 Consistency] 판매 전 − 판매 수량 + 반품 = 최종 재고 ─────
{
  const stockBefore = 10;
  const soldQty = 3;
  const afterSale = stockBefore - soldQty;
  assert.equal(afterSale, 7);

  const ret = modelAtomicCreateReturn({
    soldQty,
    alreadyReturned: 0,
    requestQty: 3,
  });
  assert.equal(ret.returnCreated, true);
  assert.equal(ret.inventoryRestored, true);
  const afterReturn = afterSale + (ret.returnedAfter - 0);
  assert.equal(afterReturn, stockBefore);

  // Idempotency: 동일 전량 반품 재요청 → 추가 복구 없음
  const dup = modelAtomicCreateReturn({
    soldQty,
    alreadyReturned: ret.returnedAfter,
    requestQty: 3,
  });
  assert.equal(dup.returnCreated, false);
  assert.equal(dup.inventoryRestored, false);
  assert.equal(dup.returnedAfter, 3);
}

// ── 동일 상품 여러 line(합산) ──────────────────────────────────────
{
  const agg = aggregateReturnRequestLines([
    { saleItemId: 'si-1', quantity: 2 },
    { saleItemId: 'si-1', quantity: 3 },
    { saleItemId: 'si-2', quantity: 1 },
  ]);
  assert.equal(agg.length, 2);
  assert.equal(agg.find((x) => x.saleItemId === 'si-1')?.quantity, 5);
  assert.equal(agg.find((x) => x.saleItemId === 'si-2')?.quantity, 1);

  assert.throws(
    () =>
      assertReturnQuantitiesAllowed([
        {
          saleItemId: 'si-1',
          productNameSnapshot: '양말',
          soldQuantity: 5,
          alreadyReturned: 0,
          requestQuantity: aggregateReturnRequestLines([
            { saleItemId: 'si-1', quantity: 3 },
            { saleItemId: 'si-1', quantity: 3 },
          ])[0].quantity,
        },
      ]),
    /반품 가능 수량은 5개/
  );

  assert.equal(
    computeReturnTotalAmount([
      { returnQty: 1, soldQty: 2, unitPrice: 1000, discountAmount: 0 },
      { returnQty: 1, soldQty: 1, unitPrice: 500, discountAmount: 0 },
    ]),
    1500
  );
}

// ── 실패 rollback (문서/재고 부분 반영 금지) ───────────────────────
{
  const rolled = modelAtomicCreateReturn({
    soldQty: 5,
    alreadyReturned: 0,
    requestQty: 2,
    failAfterReturnInsert: true,
  });
  assert.equal(rolled.returnCreated, false);
  assert.equal(rolled.inventoryRestored, false);
  assert.equal(rolled.returnedAfter, 0);
}

// ── 동시 반품 초과 방지 ───────────────────────────────────────────
{
  const sim = simulateSerializedConcurrentReturns(1, [1, 1]);
  assert.deepEqual(sim.accepted, [1]);
  assert.deepEqual(sim.rejected, [1]);
  assert.equal(sim.totalReturned, 1);

  const sim2 = simulateSerializedConcurrentReturns(5, [3, 3]);
  assert.deepEqual(sim2.accepted, [3]);
  assert.deepEqual(sim2.rejected, [3]);
  assert.equal(sim2.totalReturned, 3);

  const sim3 = simulateSerializedConcurrentReturns(5, [2, 2, 1]);
  assert.deepEqual(sim3.accepted, [2, 2, 1]);
  assert.equal(sim3.totalReturned, 5);
}

// ── 권한/교차 org / rollback 메시지 계약 ──────────────────────────
{
  assert.equal(mapCreateSaleReturnRpcError('Permission denied'), '반품 권한이 없습니다.');
  assert.equal(mapCreateSaleReturnRpcError('Not authenticated'), '로그인이 필요합니다.');
  assert.match(
    mapCreateSaleReturnRpcError('"양말" 반품 가능 수량은 0개입니다.'),
    /반품 가능 수량/
  );
  assert.equal(
    mapCreateSaleReturnRpcError('판매 내역을 찾을 수 없습니다.'),
    '판매 내역을 찾을 수 없습니다.'
  );
}

console.log('createSaleReturnAtomic.test.ts: ok');
