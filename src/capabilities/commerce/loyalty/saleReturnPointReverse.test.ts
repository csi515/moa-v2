/**
 * 판매 반품 포인트 비례·Finance 반전 단위 테스트
 * 실행: npx tsx src/core/loyalty/saleReturnPointReverse.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  allocateReturnPointSlice,
  planSaleReturnPointAdjustments,
} from './saleReturnPointPlan';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

type IncomeStub = {
  id: string;
  sourceType: 'retail';
  sourceId: string;
  amount: number;
  memo?: string;
};

/** recordRetailSaleReturnIncomeReversal 계약 재현 (storage/supabase 의존 없음) */
function applyRetailReturnIncomeReversal(
  entries: IncomeStub[],
  params: { saleId: string; returnId: string; amount: number }
): IncomeStub[] {
  const amount = Math.abs(params.amount);
  if (!params.returnId || !params.saleId || amount <= 0) return entries;
  if (entries.some((e) => e.sourceType === 'retail' && e.sourceId === params.returnId)) {
    return entries;
  }
  return [
    {
      id: `inc-${params.returnId}`,
      sourceType: 'retail',
      sourceId: params.returnId,
      amount: -amount,
      memo: `saleId=${params.saleId};returnId=${params.returnId}`,
    },
    ...entries,
  ];
}

// ── 전량 반품: 적립만 ────────────────────────────────────────────
{
  const plan = planSaleReturnPointAdjustments({
    saleTotalAmount: 10000,
    pointsEarned: 100,
    pointsRedeemed: 0,
    thisReturnAmount: 10000,
    priorReturnedAmount: 0,
    priorEarnClawed: 0,
    priorRedeemRestored: 0,
  });
  assert.equal(plan.earnClawback, 100);
  assert.equal(plan.redeemRestore, 0);
}

// ── 전량 반품: 사용만 ────────────────────────────────────────────
{
  const plan = planSaleReturnPointAdjustments({
    saleTotalAmount: 10000,
    pointsEarned: 0,
    pointsRedeemed: 2000,
    thisReturnAmount: 10000,
    priorReturnedAmount: 0,
    priorEarnClawed: 0,
    priorRedeemRestored: 0,
  });
  assert.equal(plan.earnClawback, 0);
  assert.equal(plan.redeemRestore, 2000);
}

// ── 전량 반품: 적립+사용 ─────────────────────────────────────────
{
  const plan = planSaleReturnPointAdjustments({
    saleTotalAmount: 10000,
    pointsEarned: 80,
    pointsRedeemed: 1000,
    thisReturnAmount: 10000,
    priorReturnedAmount: 0,
    priorEarnClawed: 0,
    priorRedeemRestored: 0,
  });
  assert.equal(plan.earnClawback, 80);
  assert.equal(plan.redeemRestore, 1000);
}

// ── 포인트 미사용·미적립 ─────────────────────────────────────────
{
  const plan = planSaleReturnPointAdjustments({
    saleTotalAmount: 5000,
    pointsEarned: 0,
    pointsRedeemed: 0,
    thisReturnAmount: 5000,
    priorReturnedAmount: 0,
    priorEarnClawed: 0,
    priorRedeemRestored: 0,
  });
  assert.equal(plan.earnClawback, 0);
  assert.equal(plan.redeemRestore, 0);
}

// ── 부분 반품 비례 + 잔여 흡수 ───────────────────────────────────
{
  const earned = 100;
  const saleTotal = 10000;
  const first = allocateReturnPointSlice({
    originalPoints: earned,
    saleTotalAmount: saleTotal,
    priorReturnedAmount: 0,
    thisReturnAmount: 3000,
    priorAllocatedPoints: 0,
  });
  assert.equal(first, 30);

  const second = allocateReturnPointSlice({
    originalPoints: earned,
    saleTotalAmount: saleTotal,
    priorReturnedAmount: 3000,
    thisReturnAmount: 7000,
    priorAllocatedPoints: first,
  });
  assert.equal(second, 70);
  assert.equal(first + second, 100);
}

// ── 반품 재실행(이미 배분됨) → 0 ─────────────────────────────────
{
  const again = allocateReturnPointSlice({
    originalPoints: 100,
    saleTotalAmount: 10000,
    priorReturnedAmount: 10000,
    thisReturnAmount: 10000,
    priorAllocatedPoints: 100,
  });
  assert.equal(again, 0);
}

// ── organization 스냅샷 분리 ─────────────────────────────────────
{
  const planA = planSaleReturnPointAdjustments({
    saleTotalAmount: 1000,
    pointsEarned: 10,
    pointsRedeemed: 0,
    thisReturnAmount: 1000,
    priorReturnedAmount: 0,
    priorEarnClawed: 0,
    priorRedeemRestored: 0,
  });
  const planB = planSaleReturnPointAdjustments({
    saleTotalAmount: 2000,
    pointsEarned: 50,
    pointsRedeemed: 100,
    thisReturnAmount: 2000,
    priorReturnedAmount: 0,
    priorEarnClawed: 0,
    priorRedeemRestored: 0,
  });
  assert.equal(planA.earnClawback, 10);
  assert.equal(planB.earnClawback, 50);
  assert.equal(planB.redeemRestore, 100);
}

// ── Skin Finance: 판매 income 유지 + 반품 reversal + idempotent ──
{
  const saleId = 'sale-skin-1';
  const returnId = 'return-skin-1';
  let entries: IncomeStub[] = [
    {
      id: 'inc-sale-1',
      sourceType: 'retail',
      sourceId: saleId,
      amount: 30000,
    },
  ];

  entries = applyRetailReturnIncomeReversal(entries, {
    saleId,
    returnId,
    amount: 30000,
  });
  assert.equal(entries.find((e) => e.sourceId === saleId)?.amount, 30000);
  assert.equal(entries.find((e) => e.sourceId === returnId)?.amount, -30000);

  const beforeLen = entries.length;
  entries = applyRetailReturnIncomeReversal(entries, {
    saleId,
    returnId,
    amount: 30000,
  });
  assert.equal(entries.length, beforeLen);
  assert.equal(
    entries.filter((e) => e.sourceId === returnId).length,
    1
  );
  assert.equal(
    entries.filter((e) => e.sourceType === 'retail').reduce((s, e) => s + e.amount, 0),
    0
  );
}

// ── Retail: 포인트 plan만 (Finance IncomeEntry 강제 없음) ────────
{
  const plan = planSaleReturnPointAdjustments({
    saleTotalAmount: 8000,
    pointsEarned: 40,
    pointsRedeemed: 500,
    thisReturnAmount: 8000,
    priorReturnedAmount: 0,
    priorEarnClawed: 0,
    priorRedeemRestored: 0,
  });
  assert.equal(plan.earnClawback, 40);
  assert.equal(plan.redeemRestore, 500);
}

/**
 * returnId별 adjust 부호 독립 멱등 (DB unique 인덱스 계약 재현).
 * earn만 성공 → 재호출 시 redeem만 추가.
 */
function simulateReturnAdjustRecovery(params: {
  returnId: string;
  plan: { earnClawback: number; redeemRestore: number };
  /** 이미 ledger에 있는 adjust (부호로 구분) */
  existing: Array<{ returnId: string; amount: number }>;
}): { applied: number[]; skipped: string[] } {
  const applied: number[] = [];
  const skipped: string[] = [];
  const hasNeg = params.existing.some(
    (e) => e.returnId === params.returnId && e.amount < 0
  );
  const hasPos = params.existing.some(
    (e) => e.returnId === params.returnId && e.amount > 0
  );

  if (params.plan.redeemRestore > 0) {
    if (hasPos) skipped.push('redeem');
    else applied.push(params.plan.redeemRestore);
  }
  if (params.plan.earnClawback > 0) {
    if (hasNeg) skipped.push('earn');
    else applied.push(-params.plan.earnClawback);
  }
  return { applied, skipped };
}

// ── 복구: earn만 성공 후 재호출 → redeem만 ────────────────────────────────
{
  const plan = planSaleReturnPointAdjustments({
    saleTotalAmount: 10000,
    pointsEarned: 80,
    pointsRedeemed: 1000,
    thisReturnAmount: 10000,
    priorReturnedAmount: 0,
    priorEarnClawed: 0,
    priorRedeemRestored: 0,
  });
  const mid = simulateReturnAdjustRecovery({
    returnId: 'ret-1',
    plan,
    existing: [{ returnId: 'ret-1', amount: -80 }],
  });
  assert.deepEqual(mid.applied, [1000]);
  assert.deepEqual(mid.skipped, ['earn']);

  const done = simulateReturnAdjustRecovery({
    returnId: 'ret-1',
    plan,
    existing: [
      { returnId: 'ret-1', amount: -80 },
      { returnId: 'ret-1', amount: 1000 },
    ],
  });
  assert.deepEqual(done.applied, []);
  assert.deepEqual(done.skipped, ['redeem', 'earn']);
}

// ── 복구: redeem만 성공 후 재호출 → earn만 ────────────────────────────────
{
  const plan = planSaleReturnPointAdjustments({
    saleTotalAmount: 10000,
    pointsEarned: 80,
    pointsRedeemed: 1000,
    thisReturnAmount: 10000,
    priorReturnedAmount: 0,
    priorEarnClawed: 0,
    priorRedeemRestored: 0,
  });
  const mid = simulateReturnAdjustRecovery({
    returnId: 'ret-2',
    plan,
    existing: [{ returnId: 'ret-2', amount: 1000 }],
  });
  assert.deepEqual(mid.applied, [-80]);
  assert.deepEqual(mid.skipped, ['redeem']);
}

// ── 부분 반품 2회: prior 배분 반영 ─────────────────────────────────────────
{
  const first = planSaleReturnPointAdjustments({
    saleTotalAmount: 10000,
    pointsEarned: 100,
    pointsRedeemed: 0,
    thisReturnAmount: 3000,
    priorReturnedAmount: 0,
    priorEarnClawed: 0,
    priorRedeemRestored: 0,
  });
  assert.equal(first.earnClawback, 30);

  const second = planSaleReturnPointAdjustments({
    saleTotalAmount: 10000,
    pointsEarned: 100,
    pointsRedeemed: 0,
    thisReturnAmount: 7000,
    priorReturnedAmount: 3000,
    priorEarnClawed: 30,
    priorRedeemRestored: 0,
  });
  assert.equal(second.earnClawback, 70);
}

// ── Retail createReturn: 포인트 실패해도 반품 본문 유지 (소스 계약) ───────
{
  const retail = readFileSync(
    join(repoRoot, 'src/industries/retail/services/saleReturnService.ts'),
    'utf8'
  );
  assert.match(retail, /return kept/);
  assert.match(retail, /listReturnsForSale/);
  assert.match(retail, /reverseForSaleReturn/);
  assert.doesNotMatch(
    retail,
    /throw new Error\(\s*`반품은 완료되었으나/
  );
}

console.log('saleReturnPointReverse.test.ts: ok');
console.log(
  JSON.stringify(
    {
      retailFlow: {
        sale: { earn: '+80P', redeem: '-1000P' },
        fullReturn: { earnClawback: '-80P adjust', redeemRestore: '+1000P adjust' },
        recovery: 'partial adjust → retry remaining sign only',
      },
      skinFlow: {
        saleIncome: { sourceId: 'saleId', amount: 30000 },
        returnReversal: { sourceId: 'returnId', amount: -30000 },
        originalPreserved: true,
      },
    },
    null,
    2
  )
);
