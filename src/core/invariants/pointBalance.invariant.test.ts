/**
 * [포인트] 적립·반품·멱등 — 최종 잔액 불변식
 * 실행: npm run test:point-balance-invariant
 *
 * Invariant:
 *   - 판매 적립 → 잔액 증가
 *   - 반품 → 해당 적립이 정확히 clawback
 *   - 동일 sale 중복 적립 → 잔액 1회만
 *
 * DB RPC 실측: test:point-atomic / test:sale-return-points
 * 여기는 ledger 최종 balance만 검사.
 */
import assert from 'node:assert/strict';
import { computeEarnPoints } from '@/capabilities/commerce/loyalty/earnPolicy';
import { planSaleReturnPointAdjustments } from '@/capabilities/commerce/loyalty/saleReturnPointPlan';

type Ledger = {
  balance: number;
  earnedBySale: Map<string, number>;
  clawedByReturn: Map<string, number>;
};

function emptyLedger(balance = 0): Ledger {
  return { balance, earnedBySale: new Map(), clawedByReturn: new Map() };
}

/** Idempotency: 동일 saleId 적립은 1회만 */
function applyEarn(
  ledger: Ledger,
  saleId: string,
  eligibleWon: number,
  ratePercent: number
): Ledger {
  if (ledger.earnedBySale.has(saleId)) {
    return ledger;
  }
  const points = computeEarnPoints(eligibleWon, ratePercent);
  if (points <= 0) return ledger;
  const next = {
    balance: ledger.balance + points,
    earnedBySale: new Map(ledger.earnedBySale),
    clawedByReturn: new Map(ledger.clawedByReturn),
  };
  next.earnedBySale.set(saleId, points);
  return next;
}

/** Consistency: 반품 clawback은 원 적립을 초과하지 않음 */
function applyReturnClawback(
  ledger: Ledger,
  params: {
    saleId: string;
    returnId: string;
    saleTotalAmount: number;
    thisReturnAmount: number;
    priorReturnedAmount: number;
  }
): Ledger {
  const clawKey = `${params.saleId}#${params.returnId}`;
  if (ledger.clawedByReturn.has(clawKey)) {
    return ledger;
  }
  const earned = ledger.earnedBySale.get(params.saleId) ?? 0;
  let priorEarnClawed = 0;
  for (const [rid, pts] of ledger.clawedByReturn) {
    if (rid.startsWith(`${params.saleId}#`)) priorEarnClawed += pts;
  }

  const plan = planSaleReturnPointAdjustments({
    saleTotalAmount: params.saleTotalAmount,
    pointsEarned: earned,
    pointsRedeemed: 0,
    thisReturnAmount: params.thisReturnAmount,
    priorReturnedAmount: params.priorReturnedAmount,
    priorEarnClawed,
    priorRedeemRestored: 0,
  });

  const next = {
    balance: ledger.balance - plan.earnClawback,
    earnedBySale: new Map(ledger.earnedBySale),
    clawedByReturn: new Map(ledger.clawedByReturn),
  };
  next.clawedByReturn.set(clawKey, plan.earnClawback);
  return next;
}

// ── 판매 적립 → 포인트 증가 ───────────────────────────────────────
{
  let ledger = emptyLedger(0);
  ledger = applyEarn(ledger, 'sale-1', 10000, 1);
  assert.equal(ledger.balance, 100);
  assert.equal(ledger.earnedBySale.get('sale-1'), 100);
}

// ── Idempotency: 동일 판매 중복 적립 → 추가 증가 없음 ─────────────
{
  let ledger = emptyLedger(0);
  ledger = applyEarn(ledger, 'sale-1', 10000, 1);
  ledger = applyEarn(ledger, 'sale-1', 10000, 1);
  ledger = applyEarn(ledger, 'sale-1', 10000, 1);
  assert.equal(ledger.balance, 100);
  assert.equal(ledger.earnedBySale.size, 1);
}

// ── Consistency: 전량 반품 → 적립 정확히 복구(잔액 0) ─────────────
{
  let ledger = emptyLedger(0);
  ledger = applyEarn(ledger, 'sale-1', 10000, 1);
  assert.equal(ledger.balance, 100);
  ledger = applyReturnClawback(ledger, {
    saleId: 'sale-1',
    returnId: 'ret-1',
    saleTotalAmount: 10000,
    thisReturnAmount: 10000,
    priorReturnedAmount: 0,
  });
  assert.equal(ledger.balance, 0);
}

// ── Idempotency: 동일 반품 재처리 → 이중 clawback 없음 ────────────
{
  let ledger = emptyLedger(0);
  ledger = applyEarn(ledger, 'sale-1', 10000, 1);
  ledger = applyReturnClawback(ledger, {
    saleId: 'sale-1',
    returnId: 'ret-1',
    saleTotalAmount: 10000,
    thisReturnAmount: 10000,
    priorReturnedAmount: 0,
  });
  const mid = ledger.balance;
  ledger = applyReturnClawback(ledger, {
    saleId: 'sale-1',
    returnId: 'ret-1',
    saleTotalAmount: 10000,
    thisReturnAmount: 10000,
    priorReturnedAmount: 10000,
  });
  assert.equal(ledger.balance, mid);
  assert.equal(ledger.balance, 0);
}

// ── Isolation: 다른 판매 적립은 반품에 영향 없음 ──────────────────
{
  let ledger = emptyLedger(0);
  ledger = applyEarn(ledger, 'sale-a', 10000, 1);
  ledger = applyEarn(ledger, 'sale-b', 20000, 1);
  assert.equal(ledger.balance, 300);
  ledger = applyReturnClawback(ledger, {
    saleId: 'sale-a',
    returnId: 'ret-a',
    saleTotalAmount: 10000,
    thisReturnAmount: 10000,
    priorReturnedAmount: 0,
  });
  assert.equal(ledger.balance, 200);
  assert.equal(ledger.earnedBySale.get('sale-b'), 200);
}

console.log('pointBalance.invariant.test.ts: ok');
