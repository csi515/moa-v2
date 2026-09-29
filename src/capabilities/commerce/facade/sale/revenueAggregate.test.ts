/**
 * 매출 Gross/Returns/Net 집계 unit test
 * 실행: npm run test:retail-revenue
 */
import assert from 'node:assert/strict';
import {
  buildRetailRevenueSummary,
  computeNetSalesAmount,
  filterCompletedSales,
  isCompletedSaleStatus,
  normalizeInclusiveRange,
} from './revenueAggregate';
import type { RevenueSaleInput } from './revenueAggregate';

function sale(
  id: string,
  amount: number,
  opts?: { status?: string; method?: RevenueSaleInput['paymentMethod'] }
): RevenueSaleInput {
  return {
    id,
    totalAmount: amount,
    paymentMethod: opts?.method ?? 'cash',
    status: opts?.status ?? 'completed',
  };
}

const range = { fromYmd: '2026-09-01', toYmd: '2026-09-30' };

{
  const summary = buildRetailRevenueSummary({
    range,
    sales: [sale('s1', 100000)],
    returns: [],
    saleItems: [
      {
        saleId: 's1',
        productId: 'p1',
        productNameSnapshot: '상품A',
        quantity: 10,
        lineAmount: 100000,
      },
    ],
  });
  assert.equal(summary.totalSalesAmount, 100000);
  assert.equal(summary.totalReturnAmount, 0);
  assert.equal(summary.netSalesAmount, 100000);
  assert.equal(summary.saleCount, 1);
  assert.equal(summary.byProduct[0]?.quantity, 10);
}

{
  const summary = buildRetailRevenueSummary({
    range,
    sales: [sale('s1', 100000)],
    returns: [{ id: 'r1', totalAmount: 30000 }],
    saleItems: [],
  });
  assert.equal(summary.netSalesAmount, 70000);
  assert.equal(computeNetSalesAmount(100000, 30000), 70000);
}

{
  const summary = buildRetailRevenueSummary({
    range,
    sales: [sale('s1', 100000)],
    returns: [
      { id: 'r1', totalAmount: 10000 },
      { id: 'r2', totalAmount: 15000 },
      { id: 'r3', totalAmount: 5000 },
    ],
    saleItems: [],
  });
  assert.equal(summary.totalReturnAmount, 30000);
  assert.equal(summary.returnCount, 3);
  assert.equal(summary.netSalesAmount, 70000);
}

{
  const summary = buildRetailRevenueSummary({
    range,
    sales: [sale('s1', 50000)],
    returns: [{ id: 'r1', totalAmount: 50000 }],
    saleItems: [],
  });
  assert.equal(summary.netSalesAmount, 0);
}

{
  assert.equal(isCompletedSaleStatus('completed'), true);
  assert.equal(isCompletedSaleStatus('cancelled'), false);
  assert.equal(isCompletedSaleStatus('refunded'), false);

  const sales = [
    sale('ok', 100000, { status: 'completed' }),
    sale('c', 40000, { status: 'cancelled' }),
    sale('r', 20000, { status: 'refunded' }),
  ];
  assert.equal(filterCompletedSales(sales).length, 1);

  const summary = buildRetailRevenueSummary({
    range,
    sales,
    returns: [{ id: 'ret', totalAmount: 10000 }],
    saleItems: [
      {
        saleId: 'ok',
        productId: 'p1',
        productNameSnapshot: 'A',
        quantity: 1,
        lineAmount: 100000,
      },
      {
        saleId: 'c',
        productId: 'p2',
        productNameSnapshot: 'B',
        quantity: 9,
        lineAmount: 40000,
      },
    ],
  });
  assert.equal(summary.totalSalesAmount, 100000);
  assert.equal(summary.saleCount, 1);
  assert.equal(summary.netSalesAmount, 90000);
  assert.equal(summary.byProduct.length, 1);
  assert.equal(summary.byProduct[0]?.productNameSnapshot, 'A');
}

{
  const normalized = normalizeInclusiveRange({
    fromYmd: '2026-09-10',
    toYmd: '2026-09-01',
  });
  assert.equal(normalized.fromYmd, '2026-09-01');
  assert.equal(normalized.toYmd, '2026-09-10');
}

{
  const summary = buildRetailRevenueSummary({
    range,
    sales: [sale('s1', 100000)],
    returns: [{ id: 'r1', totalAmount: 30000 }],
    saleItems: [
      {
        saleId: 's1',
        productId: 'p1',
        productNameSnapshot: '양말',
        quantity: 10,
        lineAmount: 100000,
      },
    ],
  });
  assert.equal(summary.byProduct[0]?.quantity, 10);
  assert.equal(summary.byProduct[0]?.amount, 100000);
  assert.equal(summary.netSalesAmount, 70000);
}

{
  const summary = buildRetailRevenueSummary({
    range,
    sales: [
      sale('s1', 60000, { method: 'card' }),
      sale('s2', 40000, { method: 'cash' }),
    ],
    returns: [{ id: 'r1', totalAmount: 20000 }],
    saleItems: [],
  });
  assert.equal(summary.byPayment.find((p) => p.paymentMethod === 'card')?.amount, 60000);
  assert.equal(summary.byPayment.find((p) => p.paymentMethod === 'cash')?.amount, 40000);
  assert.equal(summary.netSalesAmount, 80000);
}

console.log('revenueAggregate.test.ts: ok');
