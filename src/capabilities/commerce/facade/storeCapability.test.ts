/**
 * 매점 시나리오가 Bath 전용 복사본 없이 Commerce로 닫히는지 검증.
 * 실행: npm run test:commerce-store-capability
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SALE_PAYMENT_METHODS } from '@/capabilities/commerce/saleLedger/types';
import { formatSaleNumber } from './sale/saleQuery';
import { buildCommerceRevenueSummary } from './sale/revenueAggregate';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

function readSrc(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkTs(full, acc);
      continue;
    }
    if ((name.endsWith('.ts') || name.endsWith('.tsx')) && !name.endsWith('.test.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

const capabilitySrc = readSrc('src/capabilities/commerce/facade/storeCapability.ts');
assert.doesNotMatch(capabilitySrc, /bath|retail|skin|piano|pilates/i);
assert.doesNotMatch(capabilitySrc, /create_bath_sale|create_retail_sale|bathProductService|bathSaleService/);
assert.match(capabilitySrc, /productService\.saveProduct/);
assert.match(capabilitySrc, /inventoryService\.applyInbound/);
assert.match(capabilitySrc, /saleService\.createSale/);
assert.match(capabilitySrc, /saleReturnService\.createReturn/);
assert.match(capabilitySrc, /revenueService\.getSummary/);
assert.doesNotMatch(capabilitySrc, /applySaleDeduct/);
assert.doesNotMatch(capabilitySrc, /cancelSale|voidSale/);

const scenarioToApi = {
  registerProduct: 'registerProduct',
  changePrice: 'changeProduct',
  inboundStock: 'inboundStock',
  sell: 'sell',
  stockDeductViaSale: 'sell',
  cancelOrReturn: 'reverseSale',
  revenue: 'revenue',
  paymentMethod: 'paymentMethods',
} as const;

for (const key of Object.values(scenarioToApi)) {
  assert.match(capabilitySrc, new RegExp(key), `storeCapability missing ${key}`);
}

assert.ok(SALE_PAYMENT_METHODS.includes('cash'));
assert.ok(SALE_PAYMENT_METHODS.includes('card'));
assert.ok(SALE_PAYMENT_METHODS.includes('transfer'));
assert.equal(formatSaleNumber('aabbccdd-1111-2222-3333-444444444444'), 'AABBCCDD');

const summary = buildCommerceRevenueSummary({
  range: { fromYmd: '2026-09-01', toYmd: '2026-09-01' },
  sales: [
    { id: 's1', totalAmount: 5000, paymentMethod: 'cash', status: 'completed' },
    { id: 's2', totalAmount: 3000, paymentMethod: 'card', status: 'cancelled' },
  ],
  returns: [{ id: 'r1', totalAmount: 1000 }],
  saleItems: [
    {
      saleId: 's1',
      productId: 'p1',
      productNameSnapshot: '생수',
      quantity: 2,
      lineAmount: 5000,
    },
  ],
});
assert.equal(summary.totalSalesAmount, 5000);
assert.equal(summary.totalReturnAmount, 1000);
assert.equal(summary.netSalesAmount, 4000);
assert.equal(summary.byPayment.find((p) => p.paymentMethod === 'cash')?.amount, 5000);

const commerceFiles = walkTs(join(root, 'src/capabilities/commerce/facade'));
for (const file of commerceFiles) {
  const src = readFileSync(file, 'utf8');
  assert.doesNotMatch(src, /create_bath_|bathProductService|bathInventoryService|bathSaleService|bathReturnService/);
}

const barrel = readSrc('src/capabilities/commerce/facade/index.ts');
assert.match(barrel, /storeCapability/);
assert.match(barrel, /productService/);
assert.match(barrel, /saleService/);
assert.match(barrel, /saleReturnService/);
assert.match(barrel, /SALE_PAYMENT_METHODS/);

console.log('storeCapability.test.ts: ok');
console.log(
  JSON.stringify(
    {
      reuse: 'Bath ConvenienceStore → @/core/commerce storeCapability',
      scenarios: scenarioToApi,
      cancelModel: 'full remaining qty via createReturn; no cancelSale RPC',
      stockDeduct: 'create_sale only; do not call applySaleDeduct from a store UI',
    },
    null,
    2
  )
);
