import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface AuditItem {
  productId: string;
  variantId: string | null;
  productName: string;
  systemQty: number;
  countedQty: number;
  isCounted: boolean;
}

export function computeStocktakeStats(items: AuditItem[]) {
  let countedCount = 0;
  let diffCount = 0;
  let totalLoss = 0;
  let totalSurplus = 0;

  for (const item of items) {
    if (item.isCounted) {
      countedCount += 1;
      const diff = item.countedQty - item.systemQty;
      if (diff < 0) {
        diffCount += 1;
        totalLoss += Math.abs(diff);
      } else if (diff > 0) {
        diffCount += 1;
        totalSurplus += diff;
      }
    }
  }

  return { countedCount, diffCount, totalLoss, totalSurplus };
}

export function buildStocktakeAdjustments(items: AuditItem[]) {
  return items
    .filter((item) => item.isCounted && item.countedQty !== item.systemQty)
    .map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      delta: item.countedQty - item.systemQty, // 조정 수량 (+ 또는 -)
    }));
}

describe('Retail 재고 실사 (Stocktake Audit) 오차 산출 엔진', () => {
  const dummyItems: AuditItem[] = [
    {
      productId: 'p-1',
      variantId: null,
      productName: '신라면 120g',
      systemQty: 10,
      countedQty: 8, // 2개 로스 (도난/파손 등)
      isCounted: true,
    },
    {
      productId: 'p-2',
      variantId: null,
      productName: '삼다수 2L',
      systemQty: 24,
      countedQty: 24, // 일치
      isCounted: true,
    },
    {
      productId: 'p-3',
      variantId: null,
      productName: '코카콜라 500ml',
      systemQty: 5,
      countedQty: 7, // 2개 초과 (입고 누락 등)
      isCounted: true,
    },
    {
      productId: 'p-4',
      variantId: null,
      productName: '포카칩 66g',
      systemQty: 15,
      countedQty: 0,
      isCounted: false, // 아직 실사 안 함
    },
  ];

  it('실사 진행 통계가 정확하게 집계된다', () => {
    const stats = computeStocktakeStats(dummyItems);

    assert.equal(stats.countedCount, 3); // 4개 중 3개 실사 완료
    assert.equal(stats.diffCount, 2); // p-1(로스), p-3(초과)
    assert.equal(stats.totalLoss, 2); // 신라면 -2개
    assert.equal(stats.totalSurplus, 2); // 콜라 +2개
  });

  it('전산 반영을 위한 delta(차이) 목록이 정확히 추출된다', () => {
    const adjustments = buildStocktakeAdjustments(dummyItems);

    assert.equal(adjustments.length, 2); // 오차가 있는 2개 품목만 대상

    // p-1: 10개 -> 8개 (delta = -2)
    const adj1 = adjustments.find((a) => a.productId === 'p-1');
    assert.ok(adj1);
    assert.equal(adj1.delta, -2);

    // p-3: 5개 -> 7개 (delta = +2)
    const adj3 = adjustments.find((a) => a.productId === 'p-3');
    assert.ok(adj3);
    assert.equal(adj3.delta, 2);
  });

  it('미실사 품목 및 일치 품목은 재고 조정 대상에서 제외된다', () => {
    const adjustments = buildStocktakeAdjustments(dummyItems);

    // p-2(일치)와 p-4(미실사)는 조정 목록에 없어야 함
    assert.equal(adjustments.some((a) => a.productId === 'p-2'), false);
    assert.equal(adjustments.some((a) => a.productId === 'p-4'), false);
  });
});
